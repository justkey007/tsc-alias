import { Output as Console } from '@jfonx/console-utils';

export class Output {
  constructor(private silent = false) {}

  info(message: string) {
    if (this.silent) return;
    Console.info(message);
  }

  error(message: string, exitProces = false) {
    if (this.silent) return;
    Console.error(message, exitProces);
  }

  clear() {
    Console.clear();
  }
}
