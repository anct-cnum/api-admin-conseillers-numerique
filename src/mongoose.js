const { accessibleRecordsPlugin } = require('@casl/mongoose');
const mongoose = require('mongoose');
const logger = require('./logger');

mongoose.plugin(accessibleRecordsPlugin);
if (process.env.NODE_ENV === 'development') {
	mongoose.set('debug', true);
}

module.exports = function (app) {
	mongoose.connect(app.get('mongodb')).catch((err) => {
		logger.error(err);
		process.exit(1);
	});

	app.set('mongooseClient', mongoose);
};
