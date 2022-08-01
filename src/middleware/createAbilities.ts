import { AbilityBuilder, Ability } from '@casl/ability';

import {
	adminRules,
	structureRules,
	superAdminRules,
} from '../helpers/accessControl/rules';

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
			structureRules(user, can);
			break;

		default:
			break;
	}

	cannot('delete', 'users', { activated: true });

	return build();
}

const ANONYMOUS_ABILITY = defineAbilitiesFor(null, null);

export default function createAbilities(req, res, next) {
	req.ability = req.user?.name
		? defineAbilitiesFor(req.user, req.body.roleActivated)
		: ANONYMOUS_ABILITY;
	next();
}
