import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestMisesEnRelation,
  filterNomConseiller,
  filterStatutContrat,
  totalContrat,
} from '../misesEnRelation.repository';
import { validContrat } from '../../../schemas/contrat.schemas';

const getTotalMisesEnRelations =
  (app: Application, checkAccess) =>
  async (statut: string, searchByNomConseiller: string) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $addFields: {
          nomPrenomStr: {
            $concat: ['$conseillerObj.nom', ' ', '$conseillerObj.prenom'],
          },
        },
      },
      {
        $addFields: {
          prenomNomStr: {
            $concat: ['$conseillerObj.prenom', ' ', '$conseillerObj.nom'],
          },
        },
      },
      { $addFields: { idPGStr: { $toString: '$conseillerObj.idPG' } } },
      {
        $match: {
          ...filterStatutContrat(statut),
          ...filterNomConseiller(searchByNomConseiller),
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
    searchByNomConseiller: string,
    ordre: string,
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $addFields: {
          nomPrenomStr: {
            $concat: ['$conseillerObj.nom', ' ', '$conseillerObj.prenom'],
          },
        },
      },
      {
        $addFields: {
          prenomNomStr: {
            $concat: ['$conseillerObj.prenom', ' ', '$conseillerObj.nom'],
          },
        },
      },
      { $addFields: { idPGStr: { $toString: '$conseillerObj.idPG' } } },
      {
        $match: {
          $and: [checkAccess],
          ...filterStatutContrat(statut),
          ...filterNomConseiller(searchByNomConseiller),
        },
      },
      {
        $project: {
          emetteurRupture: 1,
          createdAt: 1,
          emetteurRenouvellement: 1,
          dateSorted: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$statut', 'nouvelle_rupture'] },
                  then: '$emetteurRupture.date',
                },
                {
                  case: { $eq: ['$statut', 'renouvellement_initiee'] },
                  then: '$emetteurRenouvellement.date',
                },
                {
                  case: { $eq: ['$statut', 'recrutee'] },
                  then: '$createdAt', // en attendant de le dev du parcours de recrutement
                },
              ],
              default: null,
            },
          },
          'structureObj.nom': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.prenom': 1,
          'structureObj.idPG': 1,
          'conseillerObj.idPG': 1,
          'conseillerObj._id': 1,
          statut: 1,
        },
      },
      { $sort: { dateSorted: Number(ordre) } },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getContrats =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, statut, nomOrdre, ordre, searchByNomConseiller } = req.query;
    try {
      const contratValidation = validContrat.validate({
        page,
        statut,
        nomOrdre,
        ordre,
        searchByNomConseiller,
      });
      if (contratValidation.error) {
        res.status(400).json({ message: contratValidation.error.message });
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
      const contrats = await getMisesEnRelations(app, checkAccess)(
        page,
        options.paginate.default,
        statut,
        searchByNomConseiller,
        ordre,
      );
      const totalContrats = await getTotalMisesEnRelations(app, checkAccess)(
        statut,
        searchByNomConseiller,
      );
      items.total = totalContrats[0]?.count_contrats ?? 0;
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
            (totalParStatut) =>
              totalParStatut.statut === 'renouvellement_initiee',
          )?.count ?? 0,
        ruptureDeContrat:
          totalConvention.contrat.find(
            (totalParStatut) => totalParStatut.statut === 'nouvelle_rupture',
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

export default getContrats;
