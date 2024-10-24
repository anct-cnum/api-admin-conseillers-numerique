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
  updateContactStructure,
  verifySiretStructure,
  getDossiersConvention,
  getDetailDossierConvention,
  getHistoriqueDossiersConvention,
  updateDossierReconventionnement,
  createAvenant,
  closeBanner,
  updateAvenantAjoutPoste,
  updateAvenantRenduPoste,
  getDetailDemandeCoordinateur,
  getDemandesCoordinateur,
  updateDemandeCoordinateurAvisPrefet,
  closeBannerParcoursCoordinateur,
  updateDemandeCoordinateurRefusAvisAdmin,
  updateDemandeCoordinateurValidAvisAdmin,
  addRoleCoordinateur,
  updateDemandeConseillerValidAvisAdmin,
  getDemandesConseiller,
  getDetailDemandeConseiller,
  updateDemandeConseillerRefusAvisAdmin,
  updateDemandeConseillerAvisPrefet,
  closeBannerDemandeConseillerAvisPrefet,
  closeBannerAvenantAvisPrefet,
  updateAvenantAvisPrefetPosteSupplementaire,
  updateCommentaireAvisPrefet,
  updateCommentaireAvenantAvisPrefet,
  verifySiretOrRidetStructure,
} from './controllers';
import getStructuresMisesEnRelations from '../misesEnRelation/controllers/getStructuresMisesEnRelations';
import getStructuresMisesEnRelationsStats from '../misesEnRelation/controllers/getStructuresMisesEnRelationsStats';
import createAbilities from '../../middleware/createAbilities';
// Temporaire : A remettre pour la livraison Formulaire
// import creerCandidatureStructure, {
//   validerCandidatureStructure,
// } from './controllers/creerCandidatureStructure';
// import creerCandidatureStructureCoordinateur, {
//   validerCandidatureStructureCoordinateur,
// } from './controllers/creerCandidatureStructureCoordinateur';
import confirmationEmailCandidatureStructure from './controllers/confirmationEmailCandidatureStructure';

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
      '/structure/contact/:id',
      authenticateMode(app),
      createAbilities(app),
      updateContactStructure(app),
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
      '/structures/misesEnRelation',
      authenticateMode(app),
      createAbilities(app),
      getStructuresMisesEnRelations(app, options),
    );
    app.get(
      '/structures/misesEnRelation/stats',
      authenticateMode(app),
      createAbilities(app),
      getStructuresMisesEnRelationsStats(app),
    );
    app.patch(
      '/avis/admin/valid/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeConseillerValidAvisAdmin(app),
    );
    app.patch(
      '/avis/admin/refus/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeConseillerRefusAvisAdmin(app),
    );
    app.get(
      '/demandes/conseillers',
      authenticateMode(app),
      createAbilities(app),
      getDemandesConseiller(app, options),
    );
    app.get(
      '/demandes/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailDemandeConseiller(app),
    );
    app.patch(
      '/avis/prefet/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeConseillerAvisPrefet(app),
    );
    app.patch(
      '/avis/prefet/commentaire/:id',
      authenticateMode(app),
      createAbilities(app),
      updateCommentaireAvisPrefet(app),
    );
    app.patch(
      '/banner/prefet/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      closeBannerDemandeConseillerAvisPrefet(app),
    );
    app.patch(
      '/banner/avenant/prefet/:id',
      authenticateMode(app),
      createAbilities(app),
      closeBannerAvenantAvisPrefet(app),
    );
    app.get(
      '/demandes/coordinateurs',
      authenticateMode(app),
      createAbilities(app),
      getDemandesCoordinateur(app, options),
    );
    app.get(
      '/demandes/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailDemandeCoordinateur(app),
    );
    app.patch(
      '/avis/prefet/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeCoordinateurAvisPrefet(app),
    );
    app.patch(
      '/avis/admin/refus/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeCoordinateurRefusAvisAdmin(app),
    );
    app.patch(
      '/avis/admin/valid/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeCoordinateurValidAvisAdmin(app),
    );
    app.patch(
      '/banner/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      closeBannerParcoursCoordinateur(app),
    );
    app.get(
      '/conventions/',
      authenticateMode(app),
      createAbilities(app),
      getDossiersConvention(app, options),
    );
    app.get(
      '/historique/conventions/',
      authenticateMode(app),
      createAbilities(app),
      getHistoriqueDossiersConvention(app, options),
    );
    app.get(
      '/convention/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailDossierConvention(app),
    );
    app.patch(
      '/reconventionnement',
      authenticateMode(app),
      createAbilities(app),
      updateDossierReconventionnement(app),
    );
    app.patch(
      '/banniere/:id',
      authenticateMode(app),
      createAbilities(app),
      closeBanner(app),
    );
    app.patch(
      '/avenant/creation/:id',
      authenticateMode(app),
      createAbilities(app),
      createAvenant(app),
    );
    app.patch(
      '/avenant/ajout-poste/:id',
      authenticateMode(app),
      createAbilities(app),
      updateAvenantAjoutPoste(app),
    );
    app.patch(
      '/avenant/rendu-poste/:id',
      authenticateMode(app),
      createAbilities(app),
      updateAvenantRenduPoste(app),
    );
    app.patch(
      '/avenant/avis/prefet/poste-supplementaire/:id',
      authenticateMode(app),
      createAbilities(app),
      updateAvenantAvisPrefetPosteSupplementaire(app),
    );
    app.patch(
      '/avenant/avis/prefet/commentaire/:id',
      authenticateMode(app),
      createAbilities(app),
      updateCommentaireAvenantAvisPrefet(app),
    );
    app.patch(
      '/structure/add-role-coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      addRoleCoordinateur(app),
    );
    // Temporaire : A remettre pour la livraison Formulaire
    // app.post(
    //   '/candidature-structure',
    //   validerCandidatureStructure(app),
    //   creerCandidatureStructure(app),
    // );
    // app.post(
    //   '/candidature-structure-coordinateur',
    //   validerCandidatureStructureCoordinateur(app),
    //   creerCandidatureStructureCoordinateur(app),
    // );
    app.patch(
      '/confirmation-email-inscription-structure/:id',
      confirmationEmailCandidatureStructure(app),
    );
    app.get(
      '/structure/verify-siret-or-ridet/:siretOrRidet',
      verifySiretOrRidetStructure(app),
    );
  }
}
