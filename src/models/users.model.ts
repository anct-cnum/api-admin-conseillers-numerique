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
  const { Schema } = mongooseClient;
  const schema = new Schema<IUser>(
    {
      name: { type: String, required: true },

      password: { type: String },

      refreshToken: { type: String },

      sub: { type: String },

      roles: [String],

      entity: { type: DBRef },

      token: { type: String },

      departement: { type: String },

      region: { type: String },

      reseau: { type: String },

      resend: { type: Boolean },

      mailAModifier: { type: String },

      mailConfirmError: { type: String },

      mailConfirmErrorDetail: { type: String },

      mailCoopSent: { type: Boolean },

      mailSentDate: { type: Date },

      tokenCreatedAt: { type: Date },

      lastLogin: { type: Date },

      passwordCreated: { type: Boolean },
    },
    { strict: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
