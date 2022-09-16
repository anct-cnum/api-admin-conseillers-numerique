import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validTerritoires } from '../../../schemas/territoires.schemas';
import { action } from '../../../helpers/accessControl/accessList';

const checkAccessRequestStatsTerritoires = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.statsTerritoires)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const checkAccessRequestCras = async (app: Application, req: IRequest) =>
  app
    .service(service.cras)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const getPersonnesAccompagnees =
  (app: Application, checkRoleAccessStatsTerritoires) => (query: object) =>
    app
      .service(service.cras)
      .Model.aggregate([
        { $match: { ...query, $and: [checkRoleAccessStatsTerritoires] } },
        { $group: { _id: null, count: { $sum: '$cra.nbParticipants' } } },
        { $project: { valeur: '$count' } },
      ]);

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
      { $project: { valeur: '$count' } },
    ]);

const getDepartement =
  (app: Application, req: IRequest) =>
  async (date: string, ordre: string, page: number, limit: number) =>
    app
      .service(service.statsTerritoires)
      .Model.accessibleBy(req.ability, action.read)
      .find({ date })
      .sort(ordre)
      .skip(page)
      .limit(limit);

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

const getStatsTerritoires =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, typeTerritoire, nomOrdre, ordre } = req.query;
    const dateFin: Date = new Date(req.query.dateFin as string);
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFinFormat = dayjs(dateFin).format('DD/MM/YYYY');
    const emailValidation = validTerritoires.validate({
      typeTerritoire,
      page,
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
      if (typeTerritoire === 'codeDepartement') {
        statsTerritoires = await getDepartement(app, req)(
          dateFinFormat,
          ordreColonne,
          Number(page) > 0
            ? (Number(page) - 1) * Number(options.paginate.default)
            : 0,
          Number(options.paginate.default),
        );
        items.total = await getTotalDepartements(app, req)(dateFinFormat);
      } else if (typeTerritoire === 'codeRegion') {
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
        items.total = await getTotalRegions(
          app,
          checkRoleAccessStatsTerritoires,
        )(dateFinFormat);
      }

      await Promise.all(
        statsTerritoires.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.personnesAccompagnees = 0;
          item.CRAEnregistres = 0;
          item.tauxActivation =
            item?.nombreConseillersCoselec && item?.nombreConseillersCoselec > 0
              ? Math.round(
                  // eslint-disable-next-line no-unsafe-optional-chaining
                  (item?.cnfsActives * 100) / item?.nombreConseillersCoselec,
                )
              : 0;

          if (item.conseillerIds?.length > 0) {
            const query = {
              'conseiller.$id': { $in: item.conseillerIds },
              'cra.dateAccompagnement': {
                $gte: dateDebut,
                $lte: dateFin,
              },
            };
            const countAccompagnees = await getPersonnesAccompagnees(
              app,
              checkRoleAccessCras,
            )(query);
            const countRecurrentes = await getPersonnesRecurrentes(
              app,
              checkRoleAccessCras,
            )(query);

            item.personnesAccompagnees =
              countAccompagnees.length > 0 ? countAccompagnees[0]?.count : 0;
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
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
    }
  };

export default getStatsTerritoires;
