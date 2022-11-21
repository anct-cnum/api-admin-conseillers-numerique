import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticate from '../../middleware/authenticate';
import { Application } from '../../declarations';
import { getStructures, updateStructure } from './controllers';
import getStructuresMisesEnRelations from '../misesEnRelation/controllers/getStructuresMisesEnRelations';
import getStructuresMisesEnRelationsStats from '../misesEnRelation/controllers/getStructuresMisesEnRelationsStats';
import createAbilities from '../../middleware/createAbilities';
import getStructureById from './controllers/getStructureById';
import verifySiretStructure from './controllers/verifySiretStructure';
import updateSiretStructure from './controllers/updateSiretStructure';
import updateEmailStructure from './controllers/updateEmailStructure';

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
