// Initializes the `structures` service on path `/structures`
import createModel from '../../models/structures.model';
import { Application } from '../../declarations';
import Structures from './structures.class';
import hooks from './structures.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    structures: Structures;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };
  // Initialize our service with any options it requires
  app.use('structures', new Structures(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('structures');
  service.hooks(hooks);
}
