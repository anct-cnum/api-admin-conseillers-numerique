const { AbilityBuilder, Ability } = require('@casl/ability');
const { adminRules, structureRules, superAdminRules } = require('./rules');

function defineAbilitiesFor(user) {
	const { can, cannot, build } = new AbilityBuilder(Ability);
	if (user?.roles.includes('superAdmin')) {
		superAdminRules(can);
	} else if (user?.roles.includes('admin')) {
		adminRules(can);
	} else if (user?.roles.includes('structure')) {
		structureRules(user, can, cannot);
	}

	cannot('delete', 'users', { published: true });

	return build();
}

const ANONYMOUS_ABILITY = defineAbilitiesFor(null);

module.exports = function createAbilities(req, res, next) {
	req.ability = req.user?.name
		? defineAbilitiesFor(req.user)
		: ANONYMOUS_ABILITY;
	next();
};
