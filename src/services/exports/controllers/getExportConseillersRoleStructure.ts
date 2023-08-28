import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validExportConseillers } from '../../../schemas/conseillers.schemas';
import {
  filterIsCoordinateur,
  filterNomConseiller,
  filterRegion,
  filterNomStructure,
  filterIsRuptureConseiller,
  filterIsRuptureMisesEnRelation,
  checkAccessReadRequestConseillers,
  filterDepartement,
  formatStatutMisesEnRelation,
  filterIsRuptureMisesEnRelationStructure,
} from '../../conseillers/conseillers.repository';
import { generateCsvConseillers } from '../exports.repository';
import { getNombreCras } from '../../cras/cras.repository';
import { checkAccessReadRequestMisesEnRelation } from '../../misesEnRelation/misesEnRelation.repository';
import { checkAccessReadRequestConseillersRuptures } from '../../conseillersRuptures/conseillersRuptures.repository';

const getMisesEnRelationRecruter =
  (app: Application, checkAccess) =>
  async (
    rupture: string,
    conseillerIds: ObjectId[],
    conseillerIdsRuptures: ObjectId[],
    piecesManquantes: boolean,
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          $and: [
            checkAccess,
            filterIsRuptureMisesEnRelation(
              rupture,
              conseillerIds,
              
              conseillerIdsRuptures,
              piecesManquantes,
            ),
          ],
        },
      },
      {
        $project: {
          _id: 0,
          'conseillerObj._id': 1,
          'conseillerObj.idPG': 1,
          'conseillerObj.prenom': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.emailCN.address': 1,
          statut: 1,
          dossierIncompletRupture: 1,
          dateDebutDeContrat: 1,
          dateFinDeContrat: 1,
          typeDeContrat: 1,
          salaire: 1,
          'structureObj.idPG': 1,
          'structureObj._id': 1,
          'structureObj.nom': 1,
          'structureObj.codePostal': 1,
          'conseillerObj.telephonePro': 1,
          'conseillerObj.email': 1,
          'conseillerObj.datePrisePoste': 1,
          'conseillerObj.dateFinFormation': 1,
          'conseillerObj.disponible': 1,
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
          statut: '$mergedObject.statut',
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

const getExportConseillersRoleStructureCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      searchByStructure,
      region,
      departement,
      piecesManquantes,
    } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const emailValidation = validExportConseillers.validate({
      dateDebut,
      dateFin,
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      searchByStructure,
      region,
      departement,
      piecesManquantes,
    });

    if (emailValidation.error) {
      res.statusMessage = emailValidation.error.message;
      res.status(400).end();
      return;
    }
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
            }
            item.craCount = await getNombreCras(app, req)(item._id);

            return item;
          }),
        );
      }
      misesEnRelation = misesEnRelation.concat(conseillersRuptures);
      misesEnRelation = await getMisesEnRelationRecruter(
        app,
        checkAccesMisesEnRelation,
      )(
        rupture as string,
        conseillersRecruter.map((conseiller) => conseiller._id),
        conseillersRuptures.map((conseiller) => conseiller._id),
        piecesManquantes,
      );

      misesEnRelation = await Promise.all(
        misesEnRelation.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.craCount = await getNombreCras(app, req)(item._id);

          return item;
        }),
      );
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
      generateCsvConseillers(misesEnRelation, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportConseillersRoleStructureCsv;
