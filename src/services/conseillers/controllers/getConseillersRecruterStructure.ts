import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestConseillers,
  filterIsCoordinateur,
  filterNomConseiller,
  filterRegion,
  formatStatutMisesEnRelation,
  filterDepartement,
  filterIsRuptureMisesEnRelationStructure,
} from '../conseillers.repository';
import { checkAccessReadRequestConseillersRuptures } from '../../conseillersRuptures/conseillersRuptures.repository';
import { checkAccessReadRequestMisesEnRelation } from '../../misesEnRelation/misesEnRelation.repository';
import { getNombreCras } from '../../cras/cras.repository';
import { validConseillersStructure } from '../../../schemas/conseillers.schemas';

const getMisesEnRelationRecruter =
  (app: Application, checkAccess) =>
  async (
    rupture: string,
    conseillerIds: ObjectId[],
    conseillerIdsRupture: ObjectId[],
    piecesManquantes: boolean,
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          $and: [
            checkAccess,
            filterIsRuptureMisesEnRelationStructure(
              rupture,
              conseillerIds,
              conseillerIdsRupture,
              piecesManquantes,
            ),
          ],
        },
      },
      {
        $project: {
          _id: 0,
          statut: 1,
          dossierIncompletRupture: 1,
          'conseillerObj.idPG': 1,
          'conseillerObj.prenom': 1,
          'conseillerObj.nom': 1,
          'structureObj.nom': 1,
          'conseillerObj._id': 1,
          'conseillerObj.emailCN.address': 1,
          'conseillerObj.estCoordinateur': 1,
        },
      },
    ]);

const getConseillersRecruter =
  (app: Application, checkAccess) =>
  async (
    dateDebut: Date,
    dateFin: Date,
    isCoordinateur: string,
    searchByConseiller: string,
    region: string,
    departement: string,
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $addFields: {
          nomPrenomStr: { $concat: ['$nom', ' ', '$prenom'] },
        },
      },
      {
        $addFields: {
          prenomNomStr: { $concat: ['$prenom', ' ', '$nom'] },
        },
      },
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          $or: [
            {
              statut: { $eq: 'RECRUTE' },
              datePrisePoste: { $gte: dateDebut, $lte: dateFin },
            },
            { statut: { $eq: 'RECRUTE' }, datePrisePoste: null },
          ],
          ...filterIsCoordinateur(isCoordinateur),
          ...filterNomConseiller(searchByConseiller),
          ...filterRegion(region),
          ...filterDepartement(departement),
          $and: [checkAccess],
        },
      },
      {
        $project: {
          _id: 1,
        },
      },
    ]);

const getConseillersRuptures =
  (app: Application, checkAccess) =>
  async (
    dateDebut: Date,
    dateFin: Date,
    isCoordinateur: string,
    searchByConseiller: string,
    region: string,
    departement: string,
  ) =>
    app.service(service.conseillersRuptures).Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
        },
      },
      {
        $lookup: {
          localField: 'conseillerId',
          from: 'conseillers',
          foreignField: '_id',
          as: 'conseiller',
        },
      },
      {
        $lookup: {
          localField: 'conseillerId',
          from: 'conseillersSupprimes',
          foreignField: 'conseiller._id',
          as: 'conseillerSupprime',
        },
      },
      {
        $addFields: {
          mergedObject: {
            $mergeObjects: [
              {},
              { $arrayElemAt: ['$conseiller', 0] },
              { $arrayElemAt: ['$conseillerSupprime.conseiller', 0] },
            ],
          },
        },
      },
      {
        $project: {
          idPG: '$mergedObject.idPG',
          nom: '$mergedObject.nom',
          prenom: '$mergedObject.prenom',
          datePrisePoste: '$mergedObject.datePrisePoste',
          estCoordinateur: '$mergedObject.estCoordinateur',
          codeRegion: '$mergedObject.codeRegion',
          codeDepartement: '$mergedObject.codeDepartement',
          _id: '$mergedObject._id',
        },
      },
      {
        $addFields: {
          nomPrenomStr: { $concat: ['$nom', ' ', '$prenom'] },
        },
      },
      {
        $addFields: {
          prenomNomStr: { $concat: ['$prenom', ' ', '$nom'] },
        },
      },
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          $or: [
            {
              datePrisePoste: { $gte: dateDebut, $lte: dateFin },
            },
            { datePrisePoste: null },
          ],
          ...filterIsCoordinateur(isCoordinateur),
          ...filterNomConseiller(searchByConseiller),
          ...filterRegion(region),
          ...filterDepartement(departement),
        },
      },
    ]);

