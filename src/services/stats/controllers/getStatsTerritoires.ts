import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validTerritoires } from '../../../schemas/territoires.schemas';
import { action } from '../../../helpers/accessControl/accessList';
import {
  checkAccessRequestStatsTerritoires,
  countPersonnesAccompagnees,
  getTauxActivation,
} from '../../statsTerritoires/statsTerritoires.repository';
import { checkAccessRequestCras } from '../../cras/cras.repository';

const getTotalDepartements =
  (app: Application, req: IRequest) => async (date: string) =>
    app
      .service(service.statsTerritoires)
      .Model.accessibleBy(req.ability, action.read)
      .countDocuments({ date });

const getTotalRegions =
  (app: Application, checkRoleAccessStatsTerritoires) => async (date: string) =>
    app
      .service(service.statsTerritoires)
      .Model.aggregate([
        { $match: { date, $and: [checkRoleAccessStatsTerritoires] } },
        { $group: { _id: { codeRegion: '$codeRegion' } } },
        { $project: { _id: 0 } },
      ]);

const getNombreCra =
  (app: Application, req: IRequest) => async (query: object) =>
    app
      .service(service.cras)
      .Model.accessibleBy(req.ability, action.read)
      .countDocuments(query);

const getPersonnesRecurrentes =
  (app: Application, checkRoleAccessCras) => async (query: object) =>
    app.service(service.cras).Model.aggregate([
      { $match: { ...query, $and: [checkRoleAccessCras] } },
      {
        $group: { _id: null, count: { $sum: '$cra.nbParticipantsRecurrents' } },
      },
      { $project: { count: '$count' } },
    ]);

const getDepartement =
  (app: Application, checkRoleAccessStatsTerritoires) =>
  async (date: string, ordre: string, page: number, limit: number) =>
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
      { $skip: page },
      { $limit: limit },
    ]);

const getRegion =
  (app: Application, checkRoleAccessStatsTerritoires) =>
  async (date: string, ordre: string, page: number, limit: number) =>
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
      { $skip: page },
      { $limit: limit },
    ]);
const getStructuresMailles =
  (app: Application) => async (territoire: string, code: string) =>
    app
      .service(service.structures)
      .Model.find({
        [territoire]: code === '978' ? '00' : code,
        statut: { $ne: 'CREEE' },
      })
      .distinct('_id');

const getStatsTerritoires =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, territoire, nomOrdre, ordre } = req.query;
    const dateFin: Date = new Date(req.query.dateFin);
    const dateDebut: Date = new Date(req.query.dateDebut);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    const dateFinFormat = dayjs(dateFin).format('DD/MM/YYYY');
    const statsValidation = validTerritoires.validate({
      territoire,
      page,
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
      const checkRoleAccessCras = await checkAccessRequestCras(app, req);
      if (territoire === 'codeDepartement') {
        statsTerritoires = await getDepartement(
          app,
          checkRoleAccessStatsTerritoires,
        )(
          dateFinFormat,
          ordreColonne,
          Number(page) > 0
            ? (Number(page) - 1) * Number(options.paginate.default)
            : 0,
          Number(options.paginate.default),
        );
        items.total = await getTotalDepartements(app, req)(dateFinFormat);
      } else if (territoire === 'codeRegion') {
        statsTerritoires = await getRegion(
          app,
          checkRoleAccessStatsTerritoires,
        )(
          dateFinFormat,
          ordreColonne,
          Number(page) > 0
            ? (Number(page) - 1) * Number(options.paginate.default)
            : 0,
          Number(options.paginate.default),
        );
        const totalRegion = await getTotalRegions(
          app,
          checkRoleAccessStatsTerritoires,
        )(dateFinFormat);
        items.total = totalRegion.length === 0 ? 0 : totalRegion.length;
      }

      statsTerritoires = await Promise.all(
        statsTerritoires.map(async (ligneStats) => {
          const listStructureId = await getStructuresMailles(app)(
            territoire,
            ligneStats[territoire],
          );
          const item = ligneStats ?? {};
          item.structureIds = listStructureId;
          item.personnesAccompagnees = 0;
          item.CRAEnregistres = 0;
          item.tauxActivation = getTauxActivation(
            item.nombreConseillersCoselec,
            item.cnfsActives,
          );

          if (item.structureIds?.length > 0) {
            const query = {
              'structure.$id': { $in: item.structureIds },
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
            const countRecurrentes = await getPersonnesRecurrentes(
              app,
              checkRoleAccessCras,
            )(query);

            item.personnesRecurrentes =
              countRecurrentes.length > 0 ? countRecurrentes[0]?.count : 0;
            item.CRAEnregistres = await getNombreCra(app, req)(query);
          } else {
            item.personnesAccompagnees = 0;
            item.CRAEnregistres = 0;
            item.personnesRecurrentes = 0;
          }

          return item;
        }),
      );
      items.data = statsTerritoires;
      items.limit = options.paginate.default;
      items.skip = Number(page);
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
