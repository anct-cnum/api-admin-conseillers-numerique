import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticate from '../../middleware/authenticate';
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
      authenticate(app),
      createAbilities,
      getStructures(app, options),
    );
    app.get(
      '/structure/:id',
      authenticate(app),
      createAbilities,
      getStructureById(app),
    );
    app.get(
      '/structure/details/:id',
      authenticate(app),
      createAbilities,
      getDetailStructureById(app),
    );
    app.patch(
      '/structure/:id',
      authenticate(app),
      createAbilities,
      updateStructure(app),
    );
    app.get(
      '/structure/verify-siret/:siret',
      authenticate(app),
      createAbilities,
      verifySiretStructure(app),
    );
    app.patch(
      '/structure/siret/:id',
      authenticate(app),
      createAbilities,
      updateSiretStructure(app),
    );
    app.patch(
      '/structure/email/:id',
      authenticate(app),
      createAbilities,
      updateEmailStructure(app),
    );
    app.get(
      '/structures/:id/misesEnRelation',
      authenticate(app),
      createAbilities,
      getStructuresMisesEnRelations(app),
    );
    app.get(
      '/structures/:id/misesEnRelation/stats',
      authenticate(app),
      createAbilities,
      getStructuresMisesEnRelationsStats(app),
    );
  }
}
