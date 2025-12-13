/**
 * Node Helper for MMM-SantaTracker
 * Handles backend processing and data management
 */

const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");
const utils = require("./utils");

module.exports = NodeHelper.create({
    start: function () {
        console.log("Starting node_helper for: " + this.name);
        this.santaData = null;
        this.arrivalSet = [];
        this.locationMap = new Map();
        this.config = {
            debug: false,
            moduleName: this.name
        };

        // Override time tracking - advances by 1 minute each update when set
        this.overrideTimeStart = null;
        this.overrideTimeOffset = 0; // Minutes elapsed since override started
    },

    debugLog: function (message) {
        utils.debugLog(message);
    },

    /**
     * Load and parse the Santa route data file
     */
    loadDataFile: function (dataFile) {
        const filePath = path.resolve(__dirname, dataFile);
        this.debugLog("Loading Santa data from: " + filePath);

        try {
            const data = fs.readFileSync(filePath, 'utf8');
            this.santaData = JSON.parse(data);
            this.processData();
            this.debugLog("Santa data loaded successfully. " + this.arrivalSet.length + " locations loaded.");
            return true;
        } catch (error) {
            console.error("Error loading Santa data: ", error);
            return false;
        }
    },

    /**
     * Process the data and build lookup structures
     */
    processData: function () {
        if (!this.santaData || !this.santaData.destinations) {
            console.error("No Santa data to process");
            return;
        }

        const locations = this.santaData.destinations;
        this.arrivalSet = [];
        this.locationMap.clear();

        for (let i = 0; i < locations.length; i++) {
            const entry = locations[i];
            const arrive = this.convertDateToThisYear(entry.arrival);
            this.arrivalSet.push(arrive);
            this.locationMap.set(arrive, entry);
        }

        // Sort arrival times for binary search
        this.arrivalSet.sort((a, b) => a - b);
        this.debugLog("Processed " + this.arrivalSet.length + " Santa locations");
    },

    /**
     * Convert dates from source file to current year
     */
    convertDateToThisYear: function (epochDate) {
        const now = new Date();
        const year = now.getUTCFullYear();

        const sourceDate = new Date(epochDate);
        const sMonth = sourceDate.getUTCMonth();
        const sDay = sourceDate.getUTCDate();
        const sHour = sourceDate.getUTCHours();
        const sMin = sourceDate.getUTCMinutes();
        const sSec = sourceDate.getUTCSeconds();

        const rDate = new Date(year, sMonth, sDay, sHour, sMin, sSec);
        return rDate.valueOf();
    },

    /**
     * Binary search to find Santa's current location efficiently
     */
    findCurrentLocation: function (currentTime) {
        return utils.findCurrentLocation(this.arrivalSet, currentTime);
    },

    /**
     * Get Santa's current location
     * If overTime is set in config, advances by 1 minute on each call
     */
    getSantaLocation: function (currentTime) {
        let timeToUse = currentTime;

        // Handle override time if configured
        if (this.config.overTime != null) {
            // Initialize override time tracking on first use
            if (this.overrideTimeStart === null) {
                this.debugLog("Starting override time progression from: '" + this.config.overTime + "'");
                this.overrideTimeStart = new Date(this.config.overTime);
                this.overrideTimeOffset = 0;
            }

            // Add elapsed minutes (1 minute per update)
            this.overrideTimeOffset++;
            var calculatedTime = new Date(this.overrideTimeStart.getTime() + (this.overrideTimeOffset * 60000));

            this.debugLog("Override time progressed to: " + calculatedTime.toISOString() + " (+" + this.overrideTimeOffset + " minutes)");
            timeToUse = calculatedTime.valueOf();
        } else {
            // Reset override tracking if overTime is removed
            this.overrideTimeStart = null;
            this.overrideTimeOffset = 0;
        }

        this.debugLog("Getting Santa's location for time: " + new Date(timeToUse).toISOString());
        this.debugLog("Time value (ms): " + timeToUse);

        const timestamp = this.findCurrentLocation(timeToUse);

        if (timestamp === null) {
            this.debugLog("No location found");
            return null;
        }

        const location = this.locationMap.get(timestamp);

        if (!location) {
            this.debugLog("Location data not found for timestamp: " + timestamp);
            return null;
        }

        this.debugLog("Santa is at: " + location.city + ", " + location.region);

        return {
            timestamp: timestamp,
            location: location,
            arrivalTime: new Date(timestamp).toISOString()
        };
    },

    /**
     * Get all locations for initial map rendering
     */
    getAllLocations: function () {
        if (!this.santaData || !this.santaData.destinations) {
            return [];
        }

        return this.santaData.destinations.map(entry => ({
            id: entry.id,
            city: entry.city,
            region: entry.region,
            location: entry.location,
            arrival: this.convertDateToThisYear(entry.arrival),
            departure: this.convertDateToThisYear(entry.departure),
            population: entry.population,
            presentsDelivered: entry.presentsDelivered,
            details: entry.details
        }));
    },

    /**
     * Get locations Santa has visited so far
     */
    getVisitedLocations: function (currentTime) {
        const visited = [];

        for (let i = 0; i < this.arrivalSet.length; i++) {
            if (this.arrivalSet[i] <= currentTime) {
                const location = this.locationMap.get(this.arrivalSet[i]);
                if (location) {
                    visited.push({
                        timestamp: this.arrivalSet[i],
                        location: location
                    });
                }
            } else {
                break; // Array is sorted, so we can stop here
            }
        }

        return visited;
    },

    /**
     * Handle socket notifications from the frontend
     */
    socketNotificationReceived: function (notification, payload) {
        this.debugLog("Received notification: " + notification);

        switch (notification) {
            case "LOAD_SANTA_DATA":
                // Store the full config from frontend
                if (payload.config) {
                    this.config = Object.assign({}, this.config, payload.config);
                    this.config.moduleName = this.name;

                    // Pass config to utils
                    utils.setConfig({
                        debug: this.config.debug,
                        moduleName: this.name
                    });
                }

                const success = this.loadDataFile(payload.dataFile);
                if (success) {
                    this.sendSocketNotification("SANTA_DATA_LOADED", {
                        success: true,
                        locationCount: this.arrivalSet.length
                    });
                } else {
                    this.sendSocketNotification("SANTA_DATA_LOADED", {
                        success: false,
                        error: "Failed to load data file"
                    });
                }
                break;

            case "GET_ALL_LOCATIONS":
                const allLocations = this.getAllLocations();
                this.sendSocketNotification("ALL_LOCATIONS", allLocations);
                break;

            case "GET_SANTA_LOCATION":
                const santaLocation = this.getSantaLocation(payload.currentTime);
                this.sendSocketNotification("SANTA_LOCATION_UPDATE", santaLocation);
                break;

            case "GET_VISITED_LOCATIONS":
                const visited = this.getVisitedLocations(payload.currentTime);
                this.sendSocketNotification("VISITED_LOCATIONS", visited);
                break;

            default:
                this.debugLog("Unknown notification: " + notification);
        }
    }
});
