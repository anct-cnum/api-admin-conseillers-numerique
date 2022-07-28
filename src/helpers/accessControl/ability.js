const { AbilityBuilder, Ability } = require('@casl/ability');
const { adminRules, structureRules, superAdminRules } = require('./rules');

function defineAbilitiesFor(user, role) {
	const { can, cannot, build } = new AbilityBuilder(Ability);

	switch (role) {
		case 'superAdmin':
			superAdminRules(can);
			break;
		case 'admin':
			adminRules(can);
			break;
		case 'structure':
			structureRules(user, can, cannot);
			break;

		default:
			break;
	}

	cannot('delete', 'users', { activated: true });

	return build();
}

const ANONYMOUS_ABILITY = defineAbilitiesFor(null);

module.exports = function createAbilities(req, res, next) {
	req.ability = req.user?.name
		? defineAbilitiesFor(req.user, req.body.roleActivated)
		: ANONYMOUS_ABILITY;
	next();
};
