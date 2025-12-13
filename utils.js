/**
 * Utility functions for MMM-SantaTracker module
 */

// Module configuration
let config = {
    debug: false,
    moduleName: "MMM-SantaTracker"
};

/**
 * Set the configuration for the utils module
 * @param {object} newConfig - Configuration object
 */
function setConfig(newConfig) {
    config = Object.assign({}, config, newConfig);
}

/**
 * Debug logging function
 * @param {string} message - The message to log
 */
function debugLog(message) {
    if (config.debug) {
        console.log(config.moduleName + " Utils: " + message);
    }
}

/**
 * Enable or disable debug logging
 * @param {boolean} enabled - Whether to enable debug logging
 */
function setDebug(enabled) {
    config.debug = enabled;
}

/**
 * Binary search to find Santa's current location efficiently.
 * Finds the most recent arrival time that is <= current time.
 * Time complexity: O(log n) instead of O(n)
 * @param {Array<number>} arrivalSet - Sorted array of arrival timestamps
 * @param {number} currentTime - Current timestamp in milliseconds
 * @returns {number} The arrival timestamp of Santa's current/most recent location
 */
function findCurrentLocation(arrivalSet, currentTime) {
    if (arrivalSet.length === 0) {
        debugLog("arrivalSet is empty, returning 0");
        return 0;
    }

    debugLog(`Binary search started - searching ${arrivalSet.length} locations for time ${currentTime}`);

    let left = 0;
    let right = arrivalSet.length - 1;
    let result = 0; // Default to first location (North Pole)
    let iterations = 0;

    // Binary search for the rightmost arrival time <= currentTime
    while (left <= right) {
        iterations++;
        let mid = Math.floor((left + right) / 2);

        debugLog(`Iteration ${iterations} - checking index ${mid} (left=${left}, right=${right})`);
        debugLog(`Comparing arrivalSet[${mid}]=${arrivalSet[mid]} with currentTime=${currentTime}`);

        if (arrivalSet[mid] <= currentTime) {
            result = arrivalSet[mid]; // This is a valid location
            debugLog(`${arrivalSet[mid]} <= ${currentTime}, moving left to ${mid + 1}`);
            left = mid + 1; // Look for a more recent one
        } else {
            debugLog(`${arrivalSet[mid]} > ${currentTime}, moving right to ${mid - 1}`);
            right = mid - 1; // Current mid is too late, search earlier
        }
    }

    debugLog(`Binary search completed in ${iterations} iterations, found result: ${result}`);
    return result;
}

// Export for use in the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        findCurrentLocation,
        setConfig,
        setDebug,
        debugLog
    };
}
