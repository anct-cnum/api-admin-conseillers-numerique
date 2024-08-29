import { ObjectId } from 'mongodb';
import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IStatsTerritoires } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'statsTerritoires';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<IStatsTerritoires>(
    {
      date: { type: String },

      nombreConseillersCoselec: { type: Number },

      cnfsActives: { type: Number },

      cnfsInactives: { type: Number },

      conseillerIds: [ObjectId],

      codeDepartement: { type: String },

      codeRegion: { type: String },

      nomDepartement: { type: String },

      nomRegion: { type: String },

      tauxActivation: { type: Number },
    },
    { strict: false, collection: 'stats_Territoires', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
