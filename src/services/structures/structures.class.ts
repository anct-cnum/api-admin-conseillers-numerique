import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import getStructures from './controllers/getStructures';
import updateStructure from './controllers/updateStructure';
import createAbilities from '../../middleware/createAbilities';

export default class Structures extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/structures',
      authenticate('jwt'),
      createAbilities,
      getStructures(app),
    );
    app.patch(
      '/structure/:id',
      authenticate('jwt'),
      createAbilities,
      updateStructure(app),
    );
  }
}
