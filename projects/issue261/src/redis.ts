// A local source file whose base name (`redis`) collides with the
// npm package it imports. This collision is what triggers the bug.
import { createClient } from 'redis';

const client = createClient();

export { client };
