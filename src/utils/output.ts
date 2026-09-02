/**
 * @file
 * Standardized logging and assertion output helper for tsc-alias.
 */

import { inspect } from 'util';
import { IOutput } from '../interfaces';

export interface IOutputOptions {
  verbose?: boolean;
  debug?: boolean;
}

function formatDebugPayload(message: string, obj?: unknown): string {
  if (obj === undefined) {
    return `tsc-alias debug: ${message}`;
  }
  const formattedObj = inspect(obj, {
    showHidden: true,
    depth: Infinity,
    colors: true
  });
  return `tsc-alias debug: ${message} ${formattedObj}`;
}

export class Output implements IOutput {
  private verb: boolean;
  private readonly debugMode: boolean;

  constructor(verbose?: boolean | IOutputOptions, debugMode = false) {
    if (typeof verbose === 'object' && verbose !== null) {
      this.verb = verbose.verbose ?? false;
      this.debugMode = verbose.debug ?? false;
      return;
    }

    this.verb = Boolean(verbose);
    this.debugMode = debugMode;
  }

  public set verbose(value: boolean) {
    if (value) {
      this.verb = value;
    }
  }

  public debug = (message: string, obj?: unknown): void => {
    if (!this.debugMode) return;
    console.debug(formatDebugPayload(message, obj));
  };

  public info(message: string): void {
    if (!this.verb) return;
    console.log(`tsc-alias info: ${message}`);
  }

  public error(message: string, exitProcess = false): void {
    console.error(`\x1b[41mtsc-alias error:\x1b[0m \x1b[31m${message}\x1b[0m`);
    if (exitProcess) {
      process.exit(1);
    }
  }

  public clear(): void {
    console.clear();
  }

  public assert(claim: unknown, message: string): void {
    if (!claim) {
      this.error(message, true);
    }
  }
}
