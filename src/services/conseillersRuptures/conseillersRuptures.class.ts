import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';

import { getExportHistoriqueRuptureCsv } from './controllers';

export default class ConseillersRuptures extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);

    app.get(
      '/conseillersRuptures/historique-ruptures-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportHistoriqueRuptureCsv(app),
    );
  }
}
