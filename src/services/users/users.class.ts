import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import getAccessibleData from './controllers/getAccessibleData';
import getAccessibleDataAggregate from './controllers/getAccessibleDataAggregate';
import updateAccessibleData from './controllers/updateAccessibleData';
import createAbilities from '../../middleware/createAbilities';
import postInvitation from './controllers/postInvitationPrefet';
import postInvitationAdmin from './controllers/postInvitationAdmin';
import postInvitationStructure from './controllers/postInvitationStructure';
import postInvitationHub from './controllers/postInvitationHub';
import getUsersByStructure from './controllers/getUsersByStructure';

export default class Users extends Service {
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    app.get(
      '/custom-route-get',
      authenticate('jwt'),
      createAbilities,
      getAccessibleData(app),
    );
    app.get(
      '/custom-route-get-aggregate',
      authenticate('jwt'),
      createAbilities,
      getAccessibleDataAggregate(app),
    );
    app.patch(
      '/custom-route-update/:id',
      authenticate('jwt'),
      createAbilities,
      updateAccessibleData(app),
    );
    app.post(
      '/inviteAccountPrefet',
      authenticate('jwt'),
      createAbilities,
      postInvitation(app),
    );
    app.post(
      '/inviteAccountAdmin',
      authenticate('jwt'),
      createAbilities,
      postInvitationAdmin(app),
    );
    app.post(
      '/inviteStructure',
      authenticate('jwt'),
      createAbilities,
      postInvitationStructure(app),
    );
    app.get(
      '/users/listByIdStructure/:id',
      authenticate('jwt'),
      createAbilities,
      getUsersByStructure(app),
    );
    app.post(
      '/inviteAccountHub',
      authenticate('jwt'),
      createAbilities,
      postInvitationHub(app),
    );
    // Sentry test
    app.get('/debug-sentry', function mainHandler() {
      throw new Error('My first Sentry error!');
    });
  }
}
