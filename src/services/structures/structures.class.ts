import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import {
  getDetailStructureById,
  getStructureById,
  getStructures,
  updateEmailStructure,
  updateSiretStructure,
  updateStructure,
  verifySiretStructure,
} from './controllers';
import getStructuresMisesEnRelations from '../misesEnRelation/controllers/getStructuresMisesEnRelations';
import getStructuresMisesEnRelationsStats from '../misesEnRelation/controllers/getStructuresMisesEnRelationsStats';
import createAbilities from '../../middleware/createAbilities';

export default class Structures extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/structures',
      authenticateMode(app),
      createAbilities,
      getStructures(app, options),
    );
    app.get(
      '/structure/:id',
      authenticateMode(app),
      createAbilities,
      getStructureById(app),
    );
    app.get(
      '/structure/details/:id',
      authenticateMode(app),
      createAbilities,
      getDetailStructureById(app),
    );
    app.patch(
      '/structure/:id',
      authenticateMode(app),
      createAbilities,
      updateStructure(app),
    );
    app.get(
      '/structure/verify-siret/:siret',
      authenticateMode(app),
      createAbilities,
      verifySiretStructure(app),
    );
    app.patch(
      '/structure/siret/:id',
      authenticateMode(app),
      createAbilities,
      updateSiretStructure(app),
    );
    app.patch(
      '/structure/email/:id',
      authenticateMode(app),
      createAbilities,
      updateEmailStructure(app),
    );
    app.get(
      '/structures/:id/misesEnRelation',
      authenticateMode(app),
      createAbilities,
      getStructuresMisesEnRelations(app),
    );
    app.get(
      '/structures/:id/misesEnRelation/stats',
      authenticateMode(app),
      createAbilities,
      getStructuresMisesEnRelationsStats(app),
    );
  }
}
