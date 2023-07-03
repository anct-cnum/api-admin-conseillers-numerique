import {
  invitationActiveCompte,
  invitationMultiRoleCompte,
  informationValidationCoselec,
} from '../emails';

const envoiEmailInvit = (app, req, mailer, user) => {
  const mailerInstance = mailer(app);
  const message = invitationActiveCompte(app, mailerInstance, req);
  return message.send(user);
};

const envoiEmailMultiRole = (app, mailer, user) => {
  const mailerInstance = mailer(app);
  const message = invitationMultiRoleCompte(mailerInstance);
  return message.send(user);
};

const envoiEmailInformationValidationCoselec = (app, mailer, user) => {
  const mailerInstance = mailer(app);
  const message = informationValidationCoselec(app, mailerInstance);
  return message.send(user);
};

export {
  envoiEmailInvit,
  envoiEmailMultiRole,
  envoiEmailInformationValidationCoselec,
};
