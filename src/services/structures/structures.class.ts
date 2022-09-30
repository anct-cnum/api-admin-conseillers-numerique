import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '@feathersjs/express';
import getStructures from './controllers/getStructures';
import updateStructure from './controllers/updateStructure';
import getStructuresMisesEnRelations from '../misesEnRelation/controllers/getStructuresMisesEnRelations';
import getStructuresMisesEnRelationsStats from '../misesEnRelation/controllers/getStructuresMisesEnRelationsStats';
import createAbilities from '../../middleware/createAbilities';
import getStructureById from './controllers/getStructureById';

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
    app.get('/structures/:id/misesEnRelation',
      authenticate('jwt'),
      createAbilities,
      getStructuresMisesEnRelations(app),
    );
    app.get('/structures/:id/misesEnRelation/stats',
      authenticate('jwt'),
      createAbilities,
      getStructuresMisesEnRelationsStats(app),
    );
  }
}
