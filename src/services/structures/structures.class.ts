import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import { getStructures, getStructure, updateStructure } from './controllers';

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
    app.get(
      '/structure',
      authenticate('jwt'),
      createAbilities,
      getStructure(app),
    );
    app.patch(
      '/structure/:id',
      authenticate('jwt'),
      createAbilities,
      updateStructure(app),
    );
  }
}
