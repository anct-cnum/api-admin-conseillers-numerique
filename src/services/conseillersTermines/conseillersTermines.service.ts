// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import createModel from '../../models/conseillersTermines.model';
import hooks from './conseillersTermines.hook';
import ConseillersTermines from './conseillersTermines.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    conseillersTermines: ConseillersTermines & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('conseillersTermines', new ConseillersTermines(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('conseillersTermines');

  service.hooks(hooks);
}
