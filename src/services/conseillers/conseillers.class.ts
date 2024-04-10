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
import getCandidats from './controllers/getCandidats';
import deleteCandidatById from './controllers/deleteCandidatById';
import candidatRelanceInvitation from './controllers/candidatRelanceInvitation';
import conseillerRelanceInvitation from './controllers/conseillerRelanceInvitation';
import getCandidatsStructure from './controllers/getCandidatsStructure';
import getConseillerContratById from './controllers/getConseillerContratById';
import getCandidatContratById from './controllers/getCandidatContratById';
import getConseillersCoordonnes from './controllers/getConseillersCoordonnes';

export default class Conseillers extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    /**
     * @openapi
     * '/conseillers-recruter':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer la liste des conseillers. Route utilisé pour les liste des conseillers
     */
    app.get(
      '/conseillers-recruter',
      authenticateMode(app),
      createAbilities(app),
      getConseillersStatutRecrute(app, options),
    );
    /**
     * @openapi
     * '/conseillers-coordonnes':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer la liste des conseillers coordonnés pour le rôle coordinateur.
     */
    app.get(
      '/conseillers-coordonnes',
      authenticateMode(app),
      createAbilities(app),
      getConseillersCoordonnes(app, options),
    );
    /**
     * @openapi
     * '/candidats':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer la liste des candidats pour le rôle admin.
     */
    app.get(
      '/candidats',
      authenticateMode(app),
      createAbilities(app),
      getCandidats(app, options),
    );
    /**
     * @openapi
     * '/candidats/structure':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer la liste des candidats pour le rôle structure.
     */
    app.get(
      '/candidats/structure',
      authenticateMode(app),
      createAbilities(app),
      getCandidatsStructure(app, options),
    );
    /**
     * @openapi
     * '/candidat/{id}':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer un candidat par son ID.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID du candidat.
     *         schema:
     *           type: string
     */
    app.get(
      '/candidat/:id',
      authenticateMode(app),
      createAbilities(app),
      getCandidatById(app),
    );
    /**
     * @openapi
     * '/candidat/{idConseiller}/{idMiseEnRelation}':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer le contrat d'un candidat par son ID.
     *     parameters:
     *       - in: path
     *         name: idConseiller
     *         required: true
     *         description: Object ID du candidat.
     *         schema:
     *           type: string
     *       - in: path
     *         name: idMiseEnRelation
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.get(
      '/candidat/contrat/:idConseiller/:idMiseEnRelation',
      authenticateMode(app),
      createAbilities(app),
      getCandidatContratById(app),
    );
    /**
     * @openapi
     * '/candidat/relance-invitation/{id}':
     *  post:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer un candidat par son ID.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID du candidat.
     *         schema:
     *           type: string
     */
    app.post(
      '/candidat/relance-invitation/:id',
      authenticateMode(app),
      createAbilities(app),
      candidatRelanceInvitation(app),
    );
    /**
     * @openapi
     * '/conseiller/relance-invitation/{id}':
     *  post:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer un candidat par son ID.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID du candidat.
     *         schema:
     *           type: string
     */
    app.post(
      '/conseiller/relance-invitation/:id',
      authenticateMode(app),
      createAbilities(app),
      conseillerRelanceInvitation(app),
    );
    /**
     * @openapi
     * '/candidat/{id}':
     *  delete:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer un candidat par son ID.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID du candidat.
     *         schema:
     *           type: string
     */
    app.delete(
      '/candidat/:id',
      authenticateMode(app),
      createAbilities(app),
      deleteCandidatById(app),
    );
    /**
     * @openapi
     * '/conseiller/{id}':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer un candidat par son ID.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID du candidat.
     *         schema:
     *           type: string
     */
    app.get(
      '/conseiller/:id',
      authenticateMode(app),
      createAbilities(app),
      getConseillerById(app),
    );
    /**
     * @openapi
     * '/conseiller/contrat/{idConseiller}/{idMiseEnRelation}':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer le contrat d'un candidat par son ID.
     *     parameters:
     *       - in: path
     *         name: idConseiller
     *         required: true
     *         description: Object ID du candidat.
     *         schema:
     *           type: string
     *       - in: path
     *         name: idMiseEnRelation
     *         required: true
     *         description: Object ID de la mise en relation.
     *         schema:
     *           type: string
     */
    app.get(
      '/conseiller/contrat/:idConseiller/:idMiseEnRelation',
      authenticateMode(app),
      createAbilities(app),
      getConseillerContratById(app),
    );
    /**
     * @openapi
     * '/conseiller/rupture/validation/{id}':
     *  patch:
     *     tags:
     *     - Conseiller
     *     summary: Validation d'une rupture par l'ID du conseiller.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID du conseiller.
     *         schema:
     *           type: string
     */
    app.patch(
      '/conseiller/rupture/validation/:id',
      authenticateMode(app),
      createAbilities(app),
      validationRuptureConseiller(app),
    );
    /**
     * @openapi
     * '/candidat/relance-invitation/{id}':
     *  patch:
     *     tags:
     *     - Conseiller
     *     summary: Modifier l'état de la rupture en incomplet par l'ID du conseiller.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID du conseiller.
     *         schema:
     *           type: string
     */
    app.patch(
      '/conseiller/rupture/incomplet/:id',
      authenticateMode(app),
      createAbilities(app),
      dossierIncompletRuptureConseiller(app),
    );
    /**
     * @openapi
     * '/candidat/{id}/cv':
     *  get:
     *     tags:
     *     - Conseiller
     *     summary: Récupérer le Curiculum Vitae d'un candidat par son ID.
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: Object ID du candidat.
     *         schema:
     *           type: string
     */
    app.get(
      '/candidat/:id/cv',
      authenticateMode(app),
      createAbilities(app),
      getCandidatCV(app),
    );
  }
}
