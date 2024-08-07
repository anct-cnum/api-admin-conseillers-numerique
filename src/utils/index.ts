import { Application } from '@feathersjs/express';
import { action } from '../helpers/accessControl/accessList';
import service from '../helpers/services';
import { IRequest } from '../ts/interfaces/global.interfaces';
import { PhaseConventionnement } from '../ts/enum';
import { IStructures } from '../ts/interfaces/db.interfaces';

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

const getCoselecPositifConventionnementInitial = (structure: IStructures) => {
  if (structure.statut === 'VALIDATION_COSELEC') {
    // récupérer le premier coselec positif de la structure (conventionnement initial)
    const coselecs = structure.coselec
      .filter(
        (coselec) =>
          coselec.nombreConseillersCoselec > 0 &&
          coselec.avisCoselec === 'POSITIF',
      )
      .sort((a, b) => a.insertedAt.getTime() - b.insertedAt.getTime());

    return coselecs.length > 0 ? coselecs[0] : null;
  }
  return null;
};

const getCoselecPositifAvantAbandon = (structure: IStructures) => {
  // récupérer le dernier coselec positif de la structure avant l'abandon
  if (structure?.coselec?.length > 0) {
    const coselecs = structure.coselec
      .filter(
        (coselec) =>
          coselec.nombreConseillersCoselec > 0 &&
          coselec.avisCoselec === 'POSITIF',
      )
      .sort((a, b) => b.insertedAt.getTime() - a.insertedAt.getTime());

    return coselecs.length > 0 ? coselecs[0] : null;
  }
  return null;
};

/**
 * On prend le dernier Coselec
 */
const getLastCoselec = (structure) =>
  structure?.coselec !== null && structure.coselec?.length > 0
    ? structure.coselec.slice(-1).pop()
    : null;

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

const getCoselecLabel = (structure) => {
  return structure?.numero || 'Non rensigné';
};

const getCoselecConventionnement = (structure) => {
  if (structure.statut === 'VALIDATION_COSELEC') {
    return getCoselecPositifConventionnement(structure);
  }
  return getLastCoselec(structure);
};

const getTimestampByDate = (date?: Date) =>
  date instanceof Date ? date.getTime() : 0;

const deleteUser = async (app: Application, req: IRequest, email: string) => {
  await app
    .service(service.users)
    .Model.accessibleBy(req.ability, action.delete)
    .deleteOne({ name: email.toLowerCase() });
};
const pullRoleHubUser = async (
  app: Application,
  req: IRequest,
  email: string,
) => {
  await app
    .service(service.users)
    .Model.accessibleBy(req.ability, action.update)
    .updateOne({ name: email.toLowerCase() }, { $pull: { roles: 'hub' } });
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
  getCoselecPositifConventionnementInitial,
  getCoselecPositifAvantAbandon,
  deleteUser,
  pullRoleHubUser,
  deleteRoleUser,
  formatDateGMT,
  getTimestampByDate,
  getCoselecLabel,
};
