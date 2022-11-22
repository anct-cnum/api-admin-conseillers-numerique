// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import StatsConseillersCras from './statsConseillersCras.class';
import createModel from '../../models/statsConseillersCras.model';
import hooks from './statsConseillersCras.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    statsConseillersCras: StatsConseillersCras & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('statsConseillersCras', new StatsConseillersCras(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('statsConseillersCras');

  service.hooks(hooks);
}
