import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validTerritoiresPrefet } from '../../../schemas/territoires.schemas';
import {
  checkAccessRequestStatsTerritoires,
  countPersonnesAccompagnees,
  countPersonnesRecurrentes,
} from '../../statsTerritoires/statsTerritoires.repository';
import { getNombreCraWithAccessControl } from '../stats.repository';

const getDepartement =
  (app: Application, checkRoleAccessStatsTerritoires) =>
  async (date: string, ordre: string) =>
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
      { $sort: ordre },
    ]);

const getRegion =
  (app: Application, checkRoleAccessStatsTerritoires) =>
  async (date: string, ordre: string) =>
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
      { $sort: ordre },
    ]);

const getStatsTerritoires =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { territoire, nomOrdre, ordre } = req.query;
    const dateFin: Date = new Date(req.query.dateFin);
    const dateDebut: Date = new Date(req.query.dateDebut);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    const dateFinFormat = dayjs(dateFin).format('DD/MM/YYYY');
    const statsValidation = validTerritoiresPrefet.validate({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    });

    if (statsValidation.error) {
      res.statusMessage = statsValidation.error.message;
      res.status(400).end();
      return;
    }
    const items: { total: number; data: object; limit: number; skip: number } =
      {
        total: 0,
        data: undefined,
        limit: 0,
        skip: 0,
      };
    const ordreColonne = JSON.parse(`{"${nomOrdre}":${ordre}}`);
    try {
      let statsTerritoires: any[];
      const checkRoleAccessStatsTerritoires =
        await checkAccessRequestStatsTerritoires(app, req);
      if (territoire === 'codeDepartement') {
        statsTerritoires = await getDepartement(
          app,
          checkRoleAccessStatsTerritoires,
        )(dateFinFormat, ordreColonne);
      } else if (territoire === 'codeRegion') {
        statsTerritoires = await getRegion(
          app,
          checkRoleAccessStatsTerritoires,
        )(dateFinFormat, ordreColonne);
      }

      statsTerritoires = await Promise.all(
        statsTerritoires.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.personnesAccompagnees = 0;
          item.CRAEnregistres = 0;
          item.personnesRecurrentes = 0;
          item.conseillersRecruter = item.conseillerIds.length;
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
            item.personnesRecurrentes = await countPersonnesRecurrentes(
              app,
              req,
              query,
            );
            item.CRAEnregistres = await getNombreCraWithAccessControl(
              app,
              req,
            )(query);
          }

          return item;
        }),
      );
      items.data = statsTerritoires;
      items.limit = options.paginate.default;
      res.send({ items });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStatsTerritoires;
