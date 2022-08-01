"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const accessList_1 = require("../accessList");
function structureRules(user, can) {
    can([accessList_1.action.read, accessList_1.action.update], accessList_1.ressource.users, {
        'entity.$id': user === null || user === void 0 ? void 0 : user.entity.oid,
    });
    can(accessList_1.action.send, accessList_1.functionnality.email);
}
exports.default = structureRules;
