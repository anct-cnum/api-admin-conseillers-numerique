import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import getConseillersStatutRecrute from './controllers/getConseillersRecruter';
import getConseillerById from './controllers/getConseillerById';
import createAbilities from '../../middleware/createAbilities';

export default class Conseillers extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/conseillers-recruter',
      authenticate('jwt'),
      createAbilities,
      getConseillersStatutRecrute(app, options),
    );
    app.get(
      '/conseiller/:id',
      authenticate('jwt'),
      createAbilities,
      getConseillerById(app),
    );
  }
}
