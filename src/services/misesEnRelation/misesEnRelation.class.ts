import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import {
  updateMiseEnRelation,
  validationRenouvellementContrat,
  validationRecrutementContrat,
  createContrat,
  updateContratRecrutementStructure,
  updateContratRecrutementAdmin,
  updateContrat,
  getMiseEnRelation,
  getMiseEnRelationConseiller,
  getMisesEnRelationStructure,
  getMisesEnRelationARenouveller,
  getContrats,
  getHistoriqueContrats,
  annulationRecrutementContrat,
} from './controllers';

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
    app.patch(
      '/contrat/validation-recrutement/:id',
      authenticateMode(app),
      createAbilities(app),
      validationRecrutementContrat(app),
    );
    app.patch(
      '/contrat/annulation-recrutement/:id',
      authenticateMode(app),
      createAbilities(app),
      annulationRecrutementContrat(app),
    );
    app.post(
      '/renouvellement/contrat',
      authenticateMode(app),
      createAbilities(app),
      createContrat(app),
    );
    app.patch(
      '/structure/recrutement/contrat/:id',
      authenticateMode(app),
      createAbilities(app),
      updateContratRecrutementStructure(app),
    );
    app.patch(
      '/admin/recrutement/contrat/:idMiseEnRelation/:idConseiller',
      authenticateMode(app),
      createAbilities(app),
      updateContratRecrutementAdmin(app),
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
