"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);
function default_1(app) {
    const modelName = 'users';
    const mongooseClient = app.get('mongooseClient');
    const { DBRef } = mongoose.SchemaTypes;
    const schema = new mongooseClient.Schema({
        name: { type: String, unique: true, lowercase: true, required: true },
        password: { type: String },
        roles: [String],
        entity: { type: DBRef },
        token: { type: String },
        resend: { type: Boolean },
        mailAModifier: { type: String },
        mailConfirmError: { type: String },
        mailConfirmErrorDetail: { type: String },
        mailCoopSent: { type: Boolean },
        mailSentDate: { type: Date },
        tokenCreatedAt: { type: Date },
        passwordCreated: { type: Boolean },
    }, { strict: false });
    if (mongooseClient.modelNames().includes(modelName)) {
        mongooseClient.deleteModel(modelName);
    }
    return mongooseClient.model(modelName, schema);
}
exports.default = default_1;
