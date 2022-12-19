import { ObjectId } from 'mongodb';
import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IPermanences } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'permanences';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { DBRef } = mongoose.SchemaTypes;
  const { Schema } = mongooseClient;
  const schema = new Schema<IPermanences>(
    {
      nomEnseigne: { type: String },

      numeroTelephone: { type: String },

      siret: { type: String },

      estStructure: { type: Boolean },

      adresse: { type: Object },

      siteWeb: { type: String },

      location: {
        type: String,
        coordinates: Array,
      },

      horaires: [Object],

      typeAcces: [String],

      conseillers: [ObjectId],

      lieuPrincipalPour: [ObjectId],

      conseillersItinerants: [ObjectId],

      structure: { type: DBRef },

      updatedAt: { type: Date },

      updatedBy: { type: Date },
    },
    { strict: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
