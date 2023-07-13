/* eslint-disable prefer-const */
import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { action, functionnality, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { IStructuresConseillers } from '../../../ts/interfaces/global.interfaces';
import service from '../../services';
import {
  findDepartementOrRegion,
  findNumDepartementsByRegion,
} from '../../commonQueriesFunctions';
import { IHub } from '../../../ts/interfaces/json.interface';

const getStructureAndConseillerByDepartement = async (
  app: Application,
  departementsHub: Array<string>,
) => {
  let structureAndConseillers: IStructuresConseillers[];
  try {
    structureAndConseillers = await app
      .service(service.structures)
      .Model.aggregate([
        {
          $match: {
            codeDepartement: { $in: departementsHub },
          },
        },
        {
          $lookup: {
            from: 'conseillers',
            let: { idStructure: '$_id' },
            as: 'conseiller',
            pipeline: [
              {
                $match: {
                  $and: [
                    { $expr: { $eq: ['$$idStructure', '$structureId'] } },
                    { $expr: { $eq: ['$statut', 'RECRUTE'] } },
                  ],
                },
              },
            ],
          },
        },
        {
          $group: { _id: '$_id', conseiller: { $addToSet: '$conseiller._id' } },
        },
        { $unwind: '$conseiller' },
      ]);
    return structureAndConseillers;
  } catch (error) {
    throw new Error(error);
  }
};

const getStructureAndConseillerByDepartementHubAntillesGuyane = async (
  app: Application,
  departementsHub: Array<string>,
) => {
  try {
    let structureAndConseillers: IStructuresConseillers[];
    structureAndConseillers = app.service(service.structures).Model.aggregate([
      {
        $match: {
          $or: [
            { codeDepartement: { $in: departementsHub } },
            {
              $and: [
                { codeCom: { $eq: '978' } },
                { codeDepartement: { $eq: '00' } },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'conseillers',
          let: { idStructure: '$_id' },
          as: 'conseiller',
          pipeline: [
            {
              $match: {
                $and: [
                  { $expr: { $eq: ['$$idStructure', '$structureId'] } },
                  { $expr: { $eq: ['$statut', 'RECRUTE'] } },
                ],
              },
            },
          ],
        },
      },
      { $group: { _id: '$_id', conseiller: { $addToSet: '$conseiller._id' } } },
      { $unwind: '$conseiller' },
    ]);
    return structureAndConseillers;
  } catch (error) {
    throw new Error(error);
  }
};

export default async function hubRules(
  app: Application,
  user: IUser,
  can: any,
) {
  const hub: IHub = findDepartementOrRegion(user?.hub);

  let conseillersAndStructures: IStructuresConseillers[];
  let conseillersIds: ObjectId[];
  let structuresIds: ObjectId[];

  if (hub?.region_names) {
    const departementsList = findNumDepartementsByRegion(hub.region_names);
    conseillersAndStructures = await getStructureAndConseillerByDepartement(
      app,
      departementsList,
    );
  } else if (hub.name === 'Hub Antilles-Guyane') {
    conseillersAndStructures =
      await getStructureAndConseillerByDepartementHubAntillesGuyane(
        app,
        hub.departements,
      );
  } else {
    conseillersAndStructures = await getStructureAndConseillerByDepartement(
      app,
      hub.departements,
    );
  }
  conseillersIds = conseillersAndStructures
    .filter((el) => el.conseiller.length > 0)
    .map((structure) => structure.conseiller)
    .flat();

  structuresIds = conseillersAndStructures.map((structure) => structure._id);

  can(action.read, functionnality.exportHub);
  can([action.read], ressource.statsTerritoires, {
    conseillerIds: {
      $in: conseillersIds,
    },
  });
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
  can([action.read], ressource.conseillers, {
    _id: { $in: conseillersIds },
  });
  can([action.read], ressource.misesEnRelation, {
    'conseiller.$id': { $in: conseillersIds },
  });
  can([action.read], ressource.structures, {
    _id: { $in: structuresIds },
  });
  can([action.read], ressource.cras, {
    'structure.$id': {
      $in: structuresIds,
    },
  });
  can([action.read], ressource.statsConseillersCras, {
    'structure.$id': {
      $in: structuresIds,
    },
  });
}
