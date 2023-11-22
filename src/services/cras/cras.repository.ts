import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessRequestCras = async (app: Application, req: IRequest) =>
  app
    .service(service.cras)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const getNombreCras =
  (app: Application, req: IRequest) => async (conseillerId: ObjectId) =>
    app
      .service(service.cras)
      .Model.accessibleBy(req.ability, action.read)
      .countDocuments({
        'conseiller.$id': conseillerId,
      });

const getNombreAccompagnementsByStructureId =
  (app: Application, checkAccess) => async (structureId: ObjectId) =>
    app.service(service.cras).Model.aggregate([
      {
        $match: {
          'structure.$id': { $eq: structureId },
          $and: [checkAccess],
        },
      },
      {
        $group: {
          _id: null,
          nbParticipants: { $sum: '$cra.nbParticipants' },
          nbParticipantsRecurrents: { $sum: '$cra.nbParticipantsRecurrents' },
        },
      },
      {
        $project: {
          total: {
            $subtract: ['$nbParticipants', '$nbParticipantsRecurrents'],
          },
        },
      },
    ]);

const getNombreCrasByStructureId =
  (app: Application, req: IRequest) => async (structureId: ObjectId) =>
    app
      .service(service.cras)
      .Model.accessibleBy(req.ability, action.read)
      .countDocuments({
        'structure.$id': { $eq: structureId },
      });

const getConseillersIdsByTerritoire = async (dateFin, type, idType, app) => {
  const query = {
    date: dayjs(dateFin).format('DD/MM/YYYY'),
    [type]: idType,
  };
  const conseillersIds = await app
    .service(service.statsTerritoires)
    .Model.find(query)
    .distinct('conseillerIds');
  return conseillersIds;
};

const getCodesPostauxStatistiquesCras =
  (app, checkAccess) => async (conseillersId: ObjectId[]) =>
    app.service(service.cras).Model.aggregate([
      {
        $match: {
          'conseiller.$id': { $in: conseillersId },
          'cra.codeCommune': { $ne: null },
          $and: [checkAccess],
        },
      },
      {
        $group: {
          _id: '$cra.codePostal',
          villes: { $addToSet: '$cra.nomCommune' },
          codeCommune: {
            $addToSet: {
              ville: '$cra.nomCommune',
              codeCommune: '$cra.codeCommune',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          id: '$_id',
          villes: '$villes',
          codeCommune: '$codeCommune',
        },
      },
    ]);
const getCodesPostauxStatistiquesCrasByStructure =
  (app, checkAccess) => async (structureId: ObjectId) =>
    app.service(service.cras).Model.aggregate([
      {
        $match: {
          'structure.$id': { $eq: structureId },
          'cra.codeCommune': { $ne: null },
          $and: [checkAccess],
        },
      },
      {
        $group: {
          _id: '$cra.codePostal',
          villes: { $addToSet: '$cra.nomCommune' },
          codeCommune: {
            $addToSet: {
              ville: '$cra.nomCommune',
              codeCommune: '$cra.codeCommune',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          id: '$_id',
          villes: '$villes',
          codeCommune: '$codeCommune',
        },
      },
    ]);

const createArrayForFiltreCodePostaux = (
  listCodePostaux: Array<{
    id: string;
    villes: string[];
    codeCommune: Array<{ ville: string; codeCommune: string[] }>;
  }>,
) => {
  const liste = listCodePostaux.map((e) => {
    const removeDoublon = [
      ...new Map(
        e.codeCommune.map((item) => [item.codeCommune, item]),
      ).values(),
    ];
    return {
      ...e,
      villes: removeDoublon.map((i) => i.ville),
      codeCommune: removeDoublon,
    };
  });
  return liste;
};

export {
  checkAccessRequestCras,
  getCodesPostauxStatistiquesCrasByStructure,
  getConseillersIdsByTerritoire,
  getCodesPostauxStatistiquesCras,
  getNombreCras,
  getNombreCrasByStructureId,
  getNombreAccompagnementsByStructureId,
  createArrayForFiltreCodePostaux,
};
