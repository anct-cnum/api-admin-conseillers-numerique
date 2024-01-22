import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestStructures,
  filterSearchBar,
  filterRegion,
  filterDepartement,
  filterAvisPrefet,
  filterStatutDemandeConseiller,
} from '../repository/structures.repository';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { validDemandesConseiller } from '../../../schemas/structures.schemas';

const getTotalStructures =
  (app: Application, checkAccess) =>
  async (
    statut: string,
    search: string,
    region: string,
    departement: string,
    avisPrefet: string,
  ) =>
    app.service(service.structures).Model.aggregate([
      {
        $addFields: {
          idPGStr: {
            $toString: '$idPG',
            lastPrefet: {
              $ifNull: [{ $arrayElemAt: ['$prefet', -1] }, null],
            },
          },
        },
      },
      {
        $match: {
          coordinateurCandidature: false,
          createdAt: { $gte: new Date('2023-01-01') },
          $and: [
            checkAccess,
            filterSearchBar(search),
            filterAvisPrefet(avisPrefet),
            filterStatutDemandeConseiller(statut),
          ],
          ...filterRegion(region),
          ...filterDepartement(departement),
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_structures: '$count' } },
    ]);

const totalParStatutDemandesConseiller = async (
  app: Application,
  checkAccess,
) => {
  const countDemandesConseiller = await app
    .service(service.structures)
    .Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          statut: { $in: ['CREEE', 'VALIDATION_COSELEC', 'REFUS_COSELEC'] },
          coordinateurCandidature: false,
          createdAt: { $gte: new Date('2023-01-01') },
        },
      },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 },
        },
      },
    ]);
  const totalDemandesConseillerEnCours =
    countDemandesConseiller.find((element) => element._id === 'CREEE')?.count ??
    0;
  const totalDemandesConseillerValider =
    countDemandesConseiller.find(
      (element) => element._id === 'VALIDATION_COSELEC',
    )?.count ?? 0;
  const totalDemandesConseillerRefuser =
    countDemandesConseiller.find((element) => element._id === 'REFUS_COSELEC')
      ?.count ?? 0;
  const total =
    totalDemandesConseillerEnCours +
    totalDemandesConseillerValider +
    totalDemandesConseillerRefuser;

  return {
    nouvelleCandidature: totalDemandesConseillerEnCours,
    candidatureValider: totalDemandesConseillerValider,
    candidatureNonRetenus: totalDemandesConseillerRefuser,
    total,
  };
};

const getStructures =
  (app: Application, checkAccess) =>
  async (
    statut: string,
    search: string,
    region: string,
    departement: string,
    avisPrefet: string,
    sortColonne: string,
    skip: string,
    limit: number,
  ) =>
    app.service(service.structures).Model.aggregate([
      {
        $addFields: {
          idPGStr: { $toString: '$idPG' },
          lastPrefet: {
            $ifNull: [{ $arrayElemAt: ['$prefet', -1] }, null],
          },
        },
      },
      {
        $match: {
          coordinateurCandidature: false,
          createdAt: { $gte: new Date('2023-01-01') },
          $and: [
            checkAccess,
            filterSearchBar(search),
            filterAvisPrefet(avisPrefet),
            filterStatutDemandeConseiller(statut),
          ],
          ...filterRegion(region),
          ...filterDepartement(departement),
        },
      },
      {
        $project: {
          nom: 1,
          codePostal: 1,
          idPG: 1,
          createdAt: 1,
          prefet: '$lastPrefet',
        },
      },
      { $sort: sortColonne },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getDemandesConseiller =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      page,
      statut,
      nomOrdre,
      ordre,
      search,
      departement,
      region,
      avisPrefet,
    } = req.query;
    try {
      const demandesConseillerValidation = validDemandesConseiller.validate({
        page,
        statut,
        nomOrdre,
        ordre,
        search,
        departement,
        region,
        avisPrefet,
      });
      if (demandesConseillerValidation.error) {
        res
          .status(400)
          .json({ message: demandesConseillerValidation.error.message });
        return;
      }
      const items: {
        total: number;
        data: object;
        totalParDemandesConseiller: {
          nouvelleCandidature: number;
          candidatureValider: number;
          candidatureNonRetenus: number;
          total: number;
        };
        limit: number;
        skip: number;
      } = {
        total: 0,
        data: [],
        totalParDemandesConseiller: {
          nouvelleCandidature: 0,
          candidatureValider: 0,
          candidatureNonRetenus: 0,
          total: 0,
        },
        limit: 0,
        skip: 0,
      };
      const sortColonne = JSON.parse(`{"${nomOrdre}":${ordre}}`);
      const checkAccess = await checkAccessReadRequestStructures(app, req);
      const structures: IStructures[] = await getStructures(app, checkAccess)(
        statut,
        search,
        region,
        departement,
        avisPrefet,
        sortColonne,
        page,
        options.paginate.default,
      );
      items.totalParDemandesConseiller = await totalParStatutDemandesConseiller(
        app,
        checkAccess,
      );
      if (structures.length > 0) {
        const totalStructures = await getTotalStructures(app, checkAccess)(
          statut,
          search,
          region,
          departement,
          avisPrefet,
        );
        items.data = structures;
        items.total = totalStructures[0]?.count_structures;
        items.limit = options.paginate.default;
        items.skip = Number(page);
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

export default getDemandesConseiller;
