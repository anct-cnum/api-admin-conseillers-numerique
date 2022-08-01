"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schemas = exports.ValidateJoi = void 0;
const joi_1 = __importDefault(require("joi"));
const ValidateJoi = (schema) => {
    // eslint-disable-next-line consistent-return
    return async (req, res, next) => {
        try {
            await schema.validateAsync(req.body);
            next();
        }
        catch (error) {
            return res.status(422).json({ error });
        }
    };
};
exports.ValidateJoi = ValidateJoi;
exports.Schemas = {
    author: {
        create: joi_1.default.object({
            name: joi_1.default.string().required(),
        }),
        update: joi_1.default.object({
            name: joi_1.default.string().required(),
        }),
    },
};
