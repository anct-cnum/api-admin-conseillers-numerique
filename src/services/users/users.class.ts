import { Service, MongooseServiceOptions } from 'feathers-mongoose';
// import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import getAccessibleData from './controllers/getAccessibleData';
import getAccessibleDataAggregate from './controllers/getAccessibleDataAggregate';
import updateAccessibleData from './controllers/updateAccessibleData';
import createAbilities from '../../middleware/createAbilities';
import updateEmailAccount from './controllers/updateEmailAccount';
import verifyToken from './controllers/verifyToken';
import confirmationEmail from './controllers/confirmationEmail';
import signIn from './controllers/signIn';
import signOut from './controllers/signOut';
import getRefreshToken from './controllers/getRefreshToken';
import authenticate from '../../middleware/authenticate';

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
    app.patch(
      '/users/sendEmailUpdate/:id',
      authenticate(app),
      createAbilities,
      updateEmailAccount(app),
    );
    app.patch('/confirmation-email/:token', confirmationEmail(app));
    app.get('/users/verifyToken/:token', verifyToken(app));

    // Sentry test
    app.get('/debug-sentry', function mainHandler() {
      throw new Error('My first Sentry error!');
    });
  }
}
