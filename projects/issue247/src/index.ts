import { Person } from '@app/debug';
import { logger } from './debug';
const person: Person = { firstname: 'James' };

export interface Book {
  author: Person;
}

async function run() {
  const { default: data } = await import('@app/data.json', { with: { type: 'json' } });
  logger.log(`Hello ${(data as Person).firstname || person.firstname}`);
}

run();
