Module.register("MMM-SantaTracker", {
    defaults: {
        mapUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', // where to pull map tiles
        dataFile: 'route_santa_en.json',
        mapMode: 'dark', // map tile appearance
        lat: 69.64366, // latitude
		lon: -93.07966, // longitude
        zoomLevel: 4, // Zoom level of map
        markerColor: 'LightGreen' ,
        updateInterval: 1000 * 60 // check Santa's location every minute
    },
  
    start: async function () {
        Log.info("Starting module " + this.name);
        this.loaded = false;
        this.updateTimer = setInterval(()=> {
            this.updateSanta();
        }, this.config.updateInterval);

        // one map to rule them all
        this.mapWrapper = null;

        this.config.animationSpeed = 1000;
        this.markersLayer = new L.layerGroup();
        this.popupIndex = -1;
        this.locationMap = new Map();
        this.popupMap = new Map();
        this.arrivalSet = [];

        this.popupOptions = {
            closeButton: false,
            closeOnClick: true,
        };
        this.mapOptions = {
            zoomControl: false,
            boxZoom: false,
            doubleClickZoom: false,
            attributionControl: false
        };

        // Load the data
        const response = await this.loadDataFile();
        this.santaData = JSON.parse(response);
        if (response == null) Log.info("file failed to load.");
        this.processSantaData();
    },

    getHeader: function() { return this.name;},

    suspend: function() { clearInterval(this.updateTimer); clearInterval(this.updateTimer); clearInterval(this.resetTimer)},

    resume: function() { 
        this.updateTimer = setInterval(()=> {
            this.updateData();
        }, this.config.updateInterval);
        // this.schedulePopInterval();
    },

    getDom: function() {
        var wrapper;
        if (this.mapWrapper != null) {
            wrapper = this.mapWrapper;
        } else {
            wrapper = document.createElement("div");
            wrapper.className = "SantaMap";
            wrapper.id = "SantaTracker-map";
            wrapper.width = this.config.width;
            wrapper.height = this.config.height;
            this.mapWrapper = wrapper;
        }
        
        if (!this.loaded) {
            wrapper.innerHTML = this.translate('LOADING');
            wrapper.innerClassName = 'dimmed light small';
            return wrapper;
        } else { 
            // this.buildMap();
        }
        
        return wrapper;
    },

    /**
     * Updates the map with the latest position of Santa and creates the popup
     * that corresponds to the position.
     */
    updateSanta: function() {
        Log.info("Checking on Santa's location...");

        var overTime = new Date("24 December 2023 18:14:33");  // override date for testing
        // Log.info ("Override date: " + overTime.valueOf());
        var now = new Date();
        var markers = this.markersLayer;
        var pullIndex = 0;

        for (let index = 0; index < this.arrivalSet.length; index++) {
            if (overTime.valueOf() > this.arrivalSet[index]) {
                pullIndex = index;
            } else { break; }
        } // end loop

        var entry = this.locationMap.get(this.arrivalSet[pullIndex]);
        Log.info("Pulled entry for " + entry.city + ", " + entry.region);
        var lat = entry.location.lat;
        var lon = entry.location.lng;
        var popup = this.popupMap[pullIndex];
        var circle = this.createMarker(lat,lon).bindPopup(popup).openPopup();
    },

    /**
     * Load the locations & times from file. Populate the map with the locations.
     */
    processSantaData: function() {
        Log.info(this.name + " - Processing Santa locations");

        var locations = this.santaData.destinations;
        var now = new Date();

        for (let index = 0; index < locations.length; index++) {
            var entry = locations[index];
            var arrive = this.convertDateToThisYear(entry.arrival);
            this.arrivalSet.push(arrive);
            this.locationMap.set(arrive,entry);
            this.popupMap.set(arrive, this.createPopup(entry));

            L.marker([entry.location.lat, entry.location.lng]).addTo(this.santaMap);
            // check for past dates. In case of reload.
            // if (now.getUTCDate > arrive ) {
            //     var circle = this.createMarker(entry.location.lat, entry.location.lng, null);
            //     this.markersLayer.addLayer(circle);
            // }
        }
        this.arrivalSet.sort();
        // Log.info(this.arrivalSet);
    },

    /**
	 * Retrieve a file from the local filesystem
	 * @returns {Promise} Resolved when the file is loaded
	 */
	loadDataFile: async function () {
		const isRemote = this.config.dataFile.indexOf("http://") === 0 || this.config.dataFile.indexOf("https://") === 0,
			url = isRemote ? this.config.dataFile : this.file(this.config.dataFile);
		const response = await fetch(url);
		return await response.text();
	},

    createMarker: function(lat,lon) {
        var markerRadius = this.santaMap.getZoom() - 1;
        var circle = L.circleMarker([lat,lon], {
            stroke: false,
            fill: true,
            fillColor: this.config.markerColor,
            fillOpacity: 1,
            radius: markerRadius
        });
        return circle;
    },
    
    /**
     * Creates the popup for Santa's position. Two row table. Name of city, region
     * followed by image of that location taken from route_santa.json.
     * @param {*} entry JSON object containing single entry of city, region, location, etc.
     * @returns DIV element containing table.
     */
    createPopup: function(entry) {
        var wrapper = document.createElement("div");
        wrapper.className = "popup";
        wrapper.id = "SantaTracker-popup-" + entry.city;

        var table = document.createElement("table");
        table.setAttribute("heigh", "200px");
        
        const rowI = document.createElement("tr");
        const rowL = document.createElement("tr");

        var tdL = document.createElement("td");
        tdL.append(entry.city + ", " + entry.region);
        rowL.appendChild(tdL);
        
        var tdI = document.createElement("td");
        tdI.style.width = "200px";
        tdI.style.height = "150px";
        
        var imageUrl = null;
        var imageUrls = entry.details.photos;
        if (imageUrls.length > 0) { imageUrl = imageUrls[0].url; }
        
        if (imageUrl != null) {
            var image = document.createElement("img");
            image.className = "popup-image";
            image.setAttribute("width", "200px");
            image.setAttribute("decoding", "sync");
            image.src = imageUrl;
            tdI.append(image);
        }
        rowI.appendChild(tdI);
        
        table.appendChild(rowL);
        table.appendChild(rowI);
        Log.info ("Table code: " + wrapper.innerHTML);
        wrapper.appendChild(table);

        return wrapper;
    },


    /**
	 * Schedule popups & delay between popups.
	 */
	schedulePopInterval: function () {
		this.updateDom(this.config.animationSpeed);
        var markerArray = this.markersLayer.getLayers();

		// Clear timers if they already exist
		if (this.popTimer != null) clearInterval(this.popTimer);
        if (this.resetTimer != null) clearInterval(this.resetTimer);

        // implement popup with optional delay
		this.timer = setInterval(() => {
			this.randomPopup();
		}, this.config.popInterval + this.config.popDelay);
	},

    buildMap: function() {
        if (this.santaMap != null) {
            Log.info("map already exists");
        } else {
            var map = L.map('SantaTracker-map', {
                center: [this.config.lat, this.config.lon],
                zoom: this.config.zoomLevel,
                zoomControl: false,
                boxZoom: false,
                doubleClickZoom: false,
                attributionControl: false
            });

            // Log.info("mapMode: " + this.config.mapMode);
            switch (this.config.mapMode) {
                case 'light': 
                    L.tileLayer.provider('CartoDB.Positron',{maxZoom: 19}).addTo(map);
                    break;
                case 'dark':
                    L.tileLayer.provider('CartoDB.DarkMatter',{maxZoom:19}).addTo(map);
                    break;
                case 'satellite':
                    L.tileLayer.provider('USGS.USImageryTopo',{maxZoom: 19}).addTo(map);
                    break;
                default:
                    L.tileLayer.provider('CartoDB.DarkMatter',{maxZoom:19}).addTo(map);
            } // end switch statement

            L.control.attribution(this.attributionOptions);
            this.santaMap = map;
        }

        if (this.markersLayer == null) { 
            this.markersLayer = L.layerGroup().addTo(this.santaMap);
        } else { 
            this.markersLayer.addTo(this.santaMap);
        }
    },

    getScripts: function() {
        return [this.file('leaflet/leaflet-src.js'),this.file('leaflet/leaflet-providers.js')];
    },
    
    getStyles: function() {
        return [this.file('leaflet/leaflet.css'),this.file('MMM-SantaTracker.css')];
    },
    
    notificationReceived: function(notification, payload, sender) {
        switch(notification) {
            case "DOM_OBJECTS_CREATED":
                this.loaded = true;
                this.buildMap();
                break;
            case "CLOCK_MINUTE":
                this.updateSanta();
                break;
        }
    },

    /**
     * The dates of the source file are from 2019. Convert those dates to current year, but same day,hour,minute.
     * Everything should be in UTC.
     * @param {*} epochDate 
     * @returns Epoch date for the present year.
     */
    convertDateToThisYear: function(epochDate) {
        let now = new Date();
        var year = now.getUTCFullYear();

        var sourceDate = new Date(epochDate);
        var sMonth = sourceDate.getUTCMonth();
        var sDay = sourceDate.getUTCDate();
        var sHour = sourceDate.getUTCHours();
        var sMin = sourceDate.getUTCMinutes();
        var sSec = sourceDate.getUTCSeconds();

        // Log.info("Updating date(" + epochDate + ") to " + year + " " + 12 + " " + sDay + " " + sHour + " " + sMin + " " + sSec);
        var rDate = new Date(year, sMonth, sDay, sHour, sMin, sSec);
        return rDate.valueOf();
    },

    
  })