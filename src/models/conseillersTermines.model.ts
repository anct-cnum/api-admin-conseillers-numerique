import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IConseillersTermines } from '../ts/interfaces/db.interfaces';

export default function (app: Application): Model<any> {
  const modelName = 'conseillersTermines';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const schema = new mongooseClient.Schema<IConseillersTermines>(
    {
      conseillerId: { type: 'ObjectId' },
      structureId: { type: 'ObjectId' },
      dateFinContrat: { type: Date },
    },
    { strict: false, collection: 'conseillersTermines', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
