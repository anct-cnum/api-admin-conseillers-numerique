import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import getConseillersStatutRecrute from './controllers/getConseillersRecruter';
import getCandidatById from './controllers/getCandidatById';
import getCandidatCV from './controllers/getCandidatCV';
import getConseillerById from './controllers/getConseillerById';
import createAbilities from '../../middleware/createAbilities';
import validationRuptureConseiller from './controllers/validationRuptureConseiller';
import dossierIncompletRuptureConseiller from './controllers/dossierIncompletRuptureConseiller';

export default class Conseillers extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/conseillers-recruter',
      authenticateMode(app),
      createAbilities(app),
      getConseillersStatutRecrute(app, options),
    );
    app.get(
      '/candidat/:id',
      authenticateMode(app),
      createAbilities(app),
      getCandidatById(app),
    );
    app.get(
      '/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      getConseillerById(app),
    );
    app.patch(
      '/conseiller/rupture/validation/:id',
      authenticateMode(app),
      createAbilities(app),
      validationRuptureConseiller(app),
    );
    app.patch(
      '/conseiller/rupture/incomplet/:id',
      authenticateMode(app),
      createAbilities(app),
      dossierIncompletRuptureConseiller(app),
    );
    app.get(
      '/candidat/:id/cv',
      authenticateMode(app),
      createAbilities(app),
      getCandidatCV(app),
    );
  }
}
