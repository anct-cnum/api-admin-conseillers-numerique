import app from '../../src/app';

describe("'conseillers' service", () => {
  it('registered the service', () => {
    const service = app.service('conseillers');
    expect(service).toBeTruthy();
  });
});
