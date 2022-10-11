/* eslint-disable prefer-template */
import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
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

const filterNom = (nom: string) => {
  return nom ? { nom: { $regex: `(?'name'${nom}.*$)`, $options: 'i' } } : {};
};

const filterRegion = (region: string) => (region ? { codeRegion: region } : {});

const filterStructure = (structure: string) =>
  structure ? { structureId: new ObjectId(structure) } : {};

const filterIsCoordinateur = (coordinateur: string) => {
  if (coordinateur === 'true') {
    return { estCoordinateur: { $eq: true } };
  }
  if (coordinateur === 'false') {
    return { estCoordinateur: { $exists: false } };
  }

  return {};
};

const filterIsRupture = (rupture: string) => {
  if (rupture === 'true') {
    return { $expr: { $eq: ['$statut', 'nouvelle_rupture'] } };
  }
  if (rupture === 'false') {
    return { $expr: { $eq: ['$statut', 'finalisee'] } };
  }
  return {
    $or: [
      { $expr: { $eq: ['$statut', 'nouvelle_rupture'] } },
      { $expr: { $eq: ['$statut', 'finalisee'] } },
    ],
  };
};

export {
  checkAccessReadRequestConseillers,
  filterIsCoordinateur,
  filterNom,
  filterIsRupture,
  filterRegion,
  filterStructure,
};
