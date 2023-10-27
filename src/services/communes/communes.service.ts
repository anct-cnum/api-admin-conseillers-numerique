// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import createModel from '../../models/communes.model';
import Communes from './communes.class';
import hooks from './communes.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    communes: Communes & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('communes', new Communes(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('communes');

  service.hooks(hooks);
}
