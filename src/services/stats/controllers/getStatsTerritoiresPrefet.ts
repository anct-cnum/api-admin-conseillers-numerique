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
import { getCoselec } from '../../../utils';

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

const getStatsTerritoiresPrefet =
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
      const promises = [];
      const stats = [];
      const structures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .find({});
      await Promise.all(
        structures.map(async (structure) => {
          const item = { ...structure };
          const coselec = getCoselec(item);
          const misesEnRelation = await app
            .service(service.misesEnRelation)
            .Model.accessibleBy(req.ability, action.read)
            .find(
              {
                'structure.$id': structure._id,
                statut: { $in: ['recrutee', 'finalisee'] },
              },
              { 'conseillerObj._id': 1 },
            );
          if (misesEnRelation?.length > 0) {
            const conseillersIds = misesEnRelation.map(
              (miseEnRelation) => miseEnRelation.conseillerObj._id,
            );
            const query = {
              'conseiller.$id': { $in: conseillersIds },
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
          }
          item.conseillersRecruter = misesEnRelation.length;
          item.posteValider = coselec?.nombreConseillersCoselec ?? 0;
          stats.push({
            codeDepartement: structure.codeDepartement,
            posteValider: item.posteValider,
            conseillersRecruter: item.conseillersRecruter,
            personnesRecurrentes: item?.personnesRecurrentes ?? 0,
            personnesAccompagnees: item?.personnesAccompagnees ?? 0,
            CRAEnregistres: item?.CRAEnregistres ?? 0,
          });
        }),
      );
      // structures.forEach((structure) => {
      //   promises.push(
      //     app
      //       .service(service.misesEnRelation)
      //       .Model.accessibleBy(req.ability, action.read)
      //       .find(
      //         {
      //           'structure.$id': structure._id,
      //           statut: { $in: ['recrutee', 'finalisee'] },
      //         },
      //         { _id: 0, 'conseiller.$id': 1 },
      //       )
      //       .then((misesEnRelation) => {
      //         const coselec = getCoselec(structure);
      //         Object.assign(structure, {
      //           conseillerIds: misesEnRelation.map(
      //             (miseEnRelation) => miseEnRelation.conseillerObj._id,
      //           ),
      //           conseillersRecruter: misesEnRelation.length,
      //           posteValider: coselec?.nombreConseillersCoselec ?? 0,
      //         });
      //         console.log(structure);
      //       }),
      //   );
      // });
      // console.log(structures);
      await Promise.all(promises);
      if (territoire === 'codeDepartement') {
        statsTerritoires = stats.reduce((acc, obj) => {
          const { codeDepartement } = obj;
          if (!acc[codeDepartement]) {
            acc[codeDepartement] = {
              conseillersRecruter: 0,
              posteValider: 0,
              personnesRecurrentes: 0,
              personnesAccompagnees: 0,
              CRAEnregistres: 0,
              codeDepartement,
            };
          }
          acc[codeDepartement].conseillersRecruter += obj.conseillersRecruter;
          acc[codeDepartement].posteValider += obj.posteValider;
          acc[codeDepartement].personnesRecurrentes += obj.personnesRecurrentes;
          acc[codeDepartement].personnesAccompagnees += obj.personnesAccompagnees;
          acc[codeDepartement].CRAEnregistres += obj.CRAEnregistres;
          return acc;
        }, {});

        // Convert the grouped object back to an array
        statsTerritoires = Object.values(statsTerritoires);
        // statsTerritoires = await getDepartement(
        //   app,
        //   checkRoleAccessStatsTerritoires,
        // )(
        //   dateFinFormat,
        //   ordreColonne,
        //   Number(page) > 0
        //     ? (Number(page) - 1) * Number(options.paginate.default)
        //     : 0,
        //   Number(options.paginate.default),
        // );
        items.total = statsTerritoires.length;
      } else if (territoire === 'codeRegion') {
        statsTerritoires = stats.reduce((acc, obj) => {
          const { codeRegion } = obj;
          if (!acc[codeRegion]) {
            acc[codeRegion] = {
              conseillersRecruter: 0,
              posteValider: 0,
              personnesRecurrentes: 0,
              personnesAccompagnees: 0,
              CRAEnregistres: 0,
              codeRegion,
            };
          }
          acc[codeRegion].conseillersRecruter += obj.conseillersRecruter;
          acc[codeRegion].posteValider += obj.posteValider;
          acc[codeRegion].personnesRecurrentes += obj.personnesRecurrentes;
          acc[codeRegion].personnesAccompagnees += obj.personnesAccompagnees;
          acc[codeRegion].CRAEnregistres += obj.CRAEnregistres;
          return acc;
        }, {});

        // Convert the grouped object back to an array
        statsTerritoires = Object.values(statsTerritoires);
        // statsTerritoires = await getRegion(
        //   app,
        //   checkRoleAccessStatsTerritoires,
        // )(
        //   dateFinFormat,
        //   ordreColonne,
        //   Number(page) > 0
        //     ? (Number(page) - 1) * Number(options.paginate.default)
        //     : 0,
        //   Number(options.paginate.default),
        // );
        // const totalRegion = await getTotalRegions(
        //   app,
        //   checkRoleAccessStatsTerritoires,
        // )(dateFinFormat);
        items.total = statsTerritoires.length;
      }
      console.log(statsTerritoires);
      // statsTerritoires = await Promise.all(
      //   statsTerritoires.map(async (ligneStats) => {
      //     const item = { ...ligneStats };
      //     item.personnesAccompagnees = 0;
      //     item.CRAEnregistres = 0;
      //     const query = {
      //       'conseiller.$id': { $in: item.conseillerIds },
      //       'cra.dateAccompagnement': {
      //         $gte: dateDebut,
      //         $lte: dateFin,
      //       },
      //     };
      //     item.personnesAccompagnees = await countPersonnesAccompagnees(
      //       app,
      //       req,
      //       query,
      //     );
      //     const countRecurrentes = await getPersonnesRecurrentes(
      //       app,
      //       checkRoleAccessCras,
      //     )(query);

      //     item.personnesRecurrentes =
      //       countRecurrentes.length > 0 ? countRecurrentes[0]?.count : 0;
      //     item.CRAEnregistres = await getNombreCra(app, req)(query);

      //     return item;
      //   }),
      // );
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

export default getStatsTerritoiresPrefet;
