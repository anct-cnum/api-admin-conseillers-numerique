import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validHistoriqueConvention } from '../../../schemas/reconventionnement.schemas';
import {
  filterDateDemandeHistorique,
  filterStatutHistorique,
  totalParConvention,
} from '../repository/reconventionnement.repository';
import { checkAccessReadRequestStructures } from '../repository/structures.repository';
import service from '../../../helpers/services';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { getCoselec } from '../../../utils';

const getTotalStructures =
  (app: Application, checkAccess) =>
  async (typeConvention: string, dateDebut: Date, dateFin: Date) =>
    app.service(service.structures).Model.aggregate([
      {
        $match: {
          ...filterStatutHistorique(typeConvention),
          ...filterDateDemandeHistorique(typeConvention, dateDebut, dateFin),
          $and: [checkAccess],
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_structures: '$count' } },
    ]);

const getStructures =
  (app: Application, checkAccess) =>
  async (
    skip: string,
    limit: number,
    typeConvention: string,
    dateDebut: Date,
    dateFin: Date,
  ) =>
    app.service(service.structures).Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          ...filterStatutHistorique(typeConvention),
          ...filterDateDemandeHistorique(typeConvention, dateDebut, dateFin),
        },
      },
      {
        $project: {
          _id: 1,
          nom: 1,
          idPG: 1,
          nombreConseillersSouhaites: 1,
          coselec: 1,
          statut: 1,
          conventionnement: 1,
        },
      },
      { $sort: { idPG: 1 } },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getHistoriqueDossiersConvention =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, type } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut);
    const dateFin: Date = new Date(req.query.dateFin);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    try {
      const pageValidation = validHistoriqueConvention.validate({
        page,
        type,
        dateDebut,
        dateFin,
      });
      if (pageValidation.error) {
        res.status(400).json({ message: pageValidation.error.message });
        return;
      }
      const items: {
        total: number;
        data: IStructures[];
        totalParConvention: {
          reconventionnement: number;
          conventionnement: number;
          avenantAjoutPoste: number;
          avenantRenduPoste: number;
          total: number;
        };
        limit: number;
        skip: number;
      } = {
        total: 0,
        data: [],
        totalParConvention: {
          reconventionnement: 0,
          conventionnement: 0,
          avenantAjoutPoste: 0,
          avenantRenduPoste: 0,
          total: 0,
        },
        limit: 0,
        skip: 0,
      };

      const checkAccess = await checkAccessReadRequestStructures(app, req);
      const structures = await getStructures(app, checkAccess)(
        page,
        options.paginate.default,
        type,
        dateDebut,
        dateFin,
      );
      const totalStructures = await getTotalStructures(app, checkAccess)(
        type,
        dateDebut,
        dateFin,
      );
      items.total = totalStructures[0]?.count_structures ?? 0;
      const totalConvention = await totalParConvention(app, req, 'VALIDÉ');
      items.totalParConvention = {
        ...items.totalParConvention,
        ...totalConvention,
      };
      items.data = structures.map((structure) => {
        const item = { ...structure };
        if (item.conventionnement.statut === 'CONVENTIONNEMENT_VALIDÉ') {
          item.nombreConseillersCoselec =
            getCoselec(structure)?.nombreConseillersCoselec ?? 0;
        }
        return item;
      });
      items.limit = options.paginate.default;
      items.skip = page;

      res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getHistoriqueDossiersConvention;
