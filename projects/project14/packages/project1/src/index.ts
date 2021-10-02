import { DATA } from '@commons';
import { CUSTOM_MODULE } from 'custom/index';
import { add } from 'myproject/custom_modules/calculator';

export { DATA as XYZ } from '@commons';

console.log(DATA);
console.log(CUSTOM_MODULE);
console.log(add(1, 2));
