"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const users_service_1 = __importDefault(require("./users/users.service"));
// import structures from './structures/structures.service';
// import conseillers from './conseillers/conseillers.service';
// eslint-disable-next-line no-unused-vars
function default_1(app) {
    app.configure(users_service_1.default);
    // app.configure(structures);
    // app.configure(conseillers);
}
exports.default = default_1;
