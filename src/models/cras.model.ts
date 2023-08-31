import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { ICras } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'cras';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { DBRef } = mongoose.SchemaTypes;
  const schema = new mongooseClient.Schema<ICras>(
    {
      cra: { type: Object },

      conseiller: { type: DBRef },

      structure: { type: DBRef },

      createdAt: { type: Date },
    },
    { strict: false, collection: 'cras' },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
