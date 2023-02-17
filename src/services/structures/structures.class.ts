import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import {
  getDetailStructureById,
  getStructureById,
  getStructures,
  preSelectionnerCandidat,
  updateEmailStructure,
  updateSiretStructure,
  updateStructure,
  verifySiretStructure,
  getDossiersReconventionnement,
  getDetailDossierReconventionnement,
} from './controllers';
import getStructuresMisesEnRelations from '../misesEnRelation/controllers/getStructuresMisesEnRelations';
import getStructuresMisesEnRelationsStats from '../misesEnRelation/controllers/getStructuresMisesEnRelationsStats';
import createAbilities from '../../middleware/createAbilities';

export default class Structures extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/structures',
      authenticateMode(app),
      createAbilities(app),
      getStructures(app, options),
    );
    app.get(
      '/structure/:id',
      authenticateMode(app),
      createAbilities(app),
      getStructureById(app),
    );
    app.get(
      '/structure/details/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailStructureById(app),
    );
    app.patch(
      '/structure/:id',
      authenticateMode(app),
      createAbilities(app),
      updateStructure(app),
    );
    app.get(
      '/structure/verify-siret/:siret',
      authenticateMode(app),
      createAbilities(app),
      verifySiretStructure(app),
    );
    app.patch(
      '/structure/siret/:id',
      authenticateMode(app),
      createAbilities(app),
      updateSiretStructure(app),
    );
    app.patch(
      '/structure/email/:id',
      authenticateMode(app),
      createAbilities(app),
      updateEmailStructure(app),
    );
    app.patch(
      '/structure/pre-selectionner/:id',
      authenticateMode(app),
      createAbilities(app),
      preSelectionnerCandidat(app),
    );
    app.get(
      '/structures/:id/misesEnRelation',
      authenticateMode(app),
      createAbilities(app),
      getStructuresMisesEnRelations(app, options),
    );
    app.get(
      '/structures/:id/misesEnRelation/stats',
      authenticateMode(app),
      createAbilities(app),
      getStructuresMisesEnRelationsStats(app),
    );
    app.post(
      '/reconventionnements/',
      authenticateMode(app),
      createAbilities(app),
      getDossiersReconventionnement(app),
    );
    app.get(
      '/reconventionnement/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailDossierReconventionnement(app),
    );
  }
}
