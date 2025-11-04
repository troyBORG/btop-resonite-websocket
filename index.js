import xterm from "@xterm/xterm"
const { Terminal } = xterm
import { SerializeAddon } from "@xterm/addon-serialize"
import { spawn } from "node-pty"
import { WebSocketServer } from "ws"

const settings = {
  silent: false,
  command: "btop",
  args: ["-u", "1000"],
  port: 8080,
  rateLimit: 1,
}
var nextAllowedMessage = 0 // The process time of the earliest next allowed message

// Process command line arguments
var argv = process.argv

// Extract the overwrite command, if applicable
if (argv.includes("-c")) {
  const startIndex = argv.indexOf("-c")

  // Get everything after the flag, removing it from the original array
  const command = argv.splice(startIndex + 1)

  if (command.length < 1) {
    console.log("No overwrite command specified after command flag!")
    process.exit(1)
  }

  argv.pop() // Remove the trailing flag

  settings.command = command.shift()
  settings.args = command
}

if (argv.includes("-h") || argv.includes("--help")) {
  console.log(`
This script will automatically send the output of btop to all connected websocket clients using Resonite's text markup.

Usage: node index.js [OPTIONS] [-c COMMAND]

-s\tDo not print messages
-p\tPort (Default: 8080)
-l\tLimit rate (Default: 1000ms, -1 to disable)
-c\tUse an alternate command (and/or arguments)
-h, --help\tShows this help
    `)
  process.exit(0)
}

if (argv.includes("-s")) settings.silent = true

if (argv.includes("-l")) {
  const index = argv.indexOf("-l") + 1

  if (argv.length - 1 < index) {
    console.log("No limit given!")
    process.exit(1)
  }

  settings.rateLimit = parseInt(argv[index]) / 1000
}

if (argv.includes("-p")) {
  const index = argv.indexOf("-p") + 1

  if (argv.length - 1 < index) {
    console.log("No port given!")
    process.exit(1)
  }

  settings.port = parseInt(argv[index])
}

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

  var result = serializedData.substring(
    "<html><body><!--StartFragment--><pre><div style='color: #000000; background-color: #ffffff; font-family: courier-new, courier, monospace; font-size: 15px;'>"
      .length,
    serializedData.length - "</pre><!--EndFragment--></body></html>".length,
  )

  // Trim unnecessary spans
  result = result.replaceAll("<span></span>", "")
  result = result.replaceAll("<div>", "")
  result = result.replaceAll("</div>", "\n")

  // Convert color codes
  result = result.replaceAll(
    /<span style='color: (#[0-9a-fA-F]{6}); background-color: (#[0-9a-fA-F]{6});(?: font-weight: (\w+);)?'>/g,
    (match, color, background, weight) =>
      `<color ${color}><mark ${background}>${weight ? "<b>" : ""}`,
  )
  result = result.replaceAll(
    /<span style='background-color: (#[0-9a-fA-F]{6});'>/g,
    (match, background) => `<mark ${background}>`,
  )
  result = result.replaceAll("</span>", "<i></closeall>")
  result = result.replaceAll("<span>", "")

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
