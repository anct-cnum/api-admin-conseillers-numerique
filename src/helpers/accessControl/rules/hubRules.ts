/* eslint-disable prefer-const */
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

import app from '../../../app';

const getStructureAndConseillerByDepartement = async (
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

export default async function hubRules(user: IUser, can) {
  const hub: IHub = findDepartementOrRegion(user?.hub);

  let conseillersAndStructures: IStructuresConseillers[];
  let conseillersIds: ObjectId[];
  let structuresIds: ObjectId[];

  if (hub?.region_names) {
    const departementsList = findNumDepartementsByRegion(hub.region_names);
    conseillersAndStructures = await getStructureAndConseillerByDepartement(
      departementsList,
    );
  } else if (hub.name === 'Hub Antilles-Guyane') {
    conseillersAndStructures =
      await getStructureAndConseillerByDepartementHubAntillesGuyane(
        hub.departements,
      );
  } else {
    conseillersAndStructures = await getStructureAndConseillerByDepartement(
      hub.departements,
    );
  }
  conseillersIds = conseillersAndStructures
    .filter((el) => el.conseiller.length > 0)
    .map((structure) => structure.conseiller)
    .flat();

  structuresIds = conseillersAndStructures.map((structure) => structure._id);

  can(action.read, functionnality.exportHub);
  can([action.read], ressource.statsTerritoires);
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
  can([action.read], ressource.conseillers, {
    _id: { $in: conseillersIds },
  });
  can([action.read], ressource.structures, {
    _id: { $in: structuresIds },
  });
  can([action.read], ressource.cras, {
    'conseiller.$id': {
      $in: conseillersIds,
    },
  });
  can([action.read], ressource.statsConseillersCras, {
    'conseiller.$id': {
      $in: conseillersIds,
    },
  });
}
