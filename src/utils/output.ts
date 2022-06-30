/**
 * @file
 *
 * Keeping formatting consistent in large projects is difficult.
 * That's why this output class exists, it is used to standardize
 * logging and assertions.
 */

/** */
import { IOutput } from '../interfaces';
import { inspect } from 'util';

export class Output implements IOutput {
  // Default empty
  debug = (message: string, obj?: unknown) => {};

  constructor(private verb = false, debugMode = false) {
    if (debugMode) {
      // When in debug mode. Add debug function.
      this.debug = (message: string, obj?: unknown) => {
        console.debug(
          `tsc-alias debug: ${message} ${
            obj
              ? inspect(obj, {
                  showHidden: true,
                  depth: Infinity,
                  colors: true
                })
              : ''
          }`
        );
      };
    }
  }

  public set verbose(value: boolean) {
    if (value) {
      this.verb = value;
    }
  }

  info(message: string) {
    if (!this.verb) return;
    console.log(`tsc-alias info: ${message}`);
  }

  error(message: string, exitProcess = false) {
    console.error(
      //[BgRed]tsc-alias error:[Reset] [FgRed_]${message}[Reset]
      `\x1b[41mtsc-alias error:\x1b[0m \x1b[31m${message}\x1b[0m`
    );

    if (exitProcess) process.exit(1);
  }

  clear() {
    console.clear();
  }

  assert(claim: unknown, message: string) {
    claim || this.error(message, true);
  }
}
