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

  const contactSchema = new Schema(
    {
      prenom: String,
      nom: String,
      fonction: String,
      email: String,
      telephone: String,
    },
    { _id: false, strict: false },
  );

  const conventionnementSchema = new Schema(
    {
      statut: String,
      dossierConventionnement: Object,
      dossierReconventionnement: Object,
      motif: String,
    },
    { _id: false, strict: false },
  );

  const demandeCoselecSchema = new Schema(
    {
      id: { type: 'ObjectId' },
      nombreDePostesSouhaites: Number,
      motif: String,
      emetteurAvenant: Object,
      type: String,
      statut: String,
      banniereValidationAvenant: Boolean,
      phaseConventionnement: String,
      nombreDePostesAccordes: Number,
      nombreDePostesRendus: Number,
    },
    { _id: false, strict: false },
  );

  const demandeCoordinateurSchema = new Schema(
    {
      id: { type: 'ObjectId' },
      dossier: Object,
      avisPrefet: String,
      statut: String,
    },
    { _id: false, strict: false },
  );

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

      location: { type: Object },

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

      contact: { type: contactSchema },

      coordonneesInsee: { type: Object },

      adresseInsee2Ban: { type: Object },

      conventionnement: { type: conventionnementSchema },

      demandesCoselec: { type: [demandeCoselecSchema], default: undefined },

      demandesCoordinateur: {
        type: [demandeCoordinateurSchema],
        default: undefined,
      },
    },
    { strict: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
