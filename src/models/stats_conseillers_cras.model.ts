import { ObjectId } from 'mongodb';
import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IStatsConseillersCras } from '../ts/interfaces/db.interfaces';

export default function (app: Application): Model<any> {
  const modelName = 'stats_conseillers_cras';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<IStatsConseillersCras>(
    {
      conseiller: [ObjectId],
      2021: [Object],
      2022: [Object],
      2023: [Object],
      2024: [Object],
    },
    { strict: false, collection: 'stats_conseillers_cras' },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
