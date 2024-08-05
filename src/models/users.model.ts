import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IUser } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'users';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const schema = new Schema<IUser>(
    {
      name: { type: String, required: true },

      password: { type: String },

      refreshToken: { type: String },

      sub: { type: String, unique: true },

      roles: [String],

      entity: { type: Schema.Types.Mixed },

      token: { type: String },

      departement: { type: String },

      region: { type: String },

      reseau: { type: String },

      resend: { type: Boolean },

      mailAModifier: { type: String },

      resetPasswordCnil: { type: Boolean },

      mailConfirmError: { type: String },

      mailConfirmErrorDetail: { type: String },

      mailCoopSent: { type: Boolean },

      mailSentDate: { type: Date },

      mailSentCoselecDate: { type: Date },

      mailErrorSentCoselec: { type: String },

      mailErrorDetailSentCoselec: { type: String },

      mailSentCoselecCoordinateurDate: { type: Date },

      mailErrorSentCoselecCoordinateur: { type: String },

      mailErrorDetailSentCoselecCoordinateur: { type: String },

      tokenCreatedAt: { type: Date },

      lastLogin: { type: Date },

      passwordCreated: { type: Boolean },
    },
    {
      strict: false,
      versionKey: false,
      timestamps: {
        createdAt: 'createdAt',
      },
    },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
