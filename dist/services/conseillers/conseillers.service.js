"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Initializes the `conseillers` service on path `/conseillers`
const conseillers_model_1 = __importDefault(require("../../models/conseillers.model"));
const { Conseillers } = require('./conseillers.class');
const hooks = require('./conseillers.hooks');
function default_1(app) {
    const options = {
        Model: (0, conseillers_model_1.default)(app),
        paginate: app.get('paginate'),
    };
    // Initialize our service with any options it requires
    app.use('/conseillers', new Conseillers(options, app));
    // Get our initialized service so that we can register hooks
    const service = app.service('conseillers');
    service.hooks(hooks);
}
exports.default = default_1;
