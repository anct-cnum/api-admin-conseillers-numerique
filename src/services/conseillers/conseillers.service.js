// Initializes the `conseillers` service on path `/conseillers`
const { Conseillers } = require('./conseillers.class');
const createModel = require('../../models/conseillers.model');
const hooks = require('./conseillers.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/conseillers', new Conseillers(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('conseillers');

  service.hooks(hooks);
};
