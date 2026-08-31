import { NAME } from 'config.js';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().startsWith(NAME)
});

console.log(UserSchema);
