import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { AccessLogs } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'accessLogs';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<AccessLogs>(
    {
      email: { type: String },
      createdAt: { type: Date },
      ip: { type: String },
      ipTest: { type: String },
      connexionError: { type: Boolean },
    },
    { strict: false, collection: 'accessLogs', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
