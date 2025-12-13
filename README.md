# MMM-SantaTracker
This is a module for the [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror) framework that will track Santa Claus as he delivers presents on Christmas Eve.

![MMM-SantaTracker interface](ScreenShot.PNG)

## Features
* Tracks Santa Claus as he delivers presents!
* Displays popup of his location with city & country 
* Displays photo of the location where he's dropping off gifts or coal
* Three map options


## Installation
Clone the repository and add the config settings.
1. Clone the repository into your `~/MagicMirror/modules` folder.
2. Configure your `~/MagicMirror/config/config.js` file.
```
{
	module: "MMM-SantaTracker",
	position: "bottom_left",
	config: {
		markerColor: 'IndianRed',
		mapMode: "satellite"
	}
},
``````

## Configuration Options
All configuration parameters are optional. The config object defined in your MagicMirror config file is automatically passed to both the frontend module and backend node_helper for consistent behavior throughout the application.

| Option | Default | Description |
|:------:| ------- | ----------- |
| **dataFile** | `"route_santa_en.json"` | The JSON file containing Santa's route data. |
| **mapUrl** | `"https://tile.openstreetmap.org/{z}/{x}/{y}.png"` | URL template for map tiles. |
| **mapMode** | `"dark"` | The map tile style. Accepted parameters: `"dark"`, `"light"`, `"satellite"`. |
| **lat** | `74.907380` | Initial latitude for map center (North Pole by default). |
| **lon** | `150.310166` | Initial longitude for map center. |
| **zoomLevel** | `3` | Initial zoom level of the map. |
| **markerColor** | `"LightGreen"` | Color of the circular markers indicating cities Santa visits. |
| **lineColor** | `"#aa1100"` | Color of the path line that follows Santa's journey. |
| **lineWidth** | `5` | Width (in pixels) of Santa's path line. |
| **updateInterval** | `60000` (1 min) | How often (in milliseconds) to check Santa's location. |
| **overTime** | `null` | **Testing Mode**: Overrides the current time to simulate Santa's journey on Christmas Eve. When set to a date/time string (format: `YYYY-MM-DDTHH:mm:ss.sssZ`), the module will start tracking from that point and automatically advance time by 1 minute with each update interval. This allows you to test the tracker any time of year by setting a Christmas Eve date/time (e.g., `"2025-12-24T18:00:00.000Z"`). The tracker will progress through Santa's route as if time is passing. Leave as `null` for normal real-time operation on Christmas Eve. |
| **debug** | `false` | **Debug Mode**: Enable detailed logging throughout the entire application. When `true`, logs will appear in the console from the frontend module (MMM-SantaTracker.js), backend node_helper (node_helper.js), and utility functions (utils.js). Shows location updates, map building, data processing, binary search operations, and socket communications. Useful for troubleshooting and development. |

### Example Configuration

```javascript
{
    module: "MMM-SantaTracker",
    position: "bottom_left",
    config: {
        mapMode: "satellite",
        markerColor: "IndianRed",
        lineColor: "#ff0000",
        lineWidth: 3,
        updateInterval: 30000,  // Update every 30 seconds
        debug: true,            // Enable debug logging
        overTime: "2025-12-24T18:00:00.000Z"  // Test mode
    }
}
```

### How Config is Used Throughout the App

The configuration object you define is automatically shared across all components:

1. **Frontend Module (MMM-SantaTracker.js)**: Uses config for UI rendering, map settings, and debug logging
2. **Backend Node Helper (node_helper.js)**: Receives the full config object and uses it for data processing and debug logging
3. **Utility Functions (utils.js)**: Receives debug settings for consistent logging across all helper functions

This ensures consistent behavior and settings throughout the entire application.

