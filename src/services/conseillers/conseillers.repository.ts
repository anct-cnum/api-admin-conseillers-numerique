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

const filterNomConseiller = (nom: string) => {
  return nom ? { nom: { $regex: `(?'name'${nom}.*$)`, $options: 'i' } } : {};
};

const filterNomStructure = (nom: string) => {
  if (nom) {
    return [
      {
        $match: {
          nom: { $regex: `(?'name'${nom}.*$)`, $options: 'i' },
        },
      },
      { $match: { $expr: { $eq: ['$$idStructure', '$_id'] } } },
    ];
  }
  return [{ $match: { $expr: { $eq: ['$$idStructure', '$_id'] } } }];
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
  if (rupture && rupture !== 'no_rupture') {
    return { statut: { $eq: rupture } };
  }
  if (rupture && rupture === 'no_rupture') {
    return { statut: { $nin: ['finalisee_rupture', 'nouvelle_rupture'] } };
  }
  return {};
};

export {
  checkAccessReadRequestConseillers,
  filterIsCoordinateur,
  filterNomConseiller,
  filterNomStructure,
  filterIsRupture,
  filterRegion,
  filterStructure,
};
