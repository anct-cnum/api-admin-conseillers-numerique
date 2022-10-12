// Initializes the `cras` service on path `/cras`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import Cras from './cras.class';
import createModel from '../../models/cras.model';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    Cras: Cras & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('cras', new Cras(options, app));
}
