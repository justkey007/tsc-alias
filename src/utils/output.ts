export class Output {
  constructor(private silent = false) {}

  info(message: string) {
    if (this.silent) return;
    console.log(`Info: ${message}`);
  }

  error(message: string, exitProcess = false) {
    if (!this.silent) console.log(`${/**BgRed*/"\x1b[41m"} Error: ${/**Reset*/"\x1b[0m"} ${/**FgRed*/"\x1b[31m"}${message}${/**Reset*/"\x1b[0m"}\n`);
    if (exitProcess) process.exit(1);
  }

  clear() {
    console.clear();
  }
}
