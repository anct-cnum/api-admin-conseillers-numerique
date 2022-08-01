"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// const { ForbiddenError } = require('@casl/ability') ;
const verifyPermissions_1 = __importDefault(require("../../../helpers/accessControl/verifyPermissions"));
const getAccessibleDataAggregate = (app) => async (req, res) => {
    try {
        (0, verifyPermissions_1.default)(req.ability);
        console.log('mail sent');
    }
    catch (error) {
        res.status(401).json(error.message);
    }
    const query = await app
        .service('users')
        .Model.accessibleBy(req.ability)
        .getQuery();
    const users = await app.service('users').Model.aggregate([
        {
            $match: {
                $and: [query],
            },
        },
        { $project: { name: 1, roles: 1 } },
    ]);
    res.status(200).json(users);
};
exports.default = getAccessibleDataAggregate;
