"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feathers_mongoose_1 = require("feathers-mongoose");
const express_1 = require("@feathersjs/express");
const getAccessibleData_1 = __importDefault(require("./controllers/getAccessibleData"));
const getAccessibleDataAggregate_1 = __importDefault(require("./controllers/getAccessibleDataAggregate"));
const updateAccessibleData_1 = __importDefault(require("./controllers/updateAccessibleData"));
const createAbilities_1 = __importDefault(require("../../middleware/createAbilities"));
class Users extends feathers_mongoose_1.Service {
    constructor(options, app) {
        super(options);
        app.get('/custom-route-get', (0, express_1.authenticate)('jwt'), createAbilities_1.default, (0, getAccessibleData_1.default)(app));
        app.get('/custom-route-get-aggregate', (0, express_1.authenticate)('jwt'), createAbilities_1.default, (0, getAccessibleDataAggregate_1.default)(app));
        app.patch('/custom-route-update/:id', (0, express_1.authenticate)('jwt'), createAbilities_1.default, (0, updateAccessibleData_1.default)(app));
    }
}
exports.default = Users;
