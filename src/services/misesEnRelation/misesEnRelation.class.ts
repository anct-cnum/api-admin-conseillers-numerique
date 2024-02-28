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
  closeBannerAnnulationRecrutementContrat,
} from './controllers';

export default class MisesEnRelation extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    /**
     * @openapi
     * '/misesEnRelation/{id}':
     *  patch:
     *     tags:
     *     - MiseEnRelation
     *     summary: Mettre à jour une mise en relation.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.patch(
      '/misesEnRelation/:id',
      authenticateMode(app),
      createAbilities(app),
      updateMiseEnRelation(app),
    );
    /**
     * @openapi
     * '/contrat/validation-renouvellement/{id}':
     *  patch:
     *     tags:
     *     - MiseEnRelation
     *     summary: Valider le renouvellement d'un contrat.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.patch(
      '/contrat/validation-renouvellement/:id',
      authenticateMode(app),
      createAbilities(app),
      validationRenouvellementContrat(app),
    );
    /**
     * @openapi
     * '/contrat/validation-recrutement/{id}':
     *  patch:
     *     tags:
     *     - MiseEnRelation
     *     summary: Valider le recrutement d'un conseiller.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.patch(
      '/contrat/validation-recrutement/:id',
      authenticateMode(app),
      createAbilities(app),
      validationRecrutementContrat(app),
    );
    /**
     * @openapi
     * '/contrat/annulation-recrutement/{id}':
     *  patch:
     *     tags:
     *     - MiseEnRelation
     *     summary: Annuler le recrutement d'un conseiller.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.patch(
      '/contrat/annulation-recrutement/:id',
      authenticateMode(app),
      createAbilities(app),
      annulationRecrutementContrat(app),
    );
    /**
     * @openapi
     * '/banner/annulation-recrutement/{id}':
     *  patch:
     *     tags:
     *     - MiseEnRelation
     *     summary: Fermer la bannière suite à l'annulation d'un recrutement.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.patch(
      '/banner/annulation-recrutement/:id',
      authenticateMode(app),
      createAbilities(app),
      closeBannerAnnulationRecrutementContrat(app),
    );
    /**
     * @openapi
     * '/renouvellement/contrat':
     *  post:
     *     tags:
     *     - MiseEnRelation
     *     summary: Fermer la bannière suite à l'annulation d'un recrutement.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.post(
      '/renouvellement/contrat',
      authenticateMode(app),
      createAbilities(app),
      createContrat(app),
    );
    /**
     * @openapi
     * '/structure/recrutement/contrat/{id}':
     *  patch:
     *     tags:
     *     - MiseEnRelation
     *     summary: Mettre à jour le contrat d'un conseiller par la structure.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.patch(
      '/structure/recrutement/contrat/:id',
      authenticateMode(app),
      createAbilities(app),
      updateContratRecrutementStructure(app),
    );
    /**
     * @openapi
     * '/admin/recrutement/contrat/{idMiseEnRelation}/{idConseiller}':
     *  patch:
     *     tags:
     *     - MiseEnRelation
     *     summary: Mettre à jour le contrat d'un conseiller par l'admin.
     *     parameters:
     *       - in: path
     *         name: idMiseEnRelation
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     *       - in: path
     *         name: idConseiller
     *         required: true
     *         description: Object ID du conseiller.
     *         schema:
     *           type: string
     */
    app.patch(
      '/admin/recrutement/contrat/:idMiseEnRelation/:idConseiller',
      authenticateMode(app),
      createAbilities(app),
      updateContratRecrutementAdmin(app),
    );
    /**
     * @openapi
     * '/contrat/{id}':
     *  patch:
     *     tags:
     *     - MiseEnRelation
     *     summary: Mettre à jour le contrat d'un conseiller dans le cadre du renouvellement de contrat.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.patch(
      '/contrat/:id',
      authenticateMode(app),
      createAbilities(app),
      updateContrat(app),
    );
    /**
     * @openapi
     * '/misesEnRelation/{id}':
     *  get:
     *     tags:
     *     - MiseEnRelation
     *     summary: Récupérer une mise en relation par son ID.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.get(
      '/misesEnRelation/:id',
      authenticateMode(app),
      createAbilities(app),
      getMiseEnRelation(app),
    );
    /**
     * @openapi
     * '/misesEnRelation-conseiller/{id}':
     *  get:
     *     tags:
     *     - MiseEnRelation
     *     summary: Récupérer le candidat avec ses mises en relation pour la page de détail d'un candidat qui a était conseiller.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.get(
      '/misesEnRelation-conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      getMiseEnRelationConseiller(app),
    );
    /**
     * @openapi
     * '/misesEnRelation-structure/{id}':
     *  get:
     *     tags:
     *     - MiseEnRelation
     *     summary: Récupérer le candidat avec ses mises en relation pour la page de détail d'un candidat qui a était conseiller.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.get(
      '/misesEnRelation-structure/:id',
      authenticateMode(app),
      createAbilities(app),
      getMisesEnRelationStructure(app),
    );
    /**
     * @openapi
     * '/misesEnRelation-renouvellement-structure/{id}':
     *  get:
     *     tags:
     *     - MiseEnRelation
     *     summary: Récupérer les mises en relation à renouveller pour une structure qui éffectue son reconventionnement.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.get(
      '/misesEnRelation-renouvellement-structure/:id',
      authenticateMode(app),
      createAbilities(app),
      getMisesEnRelationARenouveller(app),
    );
    /**
     * @openapi
     * '/contrats':
     *  get:
     *     tags:
     *     - MiseEnRelation
     *     summary: Récupérer les contrats en attente de traitement (ruptures / recrutements / renouvellements).
     */
    app.get(
      '/contrats',
      authenticateMode(app),
      createAbilities(app),
      getContrats(app, options),
    );
    /**
     * @openapi
     * '/contrats':
     *  get:
     *     tags:
     *     - MiseEnRelation
     *     summary: Récupérer l'historique des contrats traités (ruptures / recrutements / renouvellements).
     */
    app.get(
      '/historique/contrats',
      authenticateMode(app),
      createAbilities(app),
      getHistoriqueContrats(app, options),
    );
  }
}
