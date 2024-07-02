import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IConseillers } from '../ts/interfaces/db.interfaces';

export default function (app: Application): Model<any> {
  const modelName = 'conseillers';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const pixSchema = new Schema(
    {
      partage: Boolean,
      datePartage: Date,
      palier: Number,
      competence1: Boolean,
      competence2: Boolean,
      competence3: Boolean,
    },
    { _id: false, strict: false },
  );

  const cvSchema = new Schema(
    {
      file: String,
      extension: String,
      date: Date,
    },
    { _id: false, strict: false },
  );

  const mattermostSchema = new Schema(
    {
      error: Boolean,
      id: String,
      login: String,
      hubJoined: Boolean,
      errorResetPassword: Boolean,
    },
    { _id: false, strict: false },
  );

  const supHierarchiqueSchema = new Schema(
    {
      email: String,
      nom: String,
      prenom: String,
      numeroTelephone: String,
      fonction: String,
    },
    { _id: false, strict: false },
  );

  const locationSchema = new Schema(
    {
      type: String,
      coordinates: [Number],
    },
    { _id: false, strict: false },
  );

  const groupeCRAHistoriqueSchema = new Schema(
    {
      numero: Number,
      dateDeChangement: Date,
      nbJourDansGroupe: Number,
    },
    { _id: false, strict: false },
  );

  const coordinateurSchema = new Schema(
    {
      id: { type: 'ObjectId' },
      nom: String,
      prenom: String,
    },
    { _id: false, strict: false },
  );

  const ruptureSchema = new Schema(
    {
      structureId: { type: 'ObjectId' },
      dateRupture: Date,
      motifRupture: String,
    },
    { _id: false, strict: false },
  );

  const historiqueSchema = new Schema(
    {
      data: Object,
      date: Date,
    },
    { _id: false, strict: false },
  );

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

      location: { type: locationSchema },

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

      pix: { type: pixSchema },

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

      mattermost: { type: mattermostSchema },

      emailCN: { type: Object },

      emailCNError: { type: Boolean },

      resetPasswordCNError: { type: Boolean },

      statut: { type: String },

      datePrisePoste: { type: Date },

      dateFinFormation: { type: Date },

      dateDeNaissance: { type: Date },

      sexe: { type: String },

      certificationPixFormation: { type: Boolean },

      historique: { type: [historiqueSchema], default: undefined },

      cv: { type: cvSchema },

      telephonePro: { type: Number },

      emailPro: { type: String },

      groupeCRA: { type: Number },

      mailProAModifier: { type: String },

      tokenChangementMailPro: { type: String },

      codeDepartementStructure: { type: String },

      codeRegionStructure: { type: String },

      tokenChangementMailProCreatedAt: { type: Date },

      estCoordinateur: { type: Boolean },

      listeSubordonnes: { type: Object },

      coordinateurs: { type: [coordinateurSchema], default: undefined },

      hasPermanence: { type: Boolean },

      groupeCRAHistorique: {
        type: [groupeCRAHistoriqueSchema],
        default: undefined,
      },

      ruptures: { type: [ruptureSchema], default: undefined },

      supHierarchique: { type: supHierarchiqueSchema },

      inactivite: { type: Boolean },
    },

    { strict: false, versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
