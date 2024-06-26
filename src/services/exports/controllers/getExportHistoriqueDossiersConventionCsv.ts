import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvHistoriqueDossiersConvention } from '../exports.repository';
import { validHistoriqueConvention } from '../../../schemas/reconventionnement.schemas';
import {
  checkAccessReadRequestStructures,
  filterDepartement,
  filterRegion,
  filterSearchBar,
} from '../../structures/repository/structures.repository';
import {
  filterDateDemandeAndStatutHistorique,
  sortExportHistoriqueDossierConventionnement,
} from '../../structures/repository/reconventionnement.repository';

const getExportHistoriqueDossiersConventionCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      type,
      nomOrdre,
      ordre,
      searchByNomStructure,
      region,
      departement,
      avisAdmin,
    } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut);
    const dateFin: Date = new Date(req.query.dateFin);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);

    const pageValidation = validHistoriqueConvention.validate({
      type,
      dateDebut,
      dateFin,
      nomOrdre,
      ordre,
      searchByNomStructure,
      region,
      departement,
      avisAdmin,
    });
    if (pageValidation.error) {
      res.status(400).json({ message: pageValidation.error.message });
      return;
    }
    try {
      const checkAccessStructure = await checkAccessReadRequestStructures(
        app,
        req,
      );
      const structures: any[] = await app
        .service(service.structures)
        .Model.aggregate([
          { $addFields: { idPGStr: { $toString: '$idPG' } } },
          {
            $match: {
              $and: [
                checkAccessStructure,
                filterDateDemandeAndStatutHistorique(
                  type,
                  dateDebut,
                  dateFin,
                  avisAdmin,
                  ['VALIDATION_COSELEC', 'ABANDON'],
                ),
                filterSearchBar(searchByNomStructure),
              ],
              ...filterRegion(region),
              ...filterDepartement(departement),
            },
          },
          {
            $project: {
              _id: 1,
              nom: 1,
              siret: 1,
              idPG: 1,
              type: 1,
              createdAt: 1,
              codeRegion: 1,
              codeDepartement: 1,
              statut: 1,
              conventionnement: 1,
              coselec: 1,
              demandesCoselec: 1,
              codeCom: 1,
              prefet: { $arrayElemAt: ['$prefet', -1] },
              structureID: {
                $arrayElemAt: ['$prefet.idStructureTransfert', -1],
              },
              structureTransfertAvenantIDs: {
                $map: {
                  input: '$demandesCoselec',
                  as: 'demande',
                  in: '$$demande.prefet.idStructureTransfert',
                },
              },
            },
          },
          {
            $addFields: {
              structureID: { $toObjectId: '$structureID' },
            },
          },
          {
            $lookup: {
              from: 'structures',
              localField: 'structureID',
              foreignField: '_id',
              as: 'transfertStructure',
            },
          },
          {
            $unwind: {
              path: '$transfertStructure',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'structures',
              localField: 'structureTransfertAvenantIDs',
              foreignField: '_id',
              as: 'structureTransfertAvenantDetails',
            },
          },
          {
            $project: {
              _id: 1,
              nom: 1,
              siret: 1,
              idPG: 1,
              type: 1,
              createdAt: 1,
              codeRegion: 1,
              codeDepartement: 1,
              statut: 1,
              conventionnement: 1,
              coselec: 1,
              demandesCoselec: 1,
              codeCom: 1,
              'transfertStructure.idPG': 1,
              'structureTransfertAvenantDetails.idPG': 1,
              'structureTransfertAvenantDetails._id': 1,
            },
          },
        ]);
      const structuresFormat = sortExportHistoriqueDossierConventionnement(
        type,
        ordre,
        structures,
      );
      generateCsvHistoriqueDossiersConvention(structuresFormat, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportHistoriqueDossiersConventionCsv;
