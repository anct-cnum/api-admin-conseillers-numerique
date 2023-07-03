/* eslint-disable no-bitwise */
import { Application } from '@feathersjs/express';
import { invitationActiveCompte, invitationMultiRoleCompte } from '../emails';
import { action } from '../helpers/accessControl/accessList';
import service from '../helpers/services';
import { IRequest } from '../ts/interfaces/global.interfaces';
import { PhaseConventionnement } from '../ts/enum';

/**
 * On cherche le bon coselec avec avis POSITIF :
 * 1/ Ce n'est pas forcément le dernier de toute la liste. Car parfois structure repassée
 *    en coselec avec un avis EXAMEN COMPLEMENTAIRE par ex.
 * 2/ Il peut y en avoir plusieurs, car le nombre de conseillers a pu être revu
 *    à la hausse depuis la dernière validation.
 *    Dans ce cas on prend le dernier (le plus récent)
 */
const getCoselecPositif = (structure) => {
  let coselecsPositifs = null;
  if ('coselec' in structure && structure.coselec !== null) {
    coselecsPositifs = structure.coselec.filter(
      (c) =>
        c.avisCoselec === 'POSITIF' &&
        c.phaseConventionnement === PhaseConventionnement.PHASE_2,
    );
    if (coselecsPositifs.length === 0) {
      coselecsPositifs = structure.coselec.filter(
        (c) =>
          c.avisCoselec === 'POSITIF' && c.phaseConventionnement === undefined,
      );
    }
  }
  // On prend le dernier
  return coselecsPositifs !== null && coselecsPositifs.length > 0
    ? coselecsPositifs.slice(-1).pop()
    : null;
};

const getCoselecPositifConventionnement = (structure) => {
  let coselecsPositifs = null;
  if ('coselec' in structure && structure.coselec !== null) {
    coselecsPositifs = structure.coselec.filter(
      (c) =>
        c.avisCoselec === 'POSITIF' && c.phaseConventionnement === undefined,
    );
  }
  // On prend le dernier
  return coselecsPositifs !== null && coselecsPositifs.length > 0
    ? coselecsPositifs.slice(-1).pop()
    : null;
};

/**
 * On cherche le dernier Coselec en fonction du numéro.
 * Le numéro est de la forme "COSELEC 2"
 */
const getLastCoselec = (structure) => {
  let coselecs = null;
  if ('coselec' in structure && structure.coselec !== null) {
    coselecs = structure.coselec.sort((a, b) =>
      a.numero !== null && b.numero !== null
        ? ~~a.numero.replace('COSELEC ', '') -
          ~~b.numero.replace('COSELEC ', '')
        : -1,
    );
  }
  return coselecs !== null && coselecs.length > 0
    ? coselecs.slice(-1).pop()
    : null;
};

/**
 * Si la structure a été validée, on récupère le bon coselec positif
 * Sinon, on récupère le dernier avis
 */
const getCoselec = (structure) => {
  if (structure.statut === 'VALIDATION_COSELEC') {
    return getCoselecPositif(structure);
  }
  return getLastCoselec(structure);
};

const getCoselecConventionnement = (structure) => {
  if (structure.statut === 'VALIDATION_COSELEC') {
    return getCoselecPositifConventionnement(structure);
  }
  return getLastCoselec(structure);
};

const deleteUser = async (app: Application, req: IRequest, email: string) => {
  await app
    .service(service.users)
    .Model.accessibleBy(req.ability, action.delete)
    .deleteOne({ name: email.toLowerCase() });
};

const deleteRoleUser = async (
  app: Application,
  req: IRequest,
  email: string,
  query: object,
) => {
  await app
    .service(service.users)
    .Model.accessibleBy(req.ability, action.update)
    .updateOne({ name: email.toLowerCase() }, query);
};

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

const formatDateGMT = (date: Date) => {
  const dateTodayTimezoneParis = new Date(
    new Date().toLocaleString('en', { timeZone: 'Europe/Paris' }),
  );
  const dateTodayTimezoneUTC = new Date(
    new Date().toLocaleString('en', { timeZone: 'UTC' }),
  );
  const offsetTimezone =
    dateTodayTimezoneParis.getTime() - dateTodayTimezoneUTC.getTime();

  return new Date(date.getTime() + offsetTimezone);
};

export {
  getCoselecPositif,
  getCoselecConventionnement,
  getLastCoselec,
  getCoselec,
  deleteUser,
  envoiEmailInvit,
  deleteRoleUser,
  envoiEmailMultiRole,
  formatDateGMT,
};
