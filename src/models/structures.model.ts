import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IStructures } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'structures';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const schema = new Schema<IStructures>(
    {
      idPG: { type: Number },

      type: { type: String },

      statut: { type: String },

      nom: { type: String },

      siret: { type: String },

      aIdentifieCandidat: { type: Boolean },

      dateDebutMission: { type: Date },

      nombreConseillersSouhaites: { type: Number },

      estLabelliseFranceServices: { type: String },

      codePostal: { type: String },

      location: {
        type: String,
        coordinates: Array,
      },

      nomCommune: { type: String },

      codeCommune: { type: String },

      codeDepartement: { type: String },

      codeRegion: { type: String },

      emailConfirmedAt: { type: Date },

      emailConfirmationKey: { type: String },

      unsubscribedAt: { type: Date },

      unsubscribeExtras: { type: Object },

      createdAt: { type: Date },

      updatedAt: { type: Date },

      validatedAt: { type: Date },

      importedAt: { type: Date },

      deleted_at: { type: Date },

      userCreated: { type: Boolean },

      coselecAt: { type: Date },

      reseau: { type: String },

      conventionnement: {
        statut: { type: String },
        dossierReconventionnement: { type: Object },
        dossierConventionnement: { type: Object },
      },
    },
    { strict: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
