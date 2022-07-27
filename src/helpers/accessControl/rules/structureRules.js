const { action, ressource, functionnality } = require('../accessList');

module.exports = function structureRules(user, can) {
	can([action.read, action.update], ressource.users, {
		'entity.$id': user?.entity.oid,
	});
	can(action.send, functionnality.email);
};
