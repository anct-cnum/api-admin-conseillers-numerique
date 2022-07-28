const { action, ressource } = require('../accessList');

module.exports = function adminRules(can) {
	can(action.manage, ressource.all);
};
