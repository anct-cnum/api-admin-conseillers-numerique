// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import createModel from '../../models/statsTerritoires.model';
import StatsTerritoires from './statsTerritoires.class';
import hooks from './statsTerritoires.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    statsTerritoires: StatsTerritoires & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('statsTerritoires', new StatsTerritoires(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('statsTerritoires');

  service.hooks(hooks);
}
