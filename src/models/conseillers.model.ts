import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IConseillers } from '../ts/interfaces/db.interfaces';

export default function (app: Application): Model<any> {
  const modelName = 'conseillers';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const schema = new Schema<IConseillers>(
    {
      idPG: { type: Number, required: true },

      password: { type: String },

      prenom: { type: String },

      nom: { type: String },

      email: { type: String },

      telephone: { type: String },

      distanceMax: { type: Number },

      disponible: { type: Boolean },

      dateDisponibilite: { type: Date },

      estDemandeurEmploi: { type: Boolean },

      estEnEmploi: { type: Boolean },

      estEnFormation: { type: Boolean },

      estDiplomeMedNum: { type: Boolean },

      nomDiplomeMedNum: { type: String },

      aUneExperienceMedNum: { type: Boolean },

      codePostal: { type: String },

      location: {
        type: { type: String },
        coordinates: { type: String },
      },

      nomCommune: { type: String },

      codeCommune: { type: String },

      codeDepartement: { type: String },

      codeRegion: { type: String },

      emailConfirmedAt: { type: Date },

      emailConfirmationKey: { type: String },

      unsubscribedAt: {
        type: Date,
        required: false,
      },

      unsubscribeExtras: { type: Object },

      userCreated: { type: Boolean },

      pix: {
        partage: { type: Boolean },
        datePartage: { type: Date },
        palier: { type: Number },
        competence1: { type: Boolean },
        competence2: { type: Boolean },
        competence3: { type: Boolean },
      },

      sondageToken: { type: String },

      sondageSentAt: {
        type: Date,
        required: false,
      },

      structureId: { type: 'ObjectId' },

      codeCom: {
        type: String,
        required: false,
      },

      mattermost: {
        error: { type: Boolean },
        login: {
          type: String,
        },
        id: { type: String },
        errorResetPassword: { type: Boolean },
        errorPatchLogin: { type: Boolean },
      },
      emailCN: {
        address: String,
        deleteMailboxCNError: { type: Boolean },
      },
      emailCNError: { type: Boolean },

      resetPasswordCNError: { type: Boolean },

      statut: { type: String },

      datePrisePoste: { type: Date },

      dateFinFormation: { type: Date },

      dateDeNaissance: { type: String },

      sexe: { type: String },

      historique: [Object],

      cv: {
        file: { type: String },
        extension: { type: String },
        date: { type: Date },
      },

      telephonePro: { type: Number },

      emailPro: { type: String },

      groupeCRA: { type: Number },

      mailProAModifier: { type: String },

      tokenChangementMailPro: { type: String },

      tokenChangementMailProCreatedAt: { type: Date },

      estCoordinateur: { type: Boolean },

      groupeCRAHistorique: [Object],
    },

    { strict: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
