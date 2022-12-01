import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticate from '../../middleware/authenticate';
import { Application } from '../../declarations';
import getConseillersStatutRecrute from './controllers/getConseillersRecruter';
import getCandidatById from './controllers/getCandidatById';
import getCandidatCV from './controllers/getCandidatCV';
import getConseillerById from './controllers/getConseillerById';
import createAbilities from '../../middleware/createAbilities';

export default class Conseillers extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/conseillers-recruter',
      authenticate(app),
      createAbilities(app),
      getConseillersStatutRecrute(app, options),
    );
    app.get(
      '/candidat/:id',
      authenticate(app),
      createAbilities(app),
      getCandidatById(app),
    );
    app.get(
      '/conseiller/:id',
      authenticate(app),
      createAbilities(app),
      getConseillerById(app),
    );
    app.get(
      '/candidat/:id/cv',
      authenticate(app),
      createAbilities(app),
      getCandidatCV(app),
    );
  }
}
