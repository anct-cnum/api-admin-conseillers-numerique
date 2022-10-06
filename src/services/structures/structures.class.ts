import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticate from '../../middleware/authenticate';
import { Application } from '../../declarations';
import { getStructures, getStructure, updateStructure } from './controllers';

import createAbilities from '../../middleware/createAbilities';
import getStructureById from './controllers/getStructureById';

export default class Structures extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/structures',
      authenticate(app),
      createAbilities,
      getStructures(app),
    );
    app.get(
      '/structure',
      authenticate(app),
      createAbilities,
      getStructure(app),
    );
    app.get(
      '/structure/:id',
      authenticate(app),
      createAbilities,
      getStructureById(app),
    );
    app.patch(
      '/structure/:id',
      authenticate(app),
      createAbilities,
      updateStructure(app),
    );
  }
}
