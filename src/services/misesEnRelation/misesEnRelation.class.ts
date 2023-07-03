import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import updateMiseEnRelation from './controllers/updateMiseEnRelation';
import getMiseEnRelation from './controllers/getMiseEnRelation';
import getMisesEnRelationStructure from './controllers/getMisesEnRelationStructure';
import getMisesEnRelationARenouveller from './controllers/getMisesEnRelationARenouveller';
import getContrats from './controllers/getContrats';
import validationRenouvellementContrat from './controllers/validationRenouvellementContrat';
import getHistoriqueContrats from './controllers/getHistoriqueContrats';
import createContrat from './controllers/createContrat';
import updateContrat from './controllers/updateContrat';
import getMiseEnRelationConseiller from './controllers/getMiseEnRelationConseiller';

export default class MisesEnRelation extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.patch(
      '/misesEnRelation/:id',
      authenticateMode(app),
      createAbilities(app),
      updateMiseEnRelation(app),
    );
    app.patch(
      '/contrat/validation-renouvellement/:id',
      authenticateMode(app),
      createAbilities(app),
      validationRenouvellementContrat(app),
    );
    app.post(
      '/contrat',
      authenticateMode(app),
      createAbilities(app),
      createContrat(app),
    );
    app.patch(
      '/contrat/:id',
      authenticateMode(app),
      createAbilities(app),
      updateContrat(app),
    );
    app.get(
      '/misesEnRelation/:id',
      authenticateMode(app),
      createAbilities(app),
      getMiseEnRelation(app),
    );
    app.get(
      '/misesEnRelation-conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      getMiseEnRelationConseiller(app),
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
    app.get(
      '/contrats',
      authenticateMode(app),
      createAbilities(app),
      getContrats(app, options),
    );
    app.get(
      '/historique/contrats',
      authenticateMode(app),
      createAbilities(app),
      getHistoriqueContrats(app, options),
    );
  }
}
