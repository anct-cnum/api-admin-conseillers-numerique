import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';

import { getExportHistoriqueRuptureCsv } from './controllers';

export default class ConseillersRuptures extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    /**
     * @openapi
     * '/conseillersRuptures/historique-ruptures-csv':
     *  get:
     *     tags:
     *     - ConseillerRupture
     *     summary: Récupérer l'historique des ruptures au format CSV
     *     description: Récupérer l'historique des ruptures au format CSV fjdsqfidjfdsi ifdsjifjdsoifsd
     */
    app.get(
      '/conseillersRuptures/historique-ruptures-csv',
      authenticateMode(app),
      createAbilities(app),
      getExportHistoriqueRuptureCsv(app),
    );
  }
}
