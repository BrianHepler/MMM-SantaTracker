# MMM-SantaTracker
Track Santa Claus as he delivers presents on Christmas Eve.

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

## Options
All configuration parameters are optional.
| Option | Default | Description |
|:------:| ------- | ----------- |
| markerColor | "LightGreen" | Color of the points marking the cities |
| mapMode | "dark" | The map tile style. Accepted parameters are "dark", "light", "satellite"|
| lineColor | "#a1100" | Color of the line that follows Santa |
| lineWidth | 3 | Width of the line that follows Santa |

