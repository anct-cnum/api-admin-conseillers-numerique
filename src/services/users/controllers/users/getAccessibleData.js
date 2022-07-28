const {
	mailSendingPermission,
} = require('../../../../helpers/accessControl/verifyPermissions');

const getAccessibleData = (app) => async (req, res) => {
	try {
		mailSendingPermission(req.ability);
		console.log('passed');
	} catch (error) {
		res.status(401).json(error.message);
	}

	try {
		const user = await app
			.service('users')
			.Model.accessibleBy(req.ability, 'read');

		res.json(user);
	} catch (error) {
		res.status(401).json(error.message);
	}
};

module.exports = { getAccessibleData };
