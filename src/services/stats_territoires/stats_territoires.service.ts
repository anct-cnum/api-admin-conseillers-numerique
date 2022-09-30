// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import Statsterritoires from './stats_territoires.class';
import createModel from '../../models/stats_territoires.model';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    stats_territoires: Statsterritoires & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('stats_territoires', new Statsterritoires(options));
}
