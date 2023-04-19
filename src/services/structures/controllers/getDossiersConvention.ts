import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validReconventionnement } from '../../../schemas/reconventionnement.schemas';
import {
  filterStatut,
  totalParConvention,
} from '../repository/reconventionnement.repository';
import { checkAccessReadRequestStructures } from '../repository/structures.repository';
import service from '../../../helpers/services';
import { IStructures } from '../../../ts/interfaces/db.interfaces';

const getTotalStructures =
  (app: Application, checkAccess) => async (typeConvention: string) =>
    app.service(service.structures).Model.aggregate([
      {
        $match: {
          ...filterStatut(typeConvention),
          $and: [checkAccess],
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_structures: '$count' } },
    ]);

const getStructures =
  (app: Application, checkAccess) =>
  async (skip: string, limit: number, typeConvention: string) =>
    app.service(service.structures).Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          ...filterStatut(typeConvention),
        },
      },
      {
        $project: {
          _id: 1,
          nom: 1,
          idPG: 1,
          nombreConseillersSouhaites: 1,
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

const getDossiersConvention =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, type } = req.query;
    try {
      const pageValidation = validReconventionnement.validate({ page, type });
      if (pageValidation.error) {
        res.status(400).json({ message: pageValidation.error.message });
        return;
      }
      const items: {
        total: number;
        data: object;
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
      const structures: IStructures = await getStructures(app, checkAccess)(
        page,
        options.paginate.default,
        type,
      );
      const totalStructures = await getTotalStructures(app, checkAccess)(type);
      items.total = totalStructures[0]?.count_structures ?? 0;
      const totalConvention = await totalParConvention(app, req, 'EN_COURS');
      items.totalParConvention = {
        ...items.totalParConvention,
        ...totalConvention,
      };
      items.data = structures;
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

export default getDossiersConvention;
