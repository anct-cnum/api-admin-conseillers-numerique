"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ability_1 = require("@casl/ability");
const rules_1 = require("../helpers/accessControl/rules");
function defineAbilitiesFor(user, role) {
    const { can, cannot, build } = new ability_1.AbilityBuilder(ability_1.Ability);
    switch (role) {
        case 'superAdmin':
            (0, rules_1.superAdminRules)(can);
            break;
        case 'admin':
            (0, rules_1.adminRules)(can);
            break;
        case 'structure':
            (0, rules_1.structureRules)(user, can);
            break;
        default:
            break;
    }
    cannot('delete', 'users', { activated: true });
    return build();
}
const ANONYMOUS_ABILITY = defineAbilitiesFor(null, null);
function createAbilities(req, res, next) {
    var _a;
    req.ability = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.name)
        ? defineAbilitiesFor(req.user, req.body.roleActivated)
        : ANONYMOUS_ABILITY;
    next();
}
exports.default = createAbilities;
