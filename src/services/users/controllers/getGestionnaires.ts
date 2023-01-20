import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { checkAccessReadRequestGestionnaires, filterRole, filterNomGestionnaire } from '../users.repository';

const getGestionnairesAvecFiltre =
  (app: Application, checkAccess) =>
  async (
    search_role: string,
    searchByName: string,
    sortColonne: object,
    skip: string,
    limit: number,
  ) =>
    app.service(service.users).Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          ...filterRole(search_role),
          ...filterNomGestionnaire(searchByName),
        },
      },
      {
        $project: {
          _id: 1,
          roles: 1,
          name: 1,
          reseau: 1,
          nom: 1,
          prenom: 1,
          tokenCreatedAt: 1,
          passwordCreated: 1,
        },
      },
      { $sort: sortColonne },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getGestionnaires =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      skip,
      ordre,
      nomOrdre,
      searchByNom,
      search_role,
    } = req.query;
    const items: { total: number; data: object; limit: number; skip: number } =
      {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
    const sortColonne = JSON.parse(`{"${nomOrdre}":${ordre}}`);
    try {
      const checkAccess = await checkAccessReadRequestGestionnaires(app, req);
      const gestionnaires: IUser[] = await getGestionnairesAvecFiltre(
        app,
        checkAccess,
      )(
        search_role as string,
        searchByNom as string,
        sortColonne,
        skip as string,
        options.paginate.default,
      );
      if (gestionnaires.length > 0) {
        const totalGestionnaires = await getTotalGestionnaires(app, checkAccess)(
          search_role as string,
          searchByNom as string,
        );
        items.data = gestionnaires;
        items.total = totalGestionnaires[0]?.count_gestionnaires;
        items.limit = options.paginate.default;
        items.skip = Number(skip);
      }
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

const getTotalGestionnaires =
  (app: Application, checkAccess) =>
  async (
    search_role: string,
    searchByName: string,
  ) =>
    app.service(service.users).Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          ...filterRole(search_role),
          ...filterNomGestionnaire(searchByName),
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_gestionnaires: '$count' } },
    ]);

export default getGestionnaires;
