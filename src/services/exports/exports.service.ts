// Initializes the `exports` service on path `/exports`
import { Application } from '../../declarations';
import { Exports } from './exports.class';
import hooks from './exports.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    exports: Exports;
  }
}

export default function (app: Application): void {
  const options = {
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('exports', new Exports(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('exports');

  service.hooks(hooks);
}
