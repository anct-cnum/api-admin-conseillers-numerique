import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticate from '../../middleware/authenticate';
import { Application } from '../../declarations';
import getConseillers from './controllers/getConseillers';
import createAbilities from '../../middleware/createAbilities';
import getConseillerById from './controllers/getConseillersById';

export default class Conseillers extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/conseillers',
      authenticate(app),
      createAbilities,
      getConseillers(app),
    );
    app.get(
      '/conseiller/:id',
      authenticate(app),
      createAbilities,
      getConseillerById(app),
    );
  }
}
