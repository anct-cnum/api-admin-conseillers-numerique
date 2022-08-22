// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import Exports from './exports.class';
import createModel from '../../models/users.model';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    exports: Exports & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('exports', new Exports(options, app));
}
