// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import createModel from '../../models/conseillersSupprimes.model';
import hooks from './conseillersSupprimes.hook';
import ConseillersSupprimes from './conseillersSupprimes.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    conseillersSupprimes: ConseillersSupprimes & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('conseillersSupprimes', new ConseillersSupprimes(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('conseillersSupprimes');

  service.hooks(hooks);
}
