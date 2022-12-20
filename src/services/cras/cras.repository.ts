import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessRequestCras = async (app: Application, req: IRequest) =>
  app
    .service(service.cras)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const getConseillersIdsByStructure = async (idStructure, app) => {
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

const getNombreAccompagnementsByArrayConseillerId =
  (app: Application, checkAccess) => async (conseillersIds: ObjectId[]) =>
    app.service(service.cras).Model.aggregate([
      {
        $match: {
          'conseiller.$id': { $in: conseillersIds },
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

const getNombreCrasByArrayConseillerId =
  (app: Application, req: IRequest) => async (conseillersIds: ObjectId[]) =>
    app
      .service(service.cras)
      .Model.accessibleBy(req.ability, action.read)
      .countDocuments({
        'conseiller.$id': { $in: conseillersIds },
      });

const getConseillersIdsByTerritoire = async (type, idType, app) => {
  const conseillersIds = [];
  const query = {
    [type]: idType,
  };

  const structures: IStructures[] = await app
    .service(service.structures)
    .Model.find(query);
  const promises = [];

  structures?.forEach((structure) => {
    // eslint-disable-next-line
    const p = new Promise(async (resolve) => {
      const conseillersStructure = await app
        .service(service.conseillers)
        .Model.find({
          structureId: structure._id,
        });
      if (conseillersStructure.length > 0) {
        conseillersStructure?.forEach((conseiller) => {
          conseillersIds.push(conseiller._id);
        });
      }
      resolve(conseillersIds);
    });
    promises.push(p);
  });

  await Promise.all(promises);
  return conseillersIds;
};

const getCodesPostauxStatistiquesCras =
  (app, checkAccess) => async (conseillersId) =>
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

export {
  checkAccessRequestCras,
  getConseillersIdsByStructure,
  getConseillersIdsByTerritoire,
  getCodesPostauxStatistiquesCras,
  getNombreCras,
  getNombreCrasByArrayConseillerId,
  getNombreAccompagnementsByArrayConseillerId,
};
