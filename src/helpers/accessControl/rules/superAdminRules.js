const { action, ressource } = require('../accessList');

module.exports = function superAdminRules(can) {
	can(action.manage, ressource.all);
};
