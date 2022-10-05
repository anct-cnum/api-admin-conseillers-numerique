import { ObjectId } from 'mongodb';
import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IStatsConseillersCras } from '../ts/interfaces/db.interfaces';

export default function (app: Application): Model<any> {
  const modelName = 'statsConseillersCras';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<IStatsConseillersCras>(
    {
      conseiller: [ObjectId],
      2021: [
        {
          mois: { type: Number },
          totalCras: { type: Number },
        },
      ],
      2022: [
        {
          mois: { type: Number },
          totalCras: { type: Number },
        },
      ],
      2023: [
        {
          mois: { type: Number },
          totalCras: { type: Number },
        },
      ],
      2024: [
        {
          mois: { type: Number },
          totalCras: { type: Number },
        },
      ],
    },
    { strict: false, collection: 'stats_conseillers_cras' },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
