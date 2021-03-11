import { DATA } from '@commons';
import { CUSTOM_MODULE } from 'custom/index';
import { EXTRA } from 'extra';
import { add } from 'myproject/custom_modules/calculator';
import { SCOPE } from '@me/myproject/scope/index';

console.log(DATA);
console.log(CUSTOM_MODULE);
console.log(EXTRA);
console.log(add(1, 2));
console.log(SCOPE);
