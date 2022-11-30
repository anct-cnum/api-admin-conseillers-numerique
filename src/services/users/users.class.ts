import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import authenticate from '../../middleware/authenticate';
import { Application } from '../../declarations';
import createAbilities from '../../middleware/createAbilities';
import {
  getAccessibleData,
  getAccessibleDataAggregate,
  getUsers,
  postInvitationAdmin,
  postInvitationGrandReseau,
  postInvitationHub,
  postInvitationPrefet,
  postInvitationStructure,
  updateAccessibleData,
  verifyToken,
  signIn,
  signOut,
  getRefreshToken,
} from './controllers';

export default class Users extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get('/login', signIn(app));

    app.post('/logout', signOut(app));

    app.post('/refresh-token', getRefreshToken(app));

    app.get('/custom-route-get', authenticate(app), getAccessibleData(app));

    app.get(
      '/custom-route-get-aggregate',
      authenticate(app),
      createAbilities,
      getAccessibleDataAggregate(app),
    );
    app.patch(
      '/custom-route-update/:id',
      authenticate(app),
      createAbilities,
      updateAccessibleData(app),
    );
    app.post(
      '/inviteAccountPrefet',
      authenticate(app),
      createAbilities,
      postInvitationPrefet(app),
    );
    app.post(
      '/inviteAccountAdmin',
      authenticate(app),
      createAbilities,
      postInvitationAdmin(app),
    );
    app.post(
      '/inviteStructure',
      authenticate(app),
      createAbilities,
      postInvitationStructure(app),
    );
    app.get('/users/verifyToken/:token', verifyToken(app));
    app.get('/users', authenticate(app), createAbilities, getUsers(app));
    app.post(
      '/inviteAccountHub',
      authenticate(app),
      createAbilities,
      postInvitationHub(app),
    );
    app.post(
      '/inviteAccountGrandReseau',
      authenticate(app),
      createAbilities,
      postInvitationGrandReseau(app),
    );
    // Sentry test
    app.get('/debug-sentry', function mainHandler() {
      throw new Error('My first Sentry error!');
    });
  }
}
