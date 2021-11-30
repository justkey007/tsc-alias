export class Output {
  constructor(private silent = false) {}

  info(message: string) {
    if (this.silent) return;
    console.log(`Info: ${message}`);
  }

  error(message: string, exitProcess = false) {
    if (!this.silent)
      //             [BgRed_] Error: [Reset] [FgRed_]${message}[Reset][LF]
      console.log(`\x1b[41m Error: \x1b[0m \x1b[31m${message}\x1b[0m\n`);
    if (exitProcess) process.exit(1);
  }

  clear() {
    console.clear();
  }
}
