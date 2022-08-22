import { ForbiddenError } from '@casl/ability';

const mailSendingPermission = (ability) =>
  ForbiddenError.from(ability)
    .setMessage("Accès à l'envoi de mails refusé")
    .throwUnlessCan('send', 'email');

const exportsCnfsHubPermission = (ability) =>
  ForbiddenError.from(ability)
    .setMessage("Accès à l'export des cnfs pour les hubs refusé")
    .throwUnlessCan('read', 'exportHub');

export { mailSendingPermission, exportsCnfsHubPermission };
