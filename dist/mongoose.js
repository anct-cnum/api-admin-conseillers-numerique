"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("@casl/mongoose");
const mongoose_2 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("./logger"));
mongoose_2.default.plugin(mongoose_1.accessibleRecordsPlugin);
if (process.env.NODE_ENV === 'development') {
    mongoose_2.default.set('debug', true);
}
function default_1(app) {
    mongoose_2.default.connect(app.get('mongodb')).catch((err) => {
        logger_1.default.error(err);
        process.exit(1);
    });
    app.set('mongooseClient', mongoose_2.default);
}
exports.default = default_1;
