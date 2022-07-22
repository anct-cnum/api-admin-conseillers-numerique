// Initializes the `mailing` service on path `/mailing`
const { Mailing } = require('./mailing.class');
const hooks = require('./mailing.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate'),
    id: 'mailing',
  };

  // Initialize our service with any options it requires
  app.use('/mailing', new Mailing(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('mailing');

  service.hooks(hooks);
};
