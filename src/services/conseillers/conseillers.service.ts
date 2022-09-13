// Initializes the `Conseillers` service on path `/Conseillers`
import { ServiceAddons } from '@feathersjs/feathers';
import createModel from '../../models/conseillers.model';
import { Application } from '../../declarations';
import Conseillers from './conseillers.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    Conseillers: Conseillers & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('conseillers', new Conseillers(options, app));
}
