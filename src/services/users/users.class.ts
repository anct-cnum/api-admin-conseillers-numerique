import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
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
} from './controllers';

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
      postInvitationPrefet(app),
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
    app.get('/users/verifyToken/:token', verifyToken(app));
    app.get('/users', authenticate('jwt'), createAbilities, getUsers(app));
    app.post(
      '/inviteAccountHub',
      authenticate('jwt'),
      createAbilities,
      postInvitationHub(app),
    );
    app.post(
      '/inviteAccountGrandReseau',
      authenticate('jwt'),
      createAbilities,
      postInvitationGrandReseau(app),
    );
    // Sentry test
    app.get('/debug-sentry', function mainHandler() {
      throw new Error('My first Sentry error!');
    });
  }
}
