/* eslint-disable prefer-template */
import { Application } from '@feathersjs/express';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessReadRequestConseillers = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.conseillers)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const filterNomConseiller = (nom: string) => {
  return nom
    ? { 'conseillerObj.nom': { $regex: `(?'name'${nom}.*$)`, $options: 'i' } }
    : {};
};

const filterNomStructure = (nom: string) => {
  return nom
    ? { 'structureObj.nom': { $regex: `(?'name'${nom}.*$)`, $options: 'i' } }
    : {};
};

const filterRegion = (region: string) =>
  region ? { 'conseillerObj.codeRegion': region } : {};

const filterIsCoordinateur = (coordinateur: string) => {
  if (coordinateur === 'true') {
    return { 'conseillerObj.estCoordinateur': { $eq: true } };
  }
  if (coordinateur === 'false') {
    return { 'conseillerObj.estCoordinateur': { $exists: false } };
  }

  return {};
};

const filterIsRupture = (rupture: string) => {
  if (rupture && rupture !== 'contrat') {
    return { statut: { $eq: rupture } };
  }
  if (rupture === 'contrat') {
    return { statut: { $eq: 'finalisee' } };
  }
  return {
    statut: { $in: ['finalisee_rupture', 'nouvelle_rupture', 'finalisee'] },
  };
};

export {
  checkAccessReadRequestConseillers,
  filterIsCoordinateur,
  filterNomConseiller,
  filterNomStructure,
  filterIsRupture,
  filterRegion,
};
