# tsc-alias-bug-demo

Steps to reproduce https://github.com/justkey007/tsc-alias/issues/154:

1) Install dependencies
```sh
npm install
``` 

2) Start the app using `ts-node`
```sh
npm start
```
Output:
```
[Function: i18nConfigure]
Translation
```

3) Compile TS files and start the app
```sh
npm run build && node dist/index.js
```
Output:
```
console.log(i18n_1.default.configure);
                           ^
TypeError: Cannot read property 'configure' of undefined
```
It happens because `dist/i18n/index.js` contains
```js
const i18n_1 = __importDefault(require("../i18n"));
```
instead of
```js
const i18n_1 = __importDefault(require("i18n"));
```