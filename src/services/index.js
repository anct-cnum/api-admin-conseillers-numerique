const users = require('./users/users.service.js');
const mailing = require('./mailing/mailing.service.js');
const structures = require('./structures/structures.service.js');
const conseillers = require('./conseillers/conseillers.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(users);
  app.configure(mailing);
  app.configure(structures);
  app.configure(conseillers);
};
