import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validConseillers } from '../../../schemas/conseillers.schemas';
import {
  checkAccessReadRequestConseillers,
  filterIsCoordinateur,
  filterIsRuptureMisesEnRelation,
  filterIsRuptureConseiller,
  filterNomConseiller,
  filterNomStructure,
  filterRegion,
  formatStatutMisesEnRelation,
} from '../conseillers.repository';
import { getNombreCras } from '../../cras/cras.repository';
import checkAccessReadRequestMisesEnRelation from '../../misesEnRelation/misesEnRelation.repository';

const getTotalConseillersRecruter =
  (app: Application, checkAccess) =>
  async (
    rupture: string,
    searchByStructure: string,
    structureIds: ObjectId[],
    conseillerIdsRecruter: ObjectId[],
    conseillerIdsRupture: ObjectId[],
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          ...filterIsRuptureMisesEnRelation(
            rupture,
            conseillerIdsRecruter,
            structureIds,
            conseillerIdsRupture,
          ),
          ...filterNomStructure(searchByStructure),
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
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $match: {
          ...filterIsRuptureConseiller(rupture, dateDebut, dateFin),
          ...filterIsCoordinateur(isCoordinateur),
          ...filterNomConseiller(searchByConseiller),
          ...filterRegion(region),
          $and: [checkAccess],
        },
      },
      {
        $project: {
          structureId: 1,
          statut: 1,
        },
      },
    ]);

const getMisesEnRelationRecruter =
  (app: Application, checkAccess) =>
  async (
    rupture: string,
    searchByStructure: string,
    structureIds: ObjectId[],
    conseillerIdsRecruter: ObjectId[],
    conseillerIdsRupture: ObjectId[],
    sortColonne: object,
    skip: string,
    limit: number,
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          ...filterIsRuptureMisesEnRelation(
            rupture,
            conseillerIdsRecruter,
            structureIds,
            conseillerIdsRupture,
          ),
          ...filterNomStructure(searchByStructure),
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
      let misesEnRelation: any[];
      const checkAccesMisesEnRelation =
        await checkAccessReadRequestMisesEnRelation(app, req);
      const checkAccessConseiller = await checkAccessReadRequestConseillers(
        app,
        req,
      );
      const conseillers = await getConseillersRecruter(
        app,
        checkAccessConseiller,
      )(
        dateDebut,
        dateFin,
        coordinateur as string,
        searchByConseiller as string,
        region as string,
        rupture as string,
      );
      const conseillerRecruter = conseillers.filter(
        (conseiller) => conseiller.statut === 'RECRUTE',
      );
      const conseillerRupture = conseillers.filter(
        (conseiller) => conseiller.statut === 'RUPTURE',
      );
      misesEnRelation = await getMisesEnRelationRecruter(
        app,
        checkAccesMisesEnRelation,
      )(
        rupture as string,
        searchByStructure as string,
        conseillers.map((conseiller) => conseiller.structureId),
        conseillerRecruter.map((conseiller) => conseiller._id),
        conseillerRupture.map((conseiller) => conseiller._id),
        sortColonne,
        skip as string,
        options.paginate.default,
      );
      misesEnRelation = await Promise.all(
        misesEnRelation.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.rupture = formatStatutMisesEnRelation(item.statut);
          item.idPG = item.conseillerObj?.idPG;
          item._id = item.conseillerObj?._id;
          item.nom = item.conseillerObj?.nom;
          item.prenom = item.conseillerObj?.prenom;
          item.address = item.conseillerObj?.emailCN?.address;
          item.estCoordinateur = item.conseillerObj?.estCoordinateur;
          item.nomStructure = item.structureObj?.nom;
          item.craCount = await getNombreCras(app, req)(item._id);

          return item;
        }),
      );
      if (misesEnRelation.length > 0) {
        const totalConseillers = await getTotalConseillersRecruter(
          app,
          checkAccesMisesEnRelation,
        )(
          rupture as string,
          searchByStructure as string,
          conseillers.map((conseiller) => conseiller.structureId),
          conseillerRecruter.map((conseiller) => conseiller._id),
          conseillerRupture.map((conseiller) => conseiller._id),
        );
        items.data = misesEnRelation;
        items.total = totalConseillers[0]?.count_conseillers;
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

export default getConseillersStatutRecrute;
