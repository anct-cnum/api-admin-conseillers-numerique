import { Model, Mongoose } from 'mongoose';
import { Application } from '../declarations';
import { IConseillersSupprimes } from '../ts/interfaces/db.interfaces';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

dbref.install(mongoose);

export default function (app: Application): Model<any> {
  const modelName = 'conseillersSupprimes';
  const mongooseClient: Mongoose = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const historiqueContratsSchema = new Schema(
    {
      conseillerId: { type: 'ObjectId' },
      structureId: { type: 'ObjectId' },
      dateRecrutement: Date,
      dateDebutDeContrat: Date,
      dateFinDeContrat: Date,
      typeDeContrat: String,
      reconventionnement: Boolean,
      phaseConventionnement: String,
      miseEnRelationReconventionnement: { type: 'ObjectId' },
      miseEnRelationConventionnement: { type: 'ObjectId' },
      dateRupture: Date,
      motifRupture: String,
    },
    { _id: false, strict: false },
  );

  const schema = new Schema<IConseillersSupprimes>(
    {
      motif: { type: String },
      conseiller: { type: Object },
      actionUser: { type: Object },
      historiqueContrats: { type: [historiqueContratsSchema] },
      deletedAt: { type: Date },
    },
    { strict: false, collection: 'conseillersSupprimes', versionKey: false },
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
}
