import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { Application } from '../../declarations';
import getAccessibleData from './controllers/getAccessibleData';
import getAccessibleDataAggregate from './controllers/getAccessibleDataAggregate';
import updateAccessibleData from './controllers/updateAccessibleData';
import createAbilities from '../../middleware/createAbilities';
import postInvitation from './controllers/postInvitationPrefet';
import postInvitationAdmin from './controllers/postInvitationAdmin';
import postInvitationStructure from './controllers/postInvitationStructure';
import postInvitationHub from './controllers/postInvitationHub';
import verifyToken from './controllers/verifyToken';
import signIn from './controllers/signIn';
import signOut from './controllers/signOut';
import getRefreshToken from './controllers/getRefreshToken';
import authenticate from '../../middleware/authenticate';
import getUsersByStructure from './controllers/getUsersByStructure';

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
      postInvitation(app),
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
    app.get(
      '/users/listByIdStructure/:id',
      authenticate(app),
      createAbilities,
      getUsersByStructure(app),
    );
    app.post(
      '/inviteAccountHub',
      authenticate(app),
      createAbilities,
      postInvitationHub(app),
    );
    // Sentry test
    app.get('/debug-sentry', function mainHandler() {
      throw new Error('My first Sentry error!');
    });
  }
}
