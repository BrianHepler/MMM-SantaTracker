Module.register("MMM-SantaTracker", {
    defaults: {
        mapUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', // where to pull map tiles
        dataFile: 'route_santa_en.json',
        mapMode: 'dark', // map tile appearance
        lat: 74.907380, // latitude
        lon: 150.310166, // longitude
        zoomLevel: 3, // Zoom level of map
        markerColor: 'LightGreen',
        lineColor: '#aa1100',
        lineWidth: 5,
        overTime: null,
        updateInterval: 1000 * 60, // check Santa's location every minute
        debug: false // Enable debug logging
    },

    start: function () {
        this.debugLog("Starting module " + this.name);
        this.loaded = false;
        this.dataLoaded = false;

        // Update timer
        this.updateTimer = setInterval(() => {
            this.updateSanta();
        }, this.config.updateInterval);

        // Map elements
        this.mapWrapper = null;
        this.santaPath = null;
        this.santaMap = null;
        this.markersLayer = new L.layerGroup();

        // Data storage for frontend
        this.locationMap = new Map();
        this.markerMap = new Map();
        this.currentLocation = null;

        // Map options
        this.config.animationSpeed = 1000;
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
        this.lineOptions = {
            weight: this.config.lineWidth,
            color: this.config.lineColor,
            fill: false,
            interactive: false
        };

        // Request data from node_helper
        this.debugLog("Requesting Santa data from node_helper");
        this.sendSocketNotification("LOAD_SANTA_DATA", {
            dataFile: this.config.dataFile,
            config: this.config  // Pass entire config to node_helper
        });
    },

    debugLog: function (message) {
        if (this.config.debug) {
            Log.info(this.name + ": " + message);
        }
    },

    getHeader: function () { return this.name; },

    suspend: function () { clearInterval(this.updateTimer); clearInterval(this.updateTimer); clearInterval(this.resetTimer) },

    resume: function () {
        this.updateTimer = setInterval(() => {
            this.updateSanta();
        }, this.config.updateInterval);
    },

    getDom: function () {
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

    getCountdown: function () {
        let now = new Date();
        var year = now.getUTCFullYear();
    },

    /**
     * Updates the map with the latest position of Santa
     * Requests current location from node_helper
     */
    updateSanta: function () {
        if (!this.dataLoaded) {
            this.debugLog("Data not yet loaded, skipping update");
            return;
        }

        this.debugLog("Requesting Santa's location from node_helper...");

        var now = new Date();

        // Request Santa's location from node_helper (backend does the heavy lifting)
        this.sendSocketNotification("GET_SANTA_LOCATION", {
            currentTime: now.valueOf()
        });
    },

    /**
     * Handle Santa location update from node_helper
     */
    handleSantaLocationUpdate: function (data) {
        if (!data || !data.location) {
            this.debugLog("No location data received");
            return;
        }

        var entry = data.location;
        var timestamp = data.timestamp;

        this.debugLog("Santa is at: " + entry.city + ", " + entry.region);

        // Update the map view
        var marker = this.markerMap.get(timestamp);

        this.processSantaPath(entry.location.lat, entry.location.lng);

        if (marker != null && this.santaMap) {
            marker.openPopup();
            this.santaMap.setView([entry.location.lat, entry.location.lng]);
        }

        this.currentLocation = data;
    },

    /**
     * Draw a line tracing Santa's path throughout the world.
     * @param {*} newLat 
     * @param {*} newLon 
     */
    processSantaPath: function (newLat, newLon) {
        this.debugLog("Adding " + newLat + ", " + newLon + " to the path.");

        if (this.santaPath == null) {
            this.debugLog("Creating Santa's path.");
            var initPoints = [[84.6, 168]]; // North Pole starting point

            // Add all visited locations to the path
            // locationMap keys are timestamps, iterate through them
            const sortedTimestamps = Array.from(this.locationMap.keys()).sort((a, b) => a - b);

            for (let timestamp of sortedTimestamps) {
                var entry = this.locationMap.get(timestamp);
                if (!entry || !entry.location) continue;

                // Stop when we reach the current location
                if (entry.location.lat == newLat && entry.location.lng == newLon) {
                    break;
                }

                var newPoints = [entry.location.lat, entry.location.lng];
                initPoints.push(newPoints);
            }

            var map = this.santaMap;
            var polyline = L.polyline(initPoints, this.lineOptions).addTo(map);
            this.santaPath = polyline;
        }

        // Add the new endpoint to the path
        var pointArray = this.santaPath.getLatLngs();
        var newEndPoint = [newLat, newLon];
        pointArray.push(newEndPoint);
        this.santaPath.setLatLngs(pointArray);

        return;
    },

    /**
     * Populate the map with location markers
     * Data comes from node_helper
     */
    processSantaData: function (locations) {
        this.debugLog("Processing " + locations.length + " Santa locations");

        var markerRadius = 3;
        var markers = this.markersLayer;
        markers.clearLayers();

        for (let index = 0; index < locations.length; index++) {
            var entry = locations[index];
            var arrive = entry.arrival; // Already converted by node_helper

            var popup = this.createPopup(entry);
            var marker = L.circleMarker([entry.location.lat, entry.location.lng], {
                radius: markerRadius,
                color: this.config.markerColor
            }).addTo(this.santaMap);

            marker.bindPopup(popup);
            markers.addLayer(marker);

            this.locationMap.set(arrive, entry);
            this.markerMap.set(arrive, marker);
        }

        this.debugLog("Markers created for " + this.markerMap.size + " locations");
        this.dataLoaded = true;
        this.loaded = true;
    },



    createMarker: function (lat, lon) {
        var markerRadius = this.santaMap.getZoom() - 1;
        var circle = L.circleMarker([lat, lon], {
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
    createPopup: function (entry) {
        var wrapper = document.createElement("div");
        wrapper.className = "popup";
        wrapper.id = "SantaTracker-popup-" + entry.city;

        var table = document.createElement("table");
        const rowI = document.createElement("tr");
        const rowL = document.createElement("tr");

        var tdL = document.createElement("td");
        tdL.className = "popup-label";
        tdL.append(entry.city + ", " + entry.region);
        rowL.appendChild(tdL);

        var tdI = document.createElement("td");
        tdI.className = "popup-imageCell"

        var imageUrl = null;
        var imageUrls = entry.details.photos;

        // Simply use the first available image URL
        if (imageUrls && imageUrls.length > 0) {
            imageUrl = imageUrls[0].url;
        }

        if (imageUrl != null) {
            var image = document.createElement("img");
            image.className = "popup-image";
            image.setAttribute("decoding", "async");
            image.src = imageUrl;

            // Handle image load errors gracefully
            image.onerror = function () {
                Log.warn("Failed to load image: " + imageUrl);
                image.style.display = "none";
            };

            tdI.append(image);
        }

        rowI.appendChild(tdI);
        table.appendChild(rowL);
        table.appendChild(rowI);
        wrapper.appendChild(table);

        return wrapper;
    },

    buildMap: function () {
        this.debugLog("Building santa map.");
        if (this.santaMap != null) {
            this.debugLog("map already exists");
        } else {
            var map = L.map('SantaTracker-map', {
                center: [this.config.lat, this.config.lon],
                zoom: this.config.zoomLevel,
                zoomControl: false,
                boxZoom: false,
                doubleClickZoom: false,
                attributionControl: false
            });

            switch (this.config.mapMode) {
                case 'light':
                    L.tileLayer.provider('CartoDB.Positron', { maxZoom: 19 }).addTo(map);
                    break;
                case 'dark':
                    L.tileLayer.provider('CartoDB.DarkMatter', { maxZoom: 19 }).addTo(map);
                    break;
                case 'satellite':
                    L.tileLayer.provider('USGS.USImageryTopo', { maxZoom: 19 }).addTo(map);
                    break;
                default:
                    L.tileLayer.provider('CartoDB.DarkMatter', { maxZoom: 19 }).addTo(map);
            } // end switch statement

            L.control.attribution(this.attributionOptions);
            this.santaMap = map;
        }

        if (this.markersLayer == null) {
            this.debugLog("creating marker layer");
            this.markersLayer = L.layerGroup().addTo(this.santaMap);
        } else {
            this.markersLayer.addTo(this.santaMap);
        }

        // Request location data from node_helper
        this.sendSocketNotification("GET_ALL_LOCATIONS", {});
    },

    getScripts: function () {
        return [
            this.file('leaflet/leaflet-src.js'),
            this.file('leaflet/leaflet-providers.js')
        ];
    },

    getStyles: function () {
        return [this.file('leaflet/leaflet.css'), this.file('MMM-SantaTracker.css')];
    },

    notificationReceived: function (notification, payload, sender) {
        switch (notification) {
            case "DOM_OBJECTS_CREATED":
                this.buildMap();
                break;
        }
    },

    /**
     * Handle socket notifications from node_helper
     */
    socketNotificationReceived: function (notification, payload) {
        this.debugLog("Received socket notification: " + notification);

        switch (notification) {
            case "SANTA_DATA_LOADED":
                if (payload.success) {
                    this.debugLog("Santa data loaded successfully: " + payload.locationCount + " locations");
                } else {
                    Log.error("Failed to load Santa data: " + payload.error);
                }
                break;

            case "ALL_LOCATIONS":
                this.debugLog("Received all locations from node_helper");
                if (this.santaMap) {
                    this.processSantaData(payload);
                    // Start updating Santa's position
                    this.updateSanta();
                }
                break;

            case "SANTA_LOCATION_UPDATE":
                this.handleSantaLocationUpdate(payload);
                break;

            case "VISITED_LOCATIONS":
                this.debugLog("Received " + payload.length + " visited locations");
                // Handle visited locations if needed
                break;

            default:
                this.debugLog("Unknown socket notification: " + notification);
        }
    }

});