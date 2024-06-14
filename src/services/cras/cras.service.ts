// Initializes the `cras` service on path `/cras`
import { Application } from '../../declarations';
import Cras from './cras.class';
import createModel from '../../models/cras.model';
import hooks from './cras.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    cras: Cras;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('cras', new Cras(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('cras');

  service.hooks(hooks);
}
