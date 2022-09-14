import { ObjectId } from 'mongodb';
import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IStatsTerritoires } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'stats_territoires';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { DBRef } = mongoose.SchemaTypes;
  const schema = new mongooseClient.Schema<IStatsTerritoires>(
    {
      date: String,
      nombreConseillersCoselec: Number,
      cnfsActives: Number,
      cnfsInactives: Number,
      conseillerIds: [ObjectId],
      codeDepartement: String,
      codeRegion: String,
      nomDepartement: String,
      nomRegion: String,
      tauxActivation: Number,
    },
    { strict: false, collection: 'stats_territoires' },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
