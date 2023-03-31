import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import updateMiseEnRelation from './controllers/updateMiseEnRelation';
import getMiseEnRelation from './controllers/getMiseEnRelation';
import getMisesEnRelationStructure from './controllers/getMisesEnRelationStructure';
import getMisesEnRelationARenouveller from './controllers/getMisesEnRelationARenouveller';

export default class MisesEnRelation extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.patch(
      '/misesEnRelation/:id',
      authenticateMode(app),
      createAbilities(app),
      updateMiseEnRelation(app),
    );
    app.get(
      '/misesEnRelation/:id',
      authenticateMode(app),
      createAbilities(app),
      getMiseEnRelation(app),
    );
    app.get(
      '/misesEnRelation-structure/:id',
      authenticateMode(app),
      createAbilities(app),
      getMisesEnRelationStructure(app),
    );
    app.get(
      '/misesEnRelation-renouvellement-structure/:id',
      authenticateMode(app),
      createAbilities(app),
      getMisesEnRelationARenouveller(app),
    );
  }
}
