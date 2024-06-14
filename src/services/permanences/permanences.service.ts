// Initializes the `users` service on path `/users`
import { Application } from '../../declarations';
import createModel from '../../models/permanences.model';
import hooks from './permanences.hook';
import Permanences from './permanences.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    permanences: Permanences;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('permanences', new Permanences(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('permanences');

  service.hooks(hooks);
}
