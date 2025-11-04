// Parses the given process arguments and returns the script's settings object
export default function parseArguments(processArguments) {
  // Default settings
  const settings = {
    silent: false,
    command: "btop",
    args: ["-u", "1000"],
    port: 8080,
    rateLimit: 1,
  }

  // Make a shallow copy of the input
  var args = [...processArguments]

  // Extract the overwrite command, if applicable
  if (args.includes("-c")) {
    const startIndex = args.indexOf("-c")

    // Get everything after the flag, removing it from the original array
    const command = args.splice(startIndex + 1)

    if (command.length < 1) {
      console.log("No overwrite command specified after command flag!")
      process.exit(1)
    }

    args.pop() // Remove the trailing flag

    settings.command = command.shift()
    settings.args = command
  }

  if (args.includes("-h") || args.includes("--help")) {
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

  if (args.includes("-s")) settings.silent = true

  if (args.includes("-l")) {
    const index = args.indexOf("-l") + 1

    if (args.length - 1 < index) {
      console.log("No limit given!")
      process.exit(1)
    }

    settings.rateLimit = parseInt(args[index]) / 1000
  }

  if (args.includes("-p")) {
    const index = args.indexOf("-p") + 1

    if (args.length - 1 < index) {
      console.log("No port given!")
      process.exit(1)
    }

    settings.port = parseInt(args[index])
  }

  return settings
}
