import { accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose from 'mongoose';
import logger from './logger';
import { Application } from './declarations';

mongoose.plugin(accessibleRecordsPlugin);
if (process.env.NODE_ENV === 'development') {
	mongoose.set('debug', true);
}

export default function (app: Application): void {
	mongoose.connect(app.get('mongodb')).catch((err) => {
		logger.error(err);
		process.exit(1);
	});

	app.set('mongooseClient', mongoose);
}
