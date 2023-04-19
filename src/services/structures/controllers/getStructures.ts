import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { validStructures } from '../../../schemas/structures.schemas';
import {
  filterDepartement,
  filterRegion,
  filterStatut,
  filterType,
  filterSearchBar,
  checkAccessReadRequestStructures,
  filterComs,
  filterSortColonne,
} from '../repository/structures.repository';

const getTotalStructures =
  (app: Application, checkAccess) =>
  async (
    dateDebut: Date,
    dateFin: Date,
    type: string,
    statut: string,
    region: string,
    departement: string,
    coms: string,
    searchByName: string,
  ) =>
    app.service(service.structures).Model.aggregate([
      {
        $match: {
          createdAt: { $gt: dateDebut, $lt: dateFin },
          $and: [checkAccess],
          ...filterType(type),
          ...filterStatut(statut),
          ...filterRegion(region),
          ...filterDepartement(departement),
          ...filterComs(coms),
          ...filterSearchBar(searchByName),
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_structures: '$count' } },
    ]);

const getStructuresAvecFiltre =
  (app: Application, checkAccess) =>
  async (
    dateDebut: Date,
    dateFin: Date,
    type: string,
    statut: string,
    region: string,
    departement: string,
    coms: string,
    searchByName: string,
    sortColonne: object,
    skip: string,
    limit: number,
  ) =>
    app.service(service.structures).Model.aggregate([
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          createdAt: { $gt: dateDebut, $lt: dateFin },
          $and: [checkAccess],
          ...filterType(type),
          ...filterStatut(statut),
          ...filterRegion(region),
          ...filterDepartement(departement),
          ...filterComs(coms),
          ...filterSearchBar(searchByName),
        },
      },
      {
        $project: {
          _id: 1,
          idPG: 1,
          nom: 1,
          siret: 1,
          'contact.prenom': 1,
          'contact.nom': 1,
          'contact.email': 1,
        },
      },
      { $sort: sortColonne },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getStructures =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      skip,
      ordre,
      nomOrdre,
      type,
      statut,
      searchByNom,
      departement,
      region,
      coms,
    } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const emailValidation = validStructures.validate({
      skip,
      dateDebut,
      dateFin,
      ordre,
      nomOrdre,
      type,
      statut,
      searchByNom,
      departement,
      region,
      coms,
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
    const sortColonne = filterSortColonne(nomOrdre, ordre);
    try {
      const checkAccess = await checkAccessReadRequestStructures(app, req);
      const structures: IStructures[] = await getStructuresAvecFiltre(
        app,
        checkAccess,
      )(
        dateDebut,
        dateFin,
        type as string,
        statut as string,
        region as string,
        departement as string,
        coms as string,
        searchByNom as string,
        sortColonne,
        skip as string,
        options.paginate.default,
      );
      if (structures.length > 0) {
        const totalStructures = await getTotalStructures(app, checkAccess)(
          dateDebut,
          dateFin,
          type as string,
          statut as string,
          region as string,
          departement as string,
          coms as string,
          searchByNom as string,
        );
        items.data = structures;
        items.total = totalStructures[0]?.count_structures;
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

export default getStructures;
