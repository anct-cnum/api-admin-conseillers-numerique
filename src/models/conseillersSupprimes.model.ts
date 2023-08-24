import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { ConseillersSupprimes } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'conseillersSupprimes';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<ConseillersSupprimes>(
    {
      motif: { type: String },
      conseiller: { type: Object },
      actionUser: { type: Object },
      deletedAt: { type: Date },
    },
    { strict: false, collection: 'conseillersSupprimes', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
