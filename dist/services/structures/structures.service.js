"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Initializes the `structures` service on path `/structures`
const { Structures } = require('./structures.class');
const createModel = require('../../models/structures.model');
const hooks = require('./structures.hooks');
function default_1(app) {
    const options = {
        Model: createModel(app),
        paginate: app.get('paginate'),
    };
    // Initialize our service with any options it requires
    app.use('/structures', new Structures(options, app));
    // Get our initialized service so that we can register hooks
    const service = app.service('structures');
    service.hooks(hooks);
}
exports.default = default_1;
