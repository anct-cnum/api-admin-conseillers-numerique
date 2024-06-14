// Initializes the `users` service on path `/users`
import { Application } from '../../declarations';
import createModel from '../../models/conseillersRuptures.model';
import hooks from './conseillersRuptures.hook';
import ConseillersRuptures from './conseillersRuptures.class';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    conseillersRuptures: ConseillersRuptures;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('conseillersRuptures', new ConseillersRuptures(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('conseillersRuptures');

  service.hooks(hooks);
}
