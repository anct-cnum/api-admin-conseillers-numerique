import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticate from '../../middleware/authenticate';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import updateMiseEnRelation from './controllers/updateMiseEnRelation';

export default class MisesEnRelation extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.patch(
      '/misesEnRelation/:id',
      authenticate(app),
      createAbilities(app),
      updateMiseEnRelation(app),
    );
  }
}
