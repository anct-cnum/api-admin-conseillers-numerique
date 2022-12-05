import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';

import createAbilities from '../../middleware/createAbilities';
import { getCodePostauxStructureCras } from './controllers';

export default class Cras extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/cras/codesPostaux/structure',
      authenticateMode(app),
      createAbilities,
      getCodePostauxStructureCras(app),
    );
  }
}
