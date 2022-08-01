"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminRules = exports.structureRules = exports.adminRules = void 0;
const adminRules_1 = __importDefault(require("./adminRules"));
exports.adminRules = adminRules_1.default;
const structureRules_1 = __importDefault(require("./structureRules"));
exports.structureRules = structureRules_1.default;
const superAdminRules_1 = __importDefault(require("./superAdminRules"));
exports.superAdminRules = superAdminRules_1.default;
