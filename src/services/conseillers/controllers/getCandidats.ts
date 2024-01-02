import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { validCandidats } from '../../../schemas/conseillers.schemas';
import {
  filterDepartement,
  filterRegion,
  filterNomAndEmailConseiller,
  checkAccessReadRequestConseillers,
} from '../repository/conseillers.repository';

const getTotalCandidats =
  (app: Application, checkAccess) =>
  async (region: string, departement: string, search: string) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $addFields: {
          nomPrenomStr: { $concat: ['$nom', ' ', '$prenom'] },
          email: '$email',
        },
      },
      {
        $addFields: {
          prenomNomStr: { $concat: ['$prenom', ' ', '$nom'] },
          email: '$email',
        },
      },
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          statut: { $ne: 'RECRUTE' },
          $and: [checkAccess],
          ...filterRegion(region),
          ...filterDepartement(departement),
          ...filterNomAndEmailConseiller(search),
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_candidats: '$count' } },
    ]);

const getCandidatsAvecFiltre =
  (app: Application, checkAccess) =>
  async (
    region: string,
    departement: string,
    searchByName: string,
    skip: string,
    limit: number,
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $addFields: {
          nomPrenomStr: { $concat: ['$nom', ' ', '$prenom'] },
          email: '$email',
        },
      },
      {
        $addFields: {
          prenomNomStr: { $concat: ['$prenom', ' ', '$nom'] },
          email: '$email',
        },
      },
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          statut: { $ne: 'RECRUTE' },
          $and: [checkAccess],
          ...filterRegion(region),
          ...filterDepartement(departement),
          ...filterNomAndEmailConseiller(searchByName),
        },
      },
      {
        $project: {
          _id: 1,
          idPG: 1,
          nom: 1,
          prenom: 1,
          codePostal: 1,
          createdAt: 1,
          statut: 1,
          pix: 1,
          cv: 1,
        },
      },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getCandidats =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { skip, searchByNomCandidat, departement, region } = req.query;
    const candidatValidation = validCandidats.validate({
      skip,
      searchByNomCandidat,
      departement,
      region,
    });

    if (candidatValidation.error) {
      res.status(400).json({ message: candidatValidation.error.message });
      return;
    }
    const items: { total: number; data: object; limit: number; skip: number } =
      {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
    try {
      const checkAccess = await checkAccessReadRequestConseillers(app, req);
      const candidats: IConseillers[] = await getCandidatsAvecFiltre(
        app,
        checkAccess,
      )(
        region as string,
        departement as string,
        searchByNomCandidat as string,
        skip as string,
        options.paginate.default,
      );
      if (candidats.length > 0) {
        const totalCandidats = await getTotalCandidats(app, checkAccess)(
          region as string,
          departement as string,
          searchByNomCandidat as string,
        );
        items.data = candidats;
        items.total = totalCandidats[0]?.count_candidats;
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

export default getCandidats;
