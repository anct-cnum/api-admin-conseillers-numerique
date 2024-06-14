// Initializes the `Conseillers` service on path `/Conseillers`
import createModel from '../../models/conseillers.model';
import { Application } from '../../declarations';
import Conseillers from './conseillers.class';
import hooks from './conseillers.hooks';

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    conseillers: Conseillers;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
    whitelist: ['$text', '$search', '$language'], // fields used by feathers-mongodb-fuzzy-search
  };

  // Initialize our service with any options it requires
  app.use('conseillers', new Conseillers(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('conseillers');
  service.hooks(hooks);
}
