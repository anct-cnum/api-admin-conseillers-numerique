import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
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
      authenticate('jwt'),
      createAbilities,
      getStructures(app, options),
    );
    app.get(
      '/structure/:id',
      authenticate('jwt'),
      createAbilities,
      getStructureById(app),
    );
    app.patch(
      '/structure/:id',
      authenticate('jwt'),
      createAbilities,
      updateStructure(app),
    );
    app.get(
      '/structure/verify-siret/:siret',
      authenticate('jwt'),
      createAbilities,
      verifySiretStructure(app),
    );
    app.patch(
      '/structure/siret/:id',
      authenticate('jwt'),
      createAbilities,
      updateSiretStructure(app),
    );
    app.patch(
      '/structure/email/:id',
      authenticate('jwt'),
      createAbilities,
      updateEmailStructure(app),
    );
    app.get(
      '/structures/:id/misesEnRelation',
      authenticate('jwt'),
      createAbilities,
      getStructuresMisesEnRelations(app),
    );
    app.get(
      '/structures/:id/misesEnRelation/stats',
      authenticate('jwt'),
      createAbilities,
      getStructuresMisesEnRelationsStats(app),
    );
  }
}
