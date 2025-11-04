# Btop to Resonite Websocket

This script will automatically send the output of btop to all connected websocket clients using [Resonite](https://resonite.com/)'s text markup.

## Dependencies

- [Node.js](https://nodejs.org/en)
- [btop](https://github.com/aristocratos/btop)

## Usage

Running with `node index.js` will start a websocket on port 8080 that will periodically `send the output of a btop session to all connected clients.

In order to properly display in Resonite, it is recommended to set graph symbol to Block.

It additionally supports some command line arguments:

```
This script will automatically send the output of btop to all connected websocket clients using Resonite's text markup.

Usage: node index.js [OPTIONS] [-c COMMAND]

-s  Do not print messages
-p  Port (Default: 8080)
-l  Limit rate (Default: 1000ms, -1 to disable)
-c  Use an alternate command (and/or arguments)
-h, --help  Shows this help
```


A Resonite frontend can be found at `resrec:///U-1TtGn3kT3bc/R-2A131A9A2F1BD46D5723DDDC5B7E7B2B90D525C7B3D5C58D7282C14C193568F5`. It will automatically attempt to connect to the websocket as it is loaded.
