// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import createModel from '../../models/qpv.model';
import Qpv from './qpv.class';
import hooks from './qpv.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    qpv: Qpv & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('qpv', new Qpv(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('qpv');

  service.hooks(hooks);
}
