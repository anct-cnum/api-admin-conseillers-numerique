import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validConseillers } from '../../../schemas/conseillers.schemas';
import {
  checkAccessReadRequestConseillers,
  filterIsCoordinateur,
  filterIsRupture,
  filterNomConseiller,
  filterNomStructure,
  filterRegion,
} from '../conseillers.repository';
import { getNombreCras } from '../../cras/cras.repository';

const getTotalConseillersRecruter =
  (app: Application, checkAccess) =>
  async (
    dateDebut: Date,
    dateFin: Date,
    isCoordinateur: string,
    searchByConseiller: string,
    region: string,
    rupture: string,
    searchByStructure: string,
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $match: {
          statut: 'RECRUTE',
          datePrisePoste: { $gt: dateDebut, $lt: dateFin },
          $and: [checkAccess],
          ...filterIsCoordinateur(isCoordinateur as string),
          ...filterNomConseiller(searchByConseiller as string),
          ...filterRegion(region as string),
        },
      },
      {
        $lookup: {
          from: 'structures',
          let: { idStructure: '$structureId' },
          as: 'structure',
          pipeline: filterNomStructure(searchByStructure),
        },
      },
      { $unwind: '$structure' },
      {
        $lookup: {
          from: 'misesEnRelation',
          let: { idConseiller: '$idPG', idStructure: '$structure.idPG' },
          as: 'miseEnRelation',
          pipeline: [
            {
              $match: {
                $and: [
                  { $expr: { $eq: ['$$idConseiller', '$conseillerObj.idPG'] } },
                  { $expr: { $eq: ['$$idStructure', '$structureObj.idPG'] } },
                  filterIsRupture(rupture),
                ],
              },
            },
          ],
        },
      },
      { $unwind: '$miseEnRelation' },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_conseillers: '$count' } },
    ]);

const getConseillersRecruter =
  (app: Application, checkAccess) =>
  async (
    dateDebut: Date,
    dateFin: Date,
    isCoordinateur: string,
    searchByConseiller: string,
    region: string,
    rupture: string,
    searchByStructure: string,
    sortColonne: object,
    skip: string,
    limit: number,
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $match: {
          statut: 'RECRUTE',
          datePrisePoste: { $gt: dateDebut, $lt: dateFin },
          $and: [checkAccess],
          ...filterIsCoordinateur(isCoordinateur),
          ...filterNomConseiller(searchByConseiller),
          ...filterRegion(region),
        },
      },
      {
        $lookup: {
          from: 'structures',
          let: { idStructure: '$structureId' },
          as: 'structure',
          pipeline: filterNomStructure(searchByStructure),
        },
      },
      { $unwind: '$structure' },
      {
        $lookup: {
          from: 'misesEnRelation',
          let: { idConseiller: '$idPG', idStructure: '$structure.idPG' },
          as: 'miseEnRelation',
          pipeline: [
            {
              $match: {
                $and: [
                  { $expr: { $eq: ['$$idConseiller', '$conseillerObj.idPG'] } },
                  { $expr: { $eq: ['$$idStructure', '$structureObj.idPG'] } },
                  filterIsRupture(rupture),
                ],
              },
            },
          ],
        },
      },
      { $unwind: '$miseEnRelation' },
      {
        $project: {
          _id: 1,
          idPG: 1,
          prenom: 1,
          nom: 1,
          'emailCN.address': 1,
          'miseEnRelation.statut': 1,
          estCoordinateur: 1,
        },
      },
      { $sort: sortColonne },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getConseillersStatutRecrute =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      skip,
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      searchByStructure,
      region,
    } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const emailValidation = validConseillers.validate({
      skip,
      dateDebut,
      dateFin,
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      searchByStructure,
      region,
    });

    if (emailValidation.error) {
      res.statusMessage = emailValidation.error.message;
      res.status(400).end();
      return;
    }
    const items: { total: number; data: object; limit: number; skip: number } =
      {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
    const sortColonne = JSON.parse(`{"${nomOrdre}":${ordre}}`);
    // console.log(sortColonne);
    try {
      let conseillers: any[];
      const checkAccess = await checkAccessReadRequestConseillers(app, req);
      console.log(checkAccess);
      conseillers = await getConseillersRecruter(app, checkAccess)(
        dateDebut,
        dateFin,
        coordinateur as string,
        searchByConseiller as string,
        region as string,
        rupture as string,
        searchByStructure as string,
        sortColonne,
        skip as string,
        options.paginate.default,
      );
      conseillers = await Promise.all(
        conseillers.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.rupture = item.miseEnRelation.statut === 'nouvelle_rupture';
          item.craCount = await getNombreCras(app, req)(item._id);

          return item;
        }),
      );
      // console.log(conseillers);
      if (conseillers.length > 0) {
        const totalConseillers = await getTotalConseillersRecruter(
          app,
          checkAccess,
        )(
          dateDebut,
          dateFin,
          coordinateur as string,
          searchByConseiller as string,
          region as string,
          rupture as string,
          searchByStructure as string,
        );
        items.data = conseillers;
        items.total = totalConseillers[0]?.count_conseillers;
        items.limit = options.paginate.default;
        items.skip = Number(skip);
      }
      res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getConseillersStatutRecrute;
