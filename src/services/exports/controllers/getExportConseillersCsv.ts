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
} from '../../conseillers/conseillers.repository';
import { generateCsvConseillers } from '../exports.repository';
import { getNombreCras } from '../../cras/cras.repository';
import checkAccessReadRequestMisesEnRelation from '../../misesEnRelation/misesEnRelation.repository';

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
          ...filterIsCoordinateur(isCoordinateur),
          ...filterNomConseiller(searchByConseiller),
          ...filterRegion(region),
          ...filterIsRuptureConseiller(rupture, dateDebut, dateFin),
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
          'conseillerObj._id': 1,
          'conseillerObj.idPG': 1,
          'conseillerObj.prenom': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.emailCN.address': 1,
          dateRecrutement: 1,
          statut: 1,
          'structureObj.idPG': 1,
          'structureObj._id': 1,
          'structureObj.nom': 1,
          'conseillerObj.telephonePro': 1,
          'conseillerObj.email': 1,
          'conseillerObj.datePrisePoste': 1,
          'conseillerObj.dateFinFormation': 1,
          'conseillerObj.disponible': 1,
          'conseillerObj.estCoordinateur': 1,
        },
      },
      { $sort: sortColonne },
    ]);

const getExportConseillersCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
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
    });

    if (emailValidation.error) {
      res.statusMessage = emailValidation.error.message;
      res.status(400).end();
      return;
    }
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
      );
      misesEnRelation = await Promise.all(
        misesEnRelation.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.craCount = await getNombreCras(
            app,
            req,
          )(item.conseillerObj?._id);

          return item;
        }),
      );

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

export default getExportConseillersCsv;
