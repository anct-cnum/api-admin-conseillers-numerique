import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { exportsCnfsHubPermission } from '../../../helpers/accessControl/verifyPermissions';
import { Hub, Departement } from '../../../ts/interfaces/json.interface';
import { generateCsvConseillersHub } from '../exports.repository';

const hubs = require('../../../../data/imports/hubs.json');
const departements = require('../../../../data/imports/departements-region.json');

const findDepartementOrRegion = (nomHub: string) => {
  return hubs.find((hub: Hub) => `${hub.name}` === nomHub);
};

const findNumDepartementsByRegion = (hubRegion: string[]): Array<string> => {
  return departements
    .filter((departement: Departement) =>
      hubRegion.includes(departement.region_name),
    )
    .map((departement: Departement) => departement.num_dep);
};

const getStructureAndConseillerByDepartement =
  (app: Application) => async (departementsHub: Array<string>) =>
    app.service(service.structures).Model.aggregate([
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
      { $unwind: '$conseiller' },
      {
        $project: {
          nom: 1,
          insee: 1,
          contact: 1,
          codeRegion: 1,
          'conseiller.nom': 1,
          'conseiller.prenom': 1,
          'conseiller.emailCN': 1,
          'conseiller.mattermost': 1,
        },
      },
    ]);

const getStructureAndConseillerByDepartementHubAntillesGuyane =
  (app: Application) => async (departementsHub: Array<string>) =>
    app.service(service.structures).Model.aggregate([
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
      { $unwind: '$conseiller' },
      {
        $project: {
          nom: 1,
          insee: 1,
          contact: 1,
          codeRegion: {
            $cond: {
              if: { $eq: ['$codeCom', '978'] },
              then: '$codeCom',
              else: '$codeRegion',
            },
          },
          'conseiller.nom': 1,
          'conseiller.prenom': 1,
          'conseiller.emailCN': 1,
          'conseiller.mattermost': 1,
        },
      },
    ]);

const getExportConseillersHubCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let conseillers: any;
    try {
      exportsCnfsHubPermission(req.ability);
    } catch (error) {
      res.statusMessage = error.message;
      res.status(401).end();
      return;
    }
    const hub: Hub = findDepartementOrRegion(req.user?.hub);
    try {
      if (hub.region_names) {
        conseillers = await getStructureAndConseillerByDepartement(app)(
          findNumDepartementsByRegion(hub.region_names),
        );
      } else if (hub.name === 'Hub Antilles-Guyane') {
        conseillers =
          await getStructureAndConseillerByDepartementHubAntillesGuyane(app)(
            hub.departements,
          );
      } else {
        conseillers = await getStructureAndConseillerByDepartement(app)(
          hub.departements,
        );
      }
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.statusMessage = 'Accès refusé';
        res.status(403).end();
        return;
      }
      res.statusMessage = error.message;
      res.status(500).end();
      return;
    }
    generateCsvConseillersHub(conseillers, res);
  };

export default getExportConseillersHubCsv;
