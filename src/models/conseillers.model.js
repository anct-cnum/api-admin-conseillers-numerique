module.exports = function (app) {
  const modelName = 'conseillers';
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const schema = new Schema(
    {
      idPG: { type: Number, required: true },

      password: { type: String },

      prenom: { type: String },

      nom: { type: String },

      email: { type: String },

      telephone: { type: String },

      roles: { type: Array },

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
        structure: { type: String },
        coordinates: { type: String },
      },

      // entity: { type: Mixed },

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

      unsubscribeExtras: {
        // structure: {},
      },

      userCreated: { type: Boolean },

      pix: {
        structure: {
          partage: { type: Boolean },
          datePartage: { type: Date },
          palier: { type: Number },
          competence1: { type: Boolean },
          competence2: { type: Boolean },
          competence3: { type: Boolean },
        },
      },

      sondageToken: { type: String },

      sondageSentAt: {
        type: Date,
        required: false,
      },

      structureId: {
        foreignKey: true,
        references: String,
        key: true,
        type: Object,
      },

      token: { type: String },

      mailSentDate: {
        ype: Date,
      },

      passwordCreated: { type: Boolean },

      resend: { type: Boolean },

      tokenCreatedAt: {
        type: Date,
        required: false,
      },

      mailAModifier: { type: String },

      mailCoopSent: { type: Boolean },

      codeCom: {
        type: Date,
        required: false,
      },

      mattermost: {
        structure: {
          error: { type: Boolean },
          login: {
            type: String,
          },
          id: { type: String },
          errorResetPassword: { type: Boolean },
          errorPatchLogin: { type: Boolean },
        },
      },

      emailCN: {
        structure: {
          address: {
            type: String,
          },
          deleteMailboxCNError: {
            type: Boolean,
          },
        },
      },

      emailCNError: { type: Boolean },

      resetPasswordCNError: { type: Boolean },

      statut: { type: String },

      datePrisePoste: { type: Date },

      dateFinFormation: { type: Date },

      dateDeNaissance: { type: String },

      sexe: { type: String },

      historique: { type: Array },

      cv: {
        structure: {
          file: { type: String },
          extension: { type: String },
          date: { type: Date },
        },
      },

      telephonePro: { type: Number },

      emailPro: { type: String },

      groupeCRA: { type: Number },

      mailProAModifier: { type: String },

      tokenChangementMailPro: { type: String },

      tokenChangementMailProCreatedAt: { type: Date },

      estCoordinateur: { type: Boolean },

      groupeCRAHistorique: { type: Array },
    },

    {
      timestamps: true,
    },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
};
