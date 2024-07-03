import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { ICommunes } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'communes';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const geometrySchema = new Schema(
    {
      type: String,
      coordinates: [Array],
    },
    { _id: false, strict: false },
  );
  const propertiesSchema = new Schema(
    {
      code: String,
      nom: String,
    },
    { _id: false, strict: false },
  );
  const schema = new Schema<ICommunes>(
    {
      type: { type: String },

      geometry: { type: geometrySchema },

      properties: { type: propertiesSchema },
    },
    { strict: false, collection: 'communes', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
