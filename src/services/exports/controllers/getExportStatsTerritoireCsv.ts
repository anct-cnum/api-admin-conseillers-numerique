import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvTerritoires } from '../exports.repository';
import { validExportTerritoires } from '../../../schemas/territoires.schemas';
import {
  checkAccessRequestStatsTerritoires,
  countPersonnesAccompagnees,
  getTauxActivation,
} from '../../statsTerritoires/statsTerritoires.repository';

const getRegion =
  (app: Application, checkRoleAccessStatsTerritoires) =>
  async (date: string, nomOrdre: string, ordre: string) =>
    app.service(service.statsTerritoires).Model.aggregate([
      { $match: { date, $and: [checkRoleAccessStatsTerritoires] } },
      {
        $group: {
          _id: {
            codeRegion: '$codeRegion',
            nomRegion: '$nomRegion',
          },
          nombreConseillersCoselec: { $sum: '$nombreConseillersCoselec' },
          cnfsActives: { $sum: '$cnfsActives' },
          cnfsInactives: { $sum: '$cnfsInactives' },
          conseillerIds: { $push: '$conseillerIds' },
        },
      },
      {
        $addFields: {
          codeRegion: '$_id.codeRegion',
          nomRegion: '$_id.nomRegion',
        },
      },
      {
        $project: {
          _id: 0,
          codeRegion: 1,
          nomRegion: 1,
          nombreConseillersCoselec: 1,
          cnfsActives: 1,
          cnfsInactives: 1,
          conseillerIds: {
            $reduce: {
              input: '$conseillerIds',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
      { $sort: { [nomOrdre]: parseInt(ordre, 10) } },
    ]);

const getDepartement =
  (app: Application, checkRoleAccessStatsTerritoires) =>
  async (date: string, ordre: string, nomOrdre: string) =>
    app.service(service.statsTerritoires).Model.aggregate([
      { $match: { date, $and: [checkRoleAccessStatsTerritoires] } },
      {
        $project: {
          _id: 0,
          codeDepartement: 1,
          nomDepartement: 1,
          nombreConseillersCoselec: 1,
          cnfsActives: 1,
          cnfsInactives: 1,
          conseillerIds: 1,
        },
      },
      { $sort: { [nomOrdre]: parseInt(ordre, 10) } },
    ]);

const getExportStatsTerritoireCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { territoire, nomOrdre, ordre } = req.query;
    const dateFin: Date = new Date(req.query.dateFin as string);
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    const dateFinFormat = dayjs(dateFin).format('DD/MM/YYYY');
    const emailValidation = validExportTerritoires.validate({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    });

    if (emailValidation.error) {
      res.statusMessage = emailValidation.error.message;
      res.status(400).end();
      return;
    }
    let statsTerritoires;
    try {
      const checkRoleAccessStatsTerritoires =
        await checkAccessRequestStatsTerritoires(app, req);
      if (territoire === 'codeDepartement') {
        statsTerritoires = await getDepartement(
          app,
          checkRoleAccessStatsTerritoires,
        )(dateFinFormat, String(ordre), String(nomOrdre));
      } else if (territoire === 'codeRegion') {
        statsTerritoires = await getRegion(
          app,
          checkRoleAccessStatsTerritoires,
        )(dateFinFormat, String(nomOrdre), String(ordre));
      }
      statsTerritoires = await Promise.all(
        statsTerritoires.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.tauxActivation = getTauxActivation(
            item.nombreConseillersCoselec,
            item.cnfsActives,
          );

          if (item.conseillerIds?.length > 0) {
            const query = {
              'conseiller.$id': { $in: item.conseillerIds },
              'cra.dateAccompagnement': {
                $gte: dateDebut,
                $lte: dateFin,
              },
            };
            item.personnesAccompagnees = await countPersonnesAccompagnees(
              app,
              req,
              query,
            );
          } else {
            item.personnesAccompagnees = 0;
          }

          return item;
        }),
      );
      generateCsvTerritoires(statsTerritoires, territoire, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportStatsTerritoireCsv;
