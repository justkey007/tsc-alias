import { DATA } from '@commons';
import { CUSTOM_MODULE } from 'custom/index';
import { EXTRA } from 'extra';
import { add } from 'myproject/custom_modules/calculator';
import * as data from 'myproject/data.json';

export { DATA as XYZ } from '@commons';

console.log(DATA);
console.log(CUSTOM_MODULE);
console.log(EXTRA);
console.log(add(1, 2));
console.log(data);
