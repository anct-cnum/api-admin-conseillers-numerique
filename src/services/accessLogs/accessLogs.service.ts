// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import createModel from '../../models/accessLogs.model';
import hooks from './accessLogs.hook';
import AccessLogs from './accessLogs.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    accessLogs: AccessLogs & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
  };

  // Initialize our service with any options it requires
  app.use('accessLogs', new AccessLogs(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('accessLogs');

  service.hooks(hooks);
}
