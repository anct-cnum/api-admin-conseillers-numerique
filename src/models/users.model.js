const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line no-unused-vars
const loaded = dbref.install(mongoose);

module.exports = function (app) {
	const modelName = 'users';
	const mongooseClient = app.get('mongooseClient');
	const { DBRef } = mongoose.SchemaTypes;
	const schema = new mongooseClient.Schema(
		{
			name: { type: String, unique: true, lowercase: true, required: true },

			password: { type: String },

			roles: { type: Array },

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
		{
			timestamps: true,
		},
	);

	if (mongooseClient.modelNames().includes(modelName)) {
		mongooseClient.deleteModel(modelName);
	}
	return mongooseClient.model(modelName, schema);
};
