import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IMisesEnRelation } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'misesEnRelation';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { DBRef } = mongoose.SchemaTypes;
  const schema = new mongooseClient.Schema<IMisesEnRelation>(
    {
      conseiller: { type: DBRef },

      structure: { type: DBRef },

      conseillerCreatedAt: { type: Date },

      createdAt: { type: Date },

      distance: { type: Number },

      statut: { type: String },

      conseillerObj: { type: Object },

      structureObj: { type: Object },

      reconventionnement: { type: Boolean },

      dateDebutDeContrat: { type: Date },

      dateFinDeContrat: { type: Date },

      typeDeContrat: { type: String },

      salaire: { type: Number },

      contratCoordinateur: { type: Boolean },
    },
    {
      strict: false,
      versionKey: false,
      collection: 'misesEnRelation',
    },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
