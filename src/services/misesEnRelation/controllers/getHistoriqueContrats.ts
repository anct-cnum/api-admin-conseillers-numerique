import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestMisesEnRelation,
  filterStatutContrat,
  totalContrat,
} from '../misesEnRelation.repository';
import { validHistoriqueContrat } from '../../../schemas/contrat.schemas';

const getTotalMisesEnRelations =
  (app: Application, checkAccess) =>
  async (statut: string, statutHistoriqueContrat: string[]) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          ...filterStatutContrat(statut, statutHistoriqueContrat),
          $and: [checkAccess],
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_contrats: '$count' } },
    ]);

const getMisesEnRelations =
  (app: Application, checkAccess) =>
  async (
    skip: string,
    limit: number,
    statut: string,
    dateDebut: Date,
    dateFin: Date,
    statutHistoriqueContrat: string[],
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          $or: [
            { 'emetteurRupture.date': { $gte: dateDebut, $lte: dateFin } },
            {
              'emetteurRenouvellement.date': { $gte: dateDebut, $lte: dateFin },
            },
            {
              dateRecrutement: { $gte: dateDebut, $lte: dateFin },
            },
          ],
          ...filterStatutContrat(statut, statutHistoriqueContrat),
        },
      },
      {
        $project: {
          emetteurRupture: 1,
          emetteurRenouvellement: 1, // à définir
          'structureObj.nom': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.prenom': 1,
          'structureObj.idPG': 1,
          'conseillerObj.idPG': 1,
          typeDeContrat: 1,
          dateDebutDeContrat: 1,
          dateFinDeContrat: 1,
          statut: 1,
        },
      },
      { $sort: { 'structureObj.idPG': 1 } },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getHistoriqueContrats =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, statut } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut);
    const dateFin: Date = new Date(req.query.dateFin);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    try {
      const contratHistoriqueValidation = validHistoriqueContrat.validate({
        page,
        statut,
        dateDebut,
        dateFin,
      });
      if (contratHistoriqueValidation.error) {
        res
          .status(400)
          .json({ message: contratHistoriqueValidation.error.message });
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
      const statutHistoriqueContrat = [
        'finalisee',
        'finalisee_rupture',
        'renouvelee',
      ];
      const checkAccess = await checkAccessReadRequestMisesEnRelation(app, req);
      const contrats = await getMisesEnRelations(app, checkAccess)(
        page,
        options.paginate.default,
        statut,
        dateDebut,
        dateFin,
        statutHistoriqueContrat,
      );
      const totalContrats = await getTotalMisesEnRelations(app, checkAccess)(
        statut,
        statutHistoriqueContrat,
      );
      items.total = totalContrats[0]?.count_contrats ?? 0;
      const totalConvention = await totalContrat(
        app,
        checkAccess,
        statutHistoriqueContrat,
      );
      items.totalParContrat = {
        ...items.totalParContrat,
        total: totalConvention.total,
        recrutement:
          totalConvention.contrat.find(
            (totalParStatut) => totalParStatut.statut === 'finalisee',
          )?.count ?? 0,
        renouvellementDeContrat:
          totalConvention.contrat.find(
            (totalParStatut) => totalParStatut.statut === 'renouvelee', // statut à définir pour le renouvellement de contrat
          )?.count ?? 0,
        ruptureDeContrat:
          totalConvention.contrat.find(
            (totalParStatut) => totalParStatut.statut === 'finalisee_rupture',
          )?.count ?? 0,
      };
      items.data = contrats;
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

export default getHistoriqueContrats;
