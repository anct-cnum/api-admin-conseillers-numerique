import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validHistoriqueConvention } from '../../../schemas/reconventionnement.schemas';
import {
  filterDateDemandeHistorique,
  filterStatutHistorique,
} from '../repository/reconventionnement.repository';
import { checkAccessReadRequestStructures } from '../repository/structures.repository';
import service from '../../../helpers/services';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';

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
          statut: 1,
          dossierReconventionnement: 1,
          dossierConventionnement: 1,
          statutConventionnement: 1,
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
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
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
        dateDebut,
        dateFin,
      );
      const totalStructures = await getTotalStructures(app, checkAccess)(
        type,
        dateDebut,
        dateFin,
      );
      items.total = totalStructures[0]?.count_structures;
      items.totalParConvention.reconventionnement = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({
          statutConventionnement: 'RECONVENTIONNEMENT_VALIDER',
        });
      items.totalParConvention.conventionnement = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({
          statutConventionnement: {
            $in: ['CONVENTIONNEMENT_VALIDER', 'RECONVENTIONNEMENT_EN_COURS'],
          },
        });
      items.totalParConvention.total =
        items.totalParConvention.conventionnement +
        items.totalParConvention.reconventionnement;
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

export default getHistoriqueDossiersConvention;
