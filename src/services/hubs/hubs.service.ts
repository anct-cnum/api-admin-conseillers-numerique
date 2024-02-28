// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import createModel from '../../models/hubs.model';
import hooks from './hubs.hook';
import Hubs from './hubs.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    hubs: Hubs & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('hubs', new Hubs(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('hubs');

  service.hooks(hooks);
}
