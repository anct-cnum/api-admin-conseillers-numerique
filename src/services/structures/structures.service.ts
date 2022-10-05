// Initializes the `structures` service on path `/structures`
import { ServiceAddons } from '@feathersjs/feathers';
import createModel from '../../models/structures.model';
import { Application } from '../../declarations';
import Structures from './structures.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    structures: Structures & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };
  console.dir(options);
  // Initialize our service with any options it requires
  app.use('structures', new Structures(options, app));
}
