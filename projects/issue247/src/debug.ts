import debug from 'debug';

export const logger = debug('amqp-gateway');

logger.log = console.log.bind(console);

export interface Person {
  firstname: string;
}
