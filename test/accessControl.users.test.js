const assert = require('assert');
const request = require('supertest');
const app = require('../src/app');

describe('\'users\' service', () => {
  it('registered the service', () => {
    const service = app.service('users');

    assert.ok(service, 'Registered the service');
  });

  // it('creates a user, encrypts password and adds gravatar', async () => {
  //   const user = await app.service('users').create({
  //     email: 'test@example.com',
  //     password: 'secret'
  //   });

  //   // Makes sure the password got encrypted
  //   assert.ok(user.password !== 'secret');
  // });

  // it('removes password for external requests', async () => {
  //   // Setting `provider` indicates an external request
  //   const params = { provider: 'rest',authenticated: true,
  //     query: { '$limit': 1, email: 'someone@example.com' },user:{email:'test@example.com',roles:['superAdmin']} };

  //   const user = await app.service('users').create({
  //     email: 'test2@example.com',
  //     password: 'secret'
  //   }, params);

  //   // Make sure password has been removed
  //   assert.ok(!user.password);
  // });
  describe('local strategy', () => {
    const userInfo = {
      name: 'someone@example.com',
      password: 'supersecret',
    };

    beforeAll(async () => {
      try {
        await app
          .service('users')
          .create({ ...userInfo, roles: ['superAdmin'] });
      } catch (error) {
        // Do nothing, it just means the user already exists and can be tested
      }
    });

    it('authenticates user and creates accessToken', async () => {
      const { accessToken } = await app.service('authentication').create({
        strategy: 'local',
        ...userInfo,
      });
      const { body, statusCode } = await request(app)
        .get('/custom-route-get')
        .set('Authorization', 'Bearer ' + accessToken);
      console.log(body, statusCode);
    });
  });
});
