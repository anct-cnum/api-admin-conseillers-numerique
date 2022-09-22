// Initializes the `exports` service on path `/exports`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import { Stats } from './stats.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    Stats: Stats & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('stats', new Stats(app, options));
}
