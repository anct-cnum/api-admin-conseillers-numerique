const { ForbiddenError } = require('@casl/ability');

const mailSendingPermission = (ability) =>
  ForbiddenError.from(ability)
    .setMessage('Accès à l\'envoi de mails refusé')
    .throwUnlessCan('send', 'email');

module.exports = { mailSendingPermission };
