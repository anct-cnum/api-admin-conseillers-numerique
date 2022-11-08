import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validConseillers } from '../../../schemas/conseillers.schemas';
import {
  filterIsCoordinateur,
  filterIsRupture,
  filterNomConseiller,
  filterNomStructure,
  filterRegion,
} from '../conseillers.repository';
import { getNombreCras } from '../../cras/cras.repository';
import checkAccessReadRequestMisesEnRelation from '../../misesEnRelation/misesEnRelation.repository';

const getTotalConseillersRecruter =
  (app: Application, checkAccess) =>
  async (
    dateDebut: Date,
    dateFin: Date,
    isCoordinateur: string,
    searchByConseiller: string,
    region: string,
    rupture: string,
    searchByStructure: string,
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          ...filterIsRupture(rupture),
          ...filterIsCoordinateur(isCoordinateur),
          ...filterNomConseiller(searchByConseiller),
          ...filterRegion(region),
          ...filterNomStructure(searchByStructure),
          'conseillerObj.datePrisePoste': { $gt: dateDebut, $lt: dateFin },
          $and: [checkAccess],
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_conseillers: '$count' } },
    ]);

const getConseillersRecruter =
  (app: Application, checkAccess) =>
  async (
    dateDebut: Date,
    dateFin: Date,
    isCoordinateur: string,
    searchByConseiller: string,
    region: string,
    rupture: string,
    searchByStructure: string,
    sortColonne: object,
    skip: string,
    limit: number,
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          ...filterIsRupture(rupture),
          ...filterIsCoordinateur(isCoordinateur),
          ...filterNomConseiller(searchByConseiller),
          ...filterRegion(region),
          ...filterNomStructure(searchByStructure),
          'conseillerObj.datePrisePoste': { $gt: dateDebut, $lt: dateFin },
          $and: [checkAccess],
        },
      },
      {
        $project: {
          _id: 0,
          statut: 1,
          'conseillerObj.idPG': 1,
          'conseillerObj.prenom': 1,
          'conseillerObj.nom': 1,
          'structureObj.nom': 1,
          'conseillerObj._id': 1,
          'conseillerObj.emailCN.address': 1,
          'conseillerObj.estCoordinateur': 1,
        },
      },
      { $sort: sortColonne },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getConseillersStatutRecrute =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      skip,
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      searchByStructure,
      region,
    } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const emailValidation = validConseillers.validate({
      skip,
      dateDebut,
      dateFin,
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      searchByStructure,
      region,
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
    const sortColonne = JSON.parse(`{"conseillerObj.${nomOrdre}":${ordre}}`);
    try {
      let conseillers: any[];
      const checkAccess = await checkAccessReadRequestMisesEnRelation(app, req);
      conseillers = await getConseillersRecruter(app, checkAccess)(
        dateDebut,
        dateFin,
        coordinateur as string,
        searchByConseiller as string,
        region as string,
        rupture as string,
        searchByStructure as string,
        sortColonne,
        skip as string,
        options.paginate.default,
      );
      conseillers = await Promise.all(
        conseillers.map(async (ligneStats) => {
          const item = { ...ligneStats };
          if (item.statut === 'nouvelle_rupture') {
            item.rupture = 'En cours';
          } else if (item.statut === 'finalisee_rupture') {
            item.rupture = 'Oui';
          } else {
            item.rupture = 'Non';
          }
          item.idPG = item.conseillerObj.idPG;
          item._id = item.conseillerObj._id;
          item.nom = item.conseillerObj.nom;
          item.prenom = item.conseillerObj.prenom;
          item.address = item.conseillerObj.emailCN.address;
          item.estCoordinateur = item.conseillerObj.estCoordinateur;
          item.nomStructure = item.structureObj.nom;
          item.craCount = await getNombreCras(app, req)(item._id);

          return item;
        }),
      );
      if (conseillers.length > 0) {
        const totalConseillers = await getTotalConseillersRecruter(
          app,
          checkAccess,
        )(
          dateDebut,
          dateFin,
          coordinateur as string,
          searchByConseiller as string,
          region as string,
          rupture as string,
          searchByStructure as string,
        );
        items.data = conseillers;
        items.total = totalConseillers[0]?.count_conseillers;
        items.limit = options.paginate.default;
        items.skip = Number(skip);
      }
      res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getConseillersStatutRecrute;
