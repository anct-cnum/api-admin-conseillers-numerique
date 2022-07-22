// const { ForbiddenError } = require('@casl/ability') ;
const {
	mailSendingPermission,
} = require('../../../../helpers/verifyPermissions');

const getAccessibleDataAggregate = (app) => async (req, res) => {
	try {
		mailSendingPermission(req.ability);
		console.log('mail sent');
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

module.exports = { getAccessibleDataAggregate };