const getConseillersStatutRecruteStructure =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      region,
      departement,
      piecesManquantes,
    } = req.query;

    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const validConseillers = validConseillersStructure.validate({
      dateDebut,
      dateFin,
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      region,
      departement,
      piecesManquantes,
    });

    if (validConseillers.error) {
      res.statusMessage = validConseillers.error.message;
      return res.status(400).end();
    }
    const items: { total: number; data: object; limit: number; skip: number } =
      {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
    try {
      let misesEnRelation: any[] = [];
      let conseillersRuptures: any[] = [];
      let conseillersRecruter: any[] = [];
      const checkAccessConseiller = await checkAccessReadRequestConseillers(
        app,
        req,
      );
      const checkAccessConseillerRupture =
        await checkAccessReadRequestConseillersRuptures(app, req);
      const checkAccesMisesEnRelation =
        await checkAccessReadRequestMisesEnRelation(app, req);
      if (rupture !== 'finalisee_rupture') {
        conseillersRecruter = await getConseillersRecruter(
          app,
          checkAccessConseiller,
        )(
          dateDebut,
          dateFin,
          coordinateur as string,
          searchByConseiller as string,
          region as string,
          departement as string,
        );
      }
      if (rupture === 'finalisee_rupture' || !rupture) {
        conseillersRuptures = await getConseillersRuptures(
          app,
          checkAccessConseillerRupture,
        )(
          dateDebut,
          dateFin,
          coordinateur as string,
          searchByConseiller as string,
          region as string,
          departement as string,
        );
        conseillersRuptures = await Promise.all(
          conseillersRuptures.map(async (ligneStats) => {
            const item = { ...ligneStats };
            item.rupture = 'Sans mission';
            if (!item.nom && !item.prenom) {
              item.statut = 'SUPPRIMER';
            } else {
              item.statut = 'RUPTURE';
            }

            return item;
          }),
        );
      }
      const conseillersEnRupture = conseillersRuptures.filter(
        (conseiller) => conseiller.statut === 'RUPTURE',
      );
      const conseillersSupprimer = await Promise.all(
        await conseillersRuptures
          .filter((conseiller) => conseiller.statut === 'SUPPRIMER')
          .map(async (conseiller) => {
            const item = { ...conseiller };
            item.craCount = await getNombreCras(app, req)(item._id);

            return item;
          }),
      );
      misesEnRelation = await getMisesEnRelationRecruter(
        app,
        checkAccesMisesEnRelation,
      )(
        rupture as string,
        conseillersRecruter.map((conseiller) => conseiller._id),
        conseillersEnRupture.map((conseiller) => conseiller._id),
        piecesManquantes,
      );

      misesEnRelation = await Promise.all(
        misesEnRelation.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.rupture = formatStatutMisesEnRelation(
            item.statut,
            item?.dossierIncompletRupture,
          );
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
      misesEnRelation = misesEnRelation.concat(conseillersSupprimer);
      switch (nomOrdre) {
        case 'nom':
          misesEnRelation = misesEnRelation.sort((a, b) => {
            if (a.nom < b.nom) {
              return ordre < 0 ? 1 : -1;
            }
            if (a.nom > b.nom) {
              return ordre;
            }
            return 0;
          });
          break;
        case 'idPG':
          misesEnRelation = misesEnRelation.sort((a, b) => {
            if (a.idPG < b.idPG) {
              return ordre < 0 ? 1 : -1;
            }
            if (a.idPG > b.idPG) {
              return ordre;
            }
            return 0;
          });
          break;
        case 'prenom':
        default:
          misesEnRelation = misesEnRelation.sort((a, b) => {
            if (a.prenom < b.prenom) {
              return ordre < 0 ? 1 : -1;
            }
            if (a.prenom > b.prenom) {
              return ordre;
            }
            return 0;
          });
      }
      if (misesEnRelation.length > 0) {
        items.data = misesEnRelation;
        items.total = misesEnRelation.length;
        items.limit = options.paginate.default;
      }
      return res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getConseillersStatutRecruteStructure;
