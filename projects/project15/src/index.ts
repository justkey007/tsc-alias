import { Controller } from '@controllers/index';
import { Router } from '@router';

declare module '@router' {
  export class Router2 {}
}

new Controller();

new Router();
