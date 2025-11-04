import xterm from "@xterm/xterm"
const { Terminal } = xterm
import { SerializeAddon } from "@xterm/addon-serialize"
import { spawn } from "node-pty"
import { WebSocketServer } from "ws"
import parseArguments from "./lib/parseArguments.js"
import htmlToResmarkup from "./lib/htmlToResmarkup.js"

const settings = parseArguments(process.argv)
var nextAllowedMessage = 0 // The process time of the earliest next allowed message

// Setup websocket
const wss = new WebSocketServer({ port: settings.port })
wss.on("connection", function connection(ws) {
  ws.on("error", console.error)

  ws.on("message", function message(data) {
    if (!settings.silent) console.log("Received: %s", data)
  })
})

// Create xterm.js instance
const COLS = 120
const ROWS = 30
const term = new Terminal({ cols: COLS, rows: ROWS, scrollback: 0 })
const serializeAddon = new SerializeAddon()
term.loadAddon(serializeAddon)
const btopProcess = spawn(settings.command, settings.args, {
  name: "xterm-color",
  cols: COLS,
  rows: ROWS,
  cwd: process.cwd(),
  env: process.env,
  scrollback: 0,
})

btopProcess.on("data", (data) => {
  term.write(data) // Pipe process output to xterm.js

  let serializedData = serializeAddon.serializeAsHTML({ scrollback: 0 })

  var result = htmlToResmarkup(serializedData)

  if (process.uptime() >= nextAllowedMessage) {
    nextAllowedMessage = process.uptime() + settings.rateLimit

    // Send the string to each client
    wss.clients.forEach((client) => {
      if (client.readyState == WebSocket.OPEN) {
        client.send(result)
      }
    })

    if (!settings.silent) console.log("Data sent.")
  } else if (!settings.silent) console.log("Data suppressed.")
})
