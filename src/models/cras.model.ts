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
  const { Schema } = mongooseClient;
  const { DBRef } = mongoose.SchemaTypes;

  const ageSchema = new Schema(
    {
      moins12ans: Number,
      de12a18ans: Number,
      de18a35ans: Number,
      de35a60ans: Number,
      plus60ans: Number,
    },
    { _id: false, strict: false },
  );

  const statutSchema = new Schema(
    {
      etudiant: Number,
      sansEmploi: Number,
      enEmploi: Number,
      retraite: Number,
      heterogene: Number,
    },
    { _id: false, strict: false },
  );

  const accompagnementSchema = new Schema(
    {
      individuel: Number,
      atelier: Number,
      redirection: Number,
    },
    { _id: false, strict: false },
  );

  const craSchema = new Schema(
    {
      canal: String,
      activite: String,
      nbParticipants: Number,
      age: { type: ageSchema },
      statut: { type: statutSchema },
      themes: { type: [String] },
      duree: String,
      accompagnement: { type: accompagnementSchema },
      codePostal: String,
      nomCommune: String,
      dateAccompagnement: Date,
      organisme: { type: String, default: null },
    },
    { _id: false, strict: false },
  );
  const schema = new Schema<ICras>(
    {
      cra: { type: craSchema },

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
