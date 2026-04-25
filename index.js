import xterm from "@xterm/xterm"
const { Terminal } = xterm
import { SerializeAddon } from "@xterm/addon-serialize"
import { spawn } from "node-pty"
import { spawn as spawnChild } from "child_process"
import { WebSocketServer, WebSocket } from "ws"
import path from "path"
import fs from "fs"
import parseArguments from "./lib/parseArguments.js"
import htmlToResmarkup, { plainTextToResmarkup } from "./lib/htmlToResmarkup.js"

const settings = parseArguments(process.argv)
const isTickwatch = settings.port === 8083
var nextAllowedMessage = 0 // The process time of the earliest next allowed message

// Setup websocket — bind to 0.0.0.0 so Resonite/other hosts can connect
const wss = new WebSocketServer({ port: settings.port, host: "0.0.0.0" })
if (!settings.silent) console.log("WebSocket listening on port", settings.port)
wss.on("connection", function connection(ws) {
  ws.on("error", console.error)

  ws.on("message", function message(data) {
    if (!settings.silent) console.log("Received: %s", data)
  })
})

// --- Tickwatch: run script every 30s, plain stdout → Resonite (no PTY, so one line per \n) ---
let tickwatchLastOutput = ""
function runTickwatch() {
  const cmd = settings.command
  const args = settings.args || []
  const proc = spawnChild(cmd, args, { cwd: process.cwd(), env: process.env })
  let out = ""
  proc.stdout.on("data", (chunk) => { out += chunk })
  proc.stderr.on("data", (chunk) => { out += chunk })
  proc.on("close", (code) => {
    tickwatchLastOutput = plainTextToResmarkup(out, { emoji: process.env.TICKWATCH_EMOJI === "1" })
    if (!settings.silent) console.log("Tickwatch run finished, code", code)
  })
}
if (isTickwatch) {
  runTickwatch()
  setInterval(runTickwatch, 30000)
}

// --- Btop: PTY + xterm serialize + htmlToResmarkup ---
const COLS = Math.max(80, parseInt(process.env.COLS, 10) || 140)
const ROWS = Math.max(24, parseInt(process.env.ROWS, 10) || 55)
const term = new Terminal({ cols: COLS, rows: ROWS, scrollback: 0 })
const serializeAddon = new SerializeAddon()
term.loadAddon(serializeAddon)

const configDir = path.join(process.cwd(), "config")
const btopArgs = [...settings.args]
// Sync btop's update interval (-u) with our send rate so the display matches what we stream
if (!isTickwatch && settings.command === "btop") {
  const updateMs = Math.max(500, Math.round(settings.rateLimit * 1000))
  const uIdx = btopArgs.indexOf("-u")
  if (uIdx >= 0 && btopArgs[uIdx + 1] !== undefined) {
    btopArgs[uIdx + 1] = String(updateMs)
  } else {
    btopArgs.length = 0
    btopArgs.push("-u", String(updateMs))
  }
}
const env = { ...process.env }
if (fs.existsSync(path.join(configDir, "btop", "btop.conf"))) {
  env.XDG_CONFIG_HOME = configDir
}

let childProcess
if (!isTickwatch) {
  try {
    childProcess = spawn(settings.command, btopArgs, {
      name: "xterm-color",
      cols: COLS,
      rows: ROWS,
      cwd: process.cwd(),
      env,
      scrollback: 0,
    })
  } catch (err) {
    console.error("Failed to spawn command:", settings.command, btopArgs, err)
    process.exit(1)
  }

  childProcess.on("exit", (code, signal) => {
    if (!settings.silent) console.error("Child process exited:", { code, signal })
  })

  childProcess.on("data", (data) => {
    const normalized = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    term.write(normalized)

    if (process.uptime() >= nextAllowedMessage) {
      nextAllowedMessage = process.uptime() + settings.rateLimit
      sendToClients()
      if (!settings.silent) console.log("Data sent.")
    } else if (!settings.silent) console.log("Data suppressed.")
  })
}

function sendToClients() {
  const result = isTickwatch
    ? tickwatchLastOutput
    : htmlToResmarkup(serializeAddon.serializeAsHTML({ scrollback: 0 }), { tickwatch: false })
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(result)
    }
  })
}

const rateLimitMs = Math.max(100, Math.round(settings.rateLimit * 1000))
setInterval(() => {
  if (wss.clients.size > 0) sendToClients()
}, rateLimitMs)
