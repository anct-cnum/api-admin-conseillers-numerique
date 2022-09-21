// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import StatsConseillersCras from './stats_conseillers_cras.class';
import createModel from '../../models/stats_conseillers_cras.model';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    stats_conseillers_cras: StatsConseillersCras & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('stats_conseillers_cras', new StatsConseillersCras(options));
}
