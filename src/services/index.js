const users = require('./users/users.service');
const structures = require('./structures/structures.service');
const conseillers = require('./conseillers/conseillers.service');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
	app.configure(users);
	app.configure(structures);
	app.configure(conseillers);
};
