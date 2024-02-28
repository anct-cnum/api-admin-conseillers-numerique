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
} from './controllers';
import getStructuresMisesEnRelations from '../misesEnRelation/controllers/getStructuresMisesEnRelations';
import getStructuresMisesEnRelationsStats from '../misesEnRelation/controllers/getStructuresMisesEnRelationsStats';
import createAbilities from '../../middleware/createAbilities';

export default class Structures extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    /**
     * @openapi
     * /structures:
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer la liste des structures.
     */
    app.get(
      '/structures',
      authenticateMode(app),
      createAbilities(app),
      getStructures(app, options),
    );
    /**
     * @openapi
     * '/structure/{id}':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer une structure par son ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: ID de la structure.
     *         schema:
     *           type: string
     */
    app.get(
      '/structure/:id',
      authenticateMode(app),
      createAbilities(app),
      getStructureById(app),
    );
    /**
     * @openapi
     * '/structure/details/{id}':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer une structure par son ID ainsi que les mises en relations
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: ID de la structure.
     *         schema:
     *           type: string
     */
    app.get(
      '/structure/details/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailStructureById(app),
    );
    /**
     * @openapi
     * '/structure/contact/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Mettre à jour les informations de contact d'une structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: ID de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/structure/contact/:id',
      authenticateMode(app),
      createAbilities(app),
      updateContactStructure(app),
    );
    /**
     * @openapi
     * '/structure/verify-siret/{siret}':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Vérifier si le siret existe dans l'api entreprise
     *     parameters:
     *       - in: path
     *         name: siret
     *         required: true
     *         description: siret de la structure.
     *         schema:
     *           type: string
     */
    app.get(
      '/structure/verify-siret/:siret',
      authenticateMode(app),
      createAbilities(app),
      verifySiretStructure(app),
    );
    /**
     * @openapi
     * '/structure/siret/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Mettre à jour le siret d'une structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/structure/siret/:id',
      authenticateMode(app),
      createAbilities(app),
      updateSiretStructure(app),
    );
    /**
     * @openapi
     * '/structure/email/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Mettre à jour l'email de contact d'une structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/structure/email/:id',
      authenticateMode(app),
      createAbilities(app),
      updateEmailStructure(app),
    );
    /**
     * @openapi
     * '/structure/pre-selectionner/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Pré-sélectionner un candidat pour une structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id du candidat.
     *         schema:
     *           type: string
     */
    app.patch(
      '/structure/pre-selectionner/:id',
      authenticateMode(app),
      createAbilities(app),
      preSelectionnerCandidat(app),
    );
    /**
     * @openapi
     * '/structures/misesEnRelation':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer les mises en relations d'une structure
     */
    app.get(
      '/structures/misesEnRelation',
      authenticateMode(app),
      createAbilities(app),
      getStructuresMisesEnRelations(app, options),
    );
    /**
     * @openapi
     * '/structures/misesEnRelation/stats':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer le nombre de mises en relations par statut pour l'affichage des tags sur la liste des candidatures
     */
    app.get(
      '/structures/misesEnRelation/stats',
      authenticateMode(app),
      createAbilities(app),
      getStructuresMisesEnRelationsStats(app),
    );
    /**
     * @openapi
     * '/avis/admin/valid/conseiller/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Valider une structure primo entrante par l'admin (COSELEC AUTO)
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avis/admin/valid/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeConseillerValidAvisAdmin(app),
    );
    /**
     * @openapi
     * '/avis/admin/refus/conseiller/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Refuser une structure primo entrante par l'admin (COSELEC AUTO)
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avis/admin/refus/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeConseillerRefusAvisAdmin(app),
    );
    /**
     * @openapi
     * '/demandes/conseillers':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer la liste des structures primo entrantes (COSELEC AUTO)
     */
    app.get(
      '/demandes/conseillers',
      authenticateMode(app),
      createAbilities(app),
      getDemandesConseiller(app, options),
    );
    /**
     * @openapi
     * '/demandes/conseiller/{id}':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer le détail d'une structure primo entrante (COSELEC AUTO)
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.get(
      '/demandes/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailDemandeConseiller(app),
    );
    /**
     * @openapi
     * '/avis/prefet/conseiller/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Mettre à jour l'avis du préfet pour une structure primo entrante (COSELEC AUTO)
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avis/prefet/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeConseillerAvisPrefet(app),
    );
    /**
     * @openapi
     * '/banner/prefet/conseiller/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Fermer la bannière de confirmation d'un avis du préfet pour une structure primo entrante (COSELEC AUTO)
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/banner/prefet/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      closeBannerDemandeConseillerAvisPrefet(app),
    );
    /**
     * @openapi
     * '/demandes/coordinateurs':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer la liste des structures postulant pour un poste coordinateur
     */
    app.get(
      '/demandes/coordinateurs',
      authenticateMode(app),
      createAbilities(app),
      getDemandesCoordinateur(app, options),
    );
    /**
     * @openapi
     * '/demandes/coordinateur/{id}':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer le détail d'une structure postulant pour un poste coordinateur
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.get(
      '/demandes/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailDemandeCoordinateur(app),
    );
    /**
     * @openapi
     * '/avis/prefet/coordinateur/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Mettre à jour l'avis du préfet pour une structure postulant pour un poste coordinateur
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avis/prefet/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeCoordinateurAvisPrefet(app),
    );
    /**
     * @openapi
     * '/avis/admin/refus/coordinateur/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Refuser une structure postulant pour un poste coordinateur par l'admin
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avis/admin/refus/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeCoordinateurRefusAvisAdmin(app),
    );
    /**
     * @openapi
     * '/avis/admin/valid/coordinateur/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Valider une structure postulant pour un poste coordinateur par l'admin
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avis/admin/valid/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      updateDemandeCoordinateurValidAvisAdmin(app),
    );
    /**
     * @openapi
     * '/banner/coordinateur/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Gestion des fermetures de bannières du parcours coordinateur
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/banner/coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      closeBannerParcoursCoordinateur(app),
    );
    /**
     * @openapi
     * '/conventions':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer la liste des conventions (conventionnement initial / avenant ajout /rendu de poste)
     */
    app.get(
      '/conventions/',
      authenticateMode(app),
      createAbilities(app),
      getDossiersConvention(app, options),
    );
    /**
     * @openapi
     * '/historique/conventions':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer l'historique des conventions (conventionnement initial / reconventionnement / avenant ajout // rendu de poste)
     */
    app.get(
      '/historique/conventions/',
      authenticateMode(app),
      createAbilities(app),
      getHistoriqueDossiersConvention(app, options),
    );
    /**
     * @openapi
     * '/convention/{id}':
     *  get:
     *     tags:
     *     - Structure
     *     summary: Récupérer le détail d'une convention (conventionnement initial / reconventionnement / avenant ajout // rendu de poste)
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.get(
      '/convention/:id',
      authenticateMode(app),
      createAbilities(app),
      getDetailDossierConvention(app),
    );
    /**
     * @openapi
     * '/reconventionnement':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Gestion de la demande de reconventionnement d'une structure
     */
    app.patch(
      '/reconventionnement',
      authenticateMode(app),
      createAbilities(app),
      updateDossierReconventionnement(app),
    );
    /**
     * @openapi
     * '/banniere/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Gestion de la fermeture des bannières de la structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/banniere/:id',
      authenticateMode(app),
      createAbilities(app),
      closeBanner(app),
    );
    /**
     * @openapi
     * '/avenant/creation/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Création d'un avenant pour ajouter ou rendre un poste pour une structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avenant/creation/:id',
      authenticateMode(app),
      createAbilities(app),
      createAvenant(app),
    );
    /**
     * @openapi
     * '/avenant/ajout-poste/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Validation ou refus d'un nouveau poste pour une structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avenant/ajout-poste/:id',
      authenticateMode(app),
      createAbilities(app),
      updateAvenantAjoutPoste(app),
    );
    /**
     * @openapi
     * '/avenant/rendu-poste/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Validation ou refus d'un rendu de poste pour une structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/avenant/rendu-poste/:id',
      authenticateMode(app),
      createAbilities(app),
      updateAvenantRenduPoste(app),
    );
    /**
     * @openapi
     * '/structure/add-role-coordinateur/{id}':
     *  patch:
     *     tags:
     *     - Structure
     *     summary: Ajouter le rôle de coordinateur à un conseiller d'une structure
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de la structure.
     *         schema:
     *           type: string
     */
    app.patch(
      '/structure/add-role-coordinateur/:id',
      authenticateMode(app),
      createAbilities(app),
      addRoleCoordinateur(app),
    );
  }
}
