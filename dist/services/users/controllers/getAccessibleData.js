"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const verifyPermissions_1 = __importDefault(require("../../../helpers/accessControl/verifyPermissions"));
const getAccessibleData = (app) => async (req, res) => {
    try {
        (0, verifyPermissions_1.default)(req.ability);
        console.log('passed');
    }
    catch (error) {
        res.status(401).json(error.message);
    }
    try {
        const user = await app
            .service('users')
            .Model.accessibleBy(req.ability, 'read');
        res.json(user);
    }
    catch (error) {
        res.status(401).json(error.message);
    }
};
exports.default = getAccessibleData;
