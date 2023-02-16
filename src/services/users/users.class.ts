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
} from './controllers';

export default class Users extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get('/login', signIn(app));

    app.post('/logout', signOut(app));

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
    app.post(
      '/inviteAccountPrefet',
      authenticateMode(app),
      createAbilities(app),
      postInvitationPrefet(app),
    );
    app.post(
      '/inviteAccountAdmin',
      authenticateMode(app),
      createAbilities(app),
      postInvitationAdmin(app),
    );
    /*     app.post(
      '/inviteStructure',
      authenticateMode(app),
      createAbilities(app),
      postInvitationStructure(app),
    ); */
    app.get('/users/verifyToken/:token', verifyToken(app));
    app.get(
      '/users',
      authenticateMode(app),
      createAbilities(app),
      getUsers(app),
    );
    app.get(
      '/gestionnaires',
      authenticateMode(app),
      createAbilities(app),
      getGestionnaires(app, options),
    );
    app.delete(
      '/user/grandReseau/:id',
      authenticateMode(app),
      createAbilities(app),
      deleteAccountGrandReseau(app),
    );
    app.delete(
      '/user/:id',
      authenticateMode(app),
      createAbilities(app),
      deleteAccount(app),
    );
    app.post(
      '/inviteAccountHub',
      authenticateMode(app),
      createAbilities(app),
      postInvitationHub(app),
    );
    app.post(
      '/inviteAccountGrandReseau',
      authenticateMode(app),
      createAbilities(app),
      postInvitationGrandReseau(app),
    );
    app.post(
      '/gestionnaire/relance-invitation/:id',
      authenticateMode(app),
      createAbilities(app),
      postGestionnaireRelanceInvitation(app),
    );
    // Sentry test
    app.get('/debug-sentry', function mainHandler() {
      throw new Error('My first Sentry error!');
    });
  }
}
