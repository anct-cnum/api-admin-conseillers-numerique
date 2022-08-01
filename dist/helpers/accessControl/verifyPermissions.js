"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ability_1 = require("@casl/ability");
const mailSendingPermission = (ability) => ability_1.ForbiddenError.from(ability)
    .setMessage("Accès à l'envoi de mails refusé")
    .throwUnlessCan('send', 'email');
exports.default = mailSendingPermission;
