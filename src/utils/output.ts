export class Output {
  constructor(private verbose = false) {}

  setVerbose(value: boolean) {
    this.verbose = value;
  }

  info(message: string) {
    if (!this.verbose) return;
    console.log(`tsc-alias info: ${message}`);
  }

  error(message: string, exitProcess = false) {
    console.error(
    // [BgRed_]tsc-alias error:[Reset] [FgRed_]${message}[Reset][LF]
      `\x1b[41mtsc-alias error:\x1b[0m \x1b[31m${message}\x1b[0m\n`
    );

    if (exitProcess) process.exit(1);
  }

  clear() {
    console.clear();
  }

  assert(claim: any, message: string) {
    claim || this.error(message, true);
  }
}
