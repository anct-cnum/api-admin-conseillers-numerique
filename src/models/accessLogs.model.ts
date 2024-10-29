import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { AccessLogs } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'accessLogs';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<AccessLogs>(
    {
      name: { type: String },
      createdAt: { type: Date },
      ip: { type: String },
      connexionError: { type: Boolean },
      proConnectSub: { type: String },
    },
    { strict: false, collection: 'accessLogs', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
