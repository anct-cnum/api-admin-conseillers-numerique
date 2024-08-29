import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IConseillersRuptures } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'conseillersRuptures';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<IConseillersRuptures>(
    {
      conseillerId: { type: 'ObjectId' },
      structureId: { type: 'ObjectId' },
      dateRupture: { type: Date },
      motifRupture: { type: String },
    },
    { strict: false, collection: 'conseillersRuptures', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
