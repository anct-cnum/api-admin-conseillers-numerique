import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticateMode from '../../middleware/authenticateMode';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import {
  getAccessibleData,
  getAccessibleDataAggregate,
  getUsers,
  getGestionnaires,
  postInvitationAdmin,
  postInvitationGrandReseau,
  postInvitationHub,
  postInvitationPrefet,
  postGestionnaireRelanceInvitation,
  updateAccessibleData,
  verifyToken,
  signIn,
  signOut,
  getRefreshToken,
  deleteAccountGrandReseau,
  deleteAccount,
  postInvitationStructure,
} from './controllers';

export default class Users extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    /**
     * @openapi
     * /login:
     *  get:
     *     tags:
     *     - User
     *     summary: Se connecter
     */
    app.get('/login', signIn(app));
    /**
     * @openapi
     * /logout:
     *  post:
     *     tags:
     *     - User
     *     summary: Se déconnecter
     */
    app.post('/logout', signOut(app));
    /**
     * @openapi
     * /refresh-token:
     *  post:
     *     tags:
     *     - User
     *     summary: Rafraichir le token
     */
    app.post('/refresh-token', getRefreshToken(app));

    app.get('/custom-route-get', authenticateMode(app), getAccessibleData(app));

    app.get(
      '/custom-route-get-aggregate',
      authenticateMode(app),
      createAbilities(app),
      getAccessibleDataAggregate(app),
    );
    app.patch(
      '/custom-route-update/:id',
      authenticateMode(app),
      createAbilities(app),
      updateAccessibleData(app),
    );
    /**
     * @openapi
     * /inviteAccountPrefet:
     *  post:
     *     tags:
     *     - User
     *     summary: Inviter un compte préfet
     */
    app.post(
      '/inviteAccountPrefet',
      authenticateMode(app),
      createAbilities(app),
      postInvitationPrefet(app),
    );
    /**
     * @openapi
     * /inviteAccountAdmin:
     *  post:
     *     tags:
     *     - User
     *     summary: Inviter un compte admin
     */
    app.post(
      '/inviteAccountAdmin',
      authenticateMode(app),
      createAbilities(app),
      postInvitationAdmin(app),
    );
    /**
     * @openapi
     * /inviteStructure:
     *  post:
     *     tags:
     *     - User
     *     summary: Inviter une structure
     */
    app.post(
      '/inviteStructure',
      authenticateMode(app),
      createAbilities(app),
      postInvitationStructure(app),
    );
    /**
     * @openapi
     * '/users/verifyToken/{id}':
     *  get:
     *     tags:
     *     - User
     *     summary: Vérifier le token
     *     parameters:
     *       - in: path
     *         name: token
     *         required: true
     *         description: Token de vérification
     *         schema:
     *           type: string
     */
    app.get('/users/verifyToken/:token', verifyToken(app));
    /**
     * @openapi
     * /users:
     *  get:
     *     tags:
     *     - User
     *     summary: Récupérer la liste des utilisateurs d'un grand réseau ou d'une structure
     */
    app.get(
      '/users',
      authenticateMode(app),
      createAbilities(app),
      getUsers(app),
    );
    /**
     * @openapi
     * /gestionnaires:
     *  get:
     *     tags:
     *     - User
     *     summary: Récupérer la liste des utilisateurs du tableau de pilotage
     */
    app.get(
      '/gestionnaires',
      authenticateMode(app),
      createAbilities(app),
      getGestionnaires(app, options),
    );
    /**
     * @openapi
     * '/user/grandReseau/{id}':
     *  delete:
     *     tags:
     *     - User
     *     summary: Supprimer un utilisateur ou un rôle d'un grand réseau
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de l'utilisateur
     *         schema:
     *           type: string
     */
    app.delete(
      '/user/grandReseau/:id',
      authenticateMode(app),
      createAbilities(app),
      deleteAccountGrandReseau(app),
    );
    /**
     * @openapi
     * '/user/{id}':
     *  delete:
     *     tags:
     *     - User
     *     summary: Supprimer un utilisateur ou enlever un rôle pour un admin
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de l'utilisateur
     *         schema:
     *           type: string
     */
    app.delete(
      '/user/:id',
      authenticateMode(app),
      createAbilities(app),
      deleteAccount(app),
    );
    /**
     * @openapi
     * /inviteAccountHub:
     *  post:
     *     tags:
     *     - User
     *     summary: Inviter un compte hub
     */
    app.post(
      '/inviteAccountHub',
      authenticateMode(app),
      createAbilities(app),
      postInvitationHub(app),
    );
    /**
     * @openapi
     * /inviteAccountGrandReseau:
     *  post:
     *     tags:
     *     - User
     *     summary: Inviter un compte grand réseau
     */
    app.post(
      '/inviteAccountGrandReseau',
      authenticateMode(app),
      createAbilities(app),
      postInvitationGrandReseau(app),
    );
    /**
     * @openapi
     * '/gestionnaire/relance-invitation/{id}':
     *  poste:
     *     tags:
     *     - User
     *     summary: Relancer l'invitation pour crée un compte sur le tableau de pilotage
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: id de l'utilisateur
     *         schema:
     *           type: string
     */
    app.post(
      '/gestionnaire/relance-invitation/:id',
      authenticateMode(app),
      createAbilities(app),
      postGestionnaireRelanceInvitation(app),
    );

    /* Routes techniques */

    // Intégration test Sentry
    app.get('/debug-sentry', function mainHandler() {
      throw new Error('My first Sentry error!');
    });

    // Monitoring clever
    // eslint-disable @typescript-eslint/no-unused-vars
    app.get('/', (req, res) => {
      res.sendStatus(200);
    });
  }
}
