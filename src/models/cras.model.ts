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
      cra: {
        canal: String,
        activite: String,
        nbParticipants: Number,
        age: {
          moins12ans: Number,
          de12a18ans: Number,
          de18a35ans: Number,
          de35a60ans: Number,
          plus60ans: Number,
        },
        statut: {
          etudiant: Number,
          sansEmploi: Number,
          enEmploi: Number,
          retraite: Number,
          heterogene: Number,
        },
        themes: { type: Array },
        duree: { type: String },
        accompagnement: {
          individuel: Number,
          atelier: Number,
          redirection: Number,
        },
        codePostal: { type: String },
        nomCommune: { type: String },
        dateAccompagnement: { type: Date },
        organisme: { type: String, default: null },
      },
      conseiller: { type: DBRef },
    },
    { strict: false, collection: 'cras' },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
