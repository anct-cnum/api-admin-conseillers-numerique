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

      location: { type: Object },

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

      pix: { type: Object },

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

      mattermost: { type: Object },

      emailCN: { type: Object },

      emailCNError: { type: Boolean },

      resetPasswordCNError: { type: Boolean },

      statut: { type: String },

      datePrisePoste: { type: Date },

      dateFinFormation: { type: Date },

      dateDeNaissance: { type: Date },

      sexe: { type: String },

      historique: { type: [Object], default: undefined },

      cv: { type: Object },

      telephonePro: { type: Number },

      emailPro: { type: String },

      groupeCRA: { type: Number },

      mailProAModifier: { type: String },

      tokenChangementMailPro: { type: String },

      tokenChangementMailProCreatedAt: { type: Date },

      estCoordinateur: { type: Boolean },

      groupeCRAHistorique: { type: [Object], default: undefined },

      inactivite: { type: Boolean },
    },

    { strict: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
