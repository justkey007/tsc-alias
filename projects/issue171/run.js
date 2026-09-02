const { getAppName } = require('./app/dist/index.js');
const { getGreeting } = require('./core/dist/index.js');

console.log(getAppName(), getGreeting());
