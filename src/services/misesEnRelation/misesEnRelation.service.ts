// Initializes the `users` service on path `/users`
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import MisesEnRelation from './misesEnRelation.class';
import createModel from '../../models/misesEnRelation.model';
import hooks from './misesEnRelation.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    misesEnRelation: MisesEnRelation & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
    whitelist: ['$text', '$search'], // fields used by feathers-mongodb-fuzzy-search
  };

  // Initialize our service with any options it requires
  app.use('misesEnRelation', new MisesEnRelation(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('misesEnRelation');

  service.hooks(hooks);
}
