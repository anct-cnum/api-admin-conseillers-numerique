import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';

import createAbilities from '../../middleware/createAbilities';
import {
  getCodePostauxStructureCras,
  getFiltresConseillerCras,
  getFiltresConseillerCrasParcoursRecrutement,
} from './controllers';

export default class Cras extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    /**
     * @openapi
     * '/cras/codesPostaux/structure':
     *  get:
     *     tags:
     *     - Cra
     *     summary: Récupérer la liste des codes postaux des structures. Route utilisé pour les filtres des structures dans les stats
     */
    app.get(
      '/cras/codesPostaux/structure',
      authenticateMode(app),
      createAbilities(app),
      getCodePostauxStructureCras(app),
    );
    /**
     * @openapi
     * '/cras/filtres/conseiller':
     *  get:
     *     tags:
     *     - Cra
     *     summary: Récupérer la liste des filtres pour les conseillers. Route utilisé pour les filtres des conseillers dans les stats
     */
    app.get(
      '/cras/filtres/conseiller',
      authenticateMode(app),
      createAbilities(app),
      getFiltresConseillerCras(app),
    );
    /**
     * @openapi
     * '/cras/recrutement/filtres/conseiller':
     *  get:
     *     tags:
     *     - Cra
     *     summary: Récupérer la liste des filtres des stats conseillers dans le parcours de recrutement de la structure.
     */
    app.get(
      '/cras/recrutement/filtres/conseiller',
      authenticateMode(app),
      createAbilities(app),
      getFiltresConseillerCrasParcoursRecrutement(app),
    );
  }
}
