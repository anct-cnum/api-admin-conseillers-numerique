import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvHistoriqueDossiersConvention } from '../exports.repository';
import { validHistoriqueConvention } from '../../../schemas/reconventionnement.schemas';
import { checkAccessReadRequestStructures } from '../../structures/repository/structures.repository';
import {
  filterDateDemandeHistorique,
  filterStatutHistorique,
} from '../../structures/repository/reconventionnement.repository';
import { getCoselec } from '../../../utils';

const getExportHistoriqueDossiersConventionCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { type } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut);
    const dateFin: Date = new Date(req.query.dateFin);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    const pageValidation = validHistoriqueConvention.validate({
      type,
      dateDebut,
      dateFin,
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
          {
            $match: {
              $and: [checkAccessStructure],
              ...filterStatutHistorique(type),
              ...filterDateDemandeHistorique(type, dateDebut, dateFin),
            },
          },
          {
            $project: {
              _id: 1,
              nom: 1,
              idPG: 1,
              nombreConseillersSouhaites: 1,
              statut: 1,
              conventionnement: 1,
              coselec: 1,
            },
          },
        ]);
      const structuresFormat = await Promise.all(
        structures.map(async (structure) => {
          const item = { ...structure };
          if (item.conventionnement.statut === 'CONVENTIONNEMENT_VALIDÉ') {
            const coselec = getCoselec(item);
            item.conventionnement.nbPostesAttribuees =
              coselec?.nombreConseillersCoselec ?? 0;
            item.conventionnement.dateDeCreation =
              item.conventionnement.dossierConventionnement.dateDeCreation;
            item.conventionnement.statut = 'Conventionnement';

            return item;
          }
          item.conventionnement.nbPostesAttribuees =
            item.conventionnement.dossierReconventionnement.nbPostesAttribuees;
          item.conventionnement.dateDeCreation =
            item.conventionnement.dossierReconventionnement.dateDeCreation;
          item.conventionnement.dateFinProchainContrat =
            item.conventionnement.dossierReconventionnement.dateFinProchainContrat;
          item.conventionnement.statut = 'Reconventionnement';

          return item;
        }),
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
