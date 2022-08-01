// const { ForbiddenError } = require('@casl/ability') ;
import mailSendingPermission from '../../../helpers/accessControl/verifyPermissions';

const getAccessibleDataAggregate = (app) => async (req, res) => {
	try {
		mailSendingPermission(req.ability);
	} catch (error) {
		res.status(401).json(error.message);
	}

	const query = await app
		.service('users')
		.Model.accessibleBy(req.ability)
		.getQuery();

	const users = await app.service('users').Model.aggregate([
		{
			$match: {
				$and: [query],
			},
		},
		{ $project: { name: 1, roles: 1 } },
	]);

	res.status(200).json(users);
};

export default getAccessibleDataAggregate;
