module.exports = function (app) {
  const modelName = 'structures';
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const schema = new Schema({
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
      structure: { type: String },
      coordinates: { type: String },
    },

    nomCommune: { type: String },

    codeCommune: { type: String },

    codeDepartement: { type: String },

    codeRegion: { type: String },

    emailConfirmedAt: { type: Date },

    emailConfirmationKey: { type: String },

    unsubscribedAt: { type: Date },

    unsubscribeExtras: {
      type: Object,
      structure: {},
    },

    createdAt: { type: Date },

    updatedAt: { type: Date },

    validatedAt: { type: Date },

    importedAt: { type: Date },

    deleted_at: { type: Date },

    userCreated: { type: Boolean },

    coselecAt: { type: Date },
  });

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
};
