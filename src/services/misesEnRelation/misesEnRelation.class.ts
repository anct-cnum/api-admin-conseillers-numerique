import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import updateMiseEnRelation from './controllers/updateMiseEnRelation';

export default class MisesEnRelation extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.patch(
      '/misesEnRelation/:id',
      authenticateMode(app),
      createAbilities(app),
      updateMiseEnRelation(app),
    );
  }
}
