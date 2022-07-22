const app = require('../../src/app');

describe('\'mailing\' service', () => {
  it('registered the service', () => {
    const service = app.service('mailing');
    expect(service).toBeTruthy();
  });
});
