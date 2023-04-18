import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestMisesEnRelation,
  filterStatutContrat,
  totalContrat,
} from '../misesEnRelation.repository';
import validContrat from '../../../schemas/contrat.schemas';

const getTotalMisesEnRelations =
  (app: Application, checkAccess) => async (typeContrat: string) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          ...filterStatutContrat(typeContrat),
          $and: [checkAccess],
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_contrats: '$count' } },
    ]);

const getMisesEnRelations =
  (app: Application, checkAccess) =>
  async (skip: string, limit: number, typeContrat: string) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          ...filterStatutContrat(typeContrat),
        },
      },
      {
        $project: {
          _id: 1,
          dateRecrutement: 1,
          emetteurRupture: 1,
          emetteurRenouvellement: 1,
          'structureObj.nom': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.prenom': 1,
          'structureObj.idPG': 1,
          'conseillerObj.idPG': 1,
          statut: 1,
        },
      },
      { $sort: { 'structureObj.idPG': 1 } },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getContrats =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, type } = req.query;
    try {
      const pageValidation = validContrat.validate({ page, type });
      if (pageValidation.error) {
        res.status(400).json({ message: pageValidation.error.message });
        return;
      }
      const items: {
        total: number;
        data: object;
        totalParContrat: {
          recrutement: number;
          renouvellementDeContrat: number;
          ruptureDeContrat: number;
          total: number;
        };
        limit: number;
        skip: number;
      } = {
        total: 0,
        data: [],
        totalParContrat: {
          recrutement: 0,
          renouvellementDeContrat: 0,
          ruptureDeContrat: 0,
          total: 0,
        },
        limit: 0,
        skip: 0,
      };

      const checkAccess = await checkAccessReadRequestMisesEnRelation(app, req);
      const structures = await getMisesEnRelations(app, checkAccess)(
        page,
        options.paginate.default,
        type,
      );
      const totalStructures = await getTotalMisesEnRelations(
        app,
        checkAccess,
      )(type);
      items.total = totalStructures[0]?.count_contrats ?? 0;
      const totalConvention = await totalContrat(app, checkAccess);
      items.totalParContrat = {
        ...items.totalParContrat,
        total: totalConvention.total,
        recrutement:
          totalConvention.contrat.find(
            (totalParStatut) => totalParStatut.statut === 'recrutee',
          )?.count ?? 0,
        renouvellementDeContrat:
          totalConvention.contrat.find(
            (totalParStatut) => totalParStatut.statut === 'renouvellement',
          )?.count ?? 0,
        ruptureDeContrat:
          totalConvention.contrat.find(
            (totalParStatut) => totalParStatut.statut === 'nouvelle_rupture',
          )?.count ?? 0,
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

export default getContrats;
