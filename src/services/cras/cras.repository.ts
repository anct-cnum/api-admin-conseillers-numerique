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

const getConseillersIdsByStructure = async (
  idStructure: ObjectId,
  app: Application,
) => {
  const miseEnRelations = await app.service(service.misesEnRelation).Model.find(
    {
      'structure.$id': idStructure,
      statut: { $in: ['finalisee', 'finalisee_rupture', 'nouvelle_rupture'] },
    },
    {
      'conseillerObj._id': 1,
      _id: 0,
    },
  );
  const conseillerIds = [];
  miseEnRelations.forEach((miseEnRelation) => {
    conseillerIds.push(miseEnRelation?.conseillerObj._id);
  });
  return conseillerIds;
};

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
          individuel: { $sum: '$cra.accompagnement.individuel' },
          atelier: { $sum: '$cra.accompagnement.atelier' },
          redirection: { $sum: '$cra.accompagnement.redirection' },
        },
      },
      {
        $project: {
          total: { $add: ['$individuel', '$atelier', '$redirection'] },
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
          $and: [checkAccess],
        },
      },
      {
        $group: {
          _id: { ville: '$cra.nomCommune', codePostal: '$cra.codePostal' },
        },
      },
    ]);

const createArrayForFiltreCodePostaux = (
  listCodePostaux: Array<{ _id: { ville: string; codePostal: string } }>,
) => {
  const listeDefinitive: Array<{ id: string; codePostal: string[] }> = [];
  listCodePostaux.forEach((paire) => {
    if (
      listeDefinitive.findIndex((item) => item.id === paire._id.codePostal) > -1
    ) {
      listeDefinitive
        .find((item) => item.id === paire._id.codePostal)
        .codePostal.push(`${paire._id.codePostal} - ${paire._id.ville}`);
    } else {
      listeDefinitive.push({
        id: paire._id.codePostal,
        codePostal: [`${paire._id.codePostal} - ${paire._id.ville}`],
      });
    }
  });

  listeDefinitive.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

  return listeDefinitive;
};

export {
  checkAccessRequestCras,
  getConseillersIdsByStructure,
  getConseillersIdsByTerritoire,
  getCodesPostauxStatistiquesCras,
  getNombreCras,
  getNombreCrasByStructureId,
  getNombreAccompagnementsByStructureId,
  createArrayForFiltreCodePostaux,
};
