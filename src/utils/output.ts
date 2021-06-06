import { Output as Console } from '@jfonx/console-utils';

export class Output {
  constructor(private silent = false) {}

  /**
   * Crash the process with a non-zero exit code
   */
  private static exitProcessWithError() {
    process.exit(1);
  }

  info(message: string) {
    if (this.silent) return;
    Console.info(message);
  }

  error(message: string, exitProcess = false) {
    if (!this.silent) {
      Console.error(message);
    }
    if (exitProcess) {
      Output.exitProcessWithError();
    }
  }

  clear() {
    Console.clear();
  }
}
