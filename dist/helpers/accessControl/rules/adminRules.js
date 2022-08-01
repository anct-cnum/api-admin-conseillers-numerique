"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const accessList_1 = require("../accessList");
function adminRules(can) {
    can(accessList_1.action.manage, accessList_1.ressource.all);
}
exports.default = adminRules;
