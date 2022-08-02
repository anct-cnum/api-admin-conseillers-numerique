import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IUser } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
	const modelName = 'users';
	const mongooseClient: Mongoose = app.get('mongooseClient');
	const { DBRef } = mongoose.SchemaTypes;
	const schema = new mongooseClient.Schema<IUser>(
		{
			name: { type: String, unique: true, lowercase: true, required: true },

			password: { type: String },

			roles: [String],

			entity: { type: DBRef },

			token: { type: String },

			resend: { type: Boolean },

			mailAModifier: { type: String },

			mailConfirmError: { type: String },

			mailConfirmErrorDetail: { type: String },

			mailCoopSent: { type: Boolean },

			mailSentDate: { type: Date },

			tokenCreatedAt: { type: Date },

			passwordCreated: { type: Boolean },
		},
		{ strict: false },
	);

	if (mongooseClient.modelNames().includes(modelName)) {
		mongooseClient.deleteModel(modelName);
	}
	return mongooseClient.model(modelName, schema);
}
