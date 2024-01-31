import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IHubs } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'hubs';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<IHubs>(
    {
      name: { type: String },
      region_names: { type: [String] },
      channelId: { type: String },
    },
    { strict: false, collection: 'hubs', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
