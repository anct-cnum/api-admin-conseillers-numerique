import { ObjectId } from 'mongodb';
import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IStatsConseillersCras } from '../ts/interfaces/db.interfaces';

export default function (app: Application): Model<any> {
  const modelName = 'statsConseillersCras';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const anneeSchema = new Schema({
    mois: Number,
    totalCras: Number,
  });

  const schema = new Schema<IStatsConseillersCras>(
    {
      conseiller: [ObjectId],
      2021: { type: [anneeSchema], default: undefined },
      2022: { type: [anneeSchema], default: undefined },
      2023: { type: [anneeSchema], default: undefined },
      2024: { type: [anneeSchema], default: undefined },
    },
    { strict: false, collection: 'stats_conseillers_cras' },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
