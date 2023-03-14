import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { generateCsvHistoriqueDossiersConvention } from '../exports.repository';
import { validExportHistoriqueConvention } from '../../../schemas/reconventionnement.schemas';
import { checkAccessReadRequestStructures } from '../../structures/repository/structures.repository';
import {
  filterDateDemandeHistorique,
  filterStatutHistorique,
} from '../../structures/repository/reconventionnement.repository';

const getExportHistoriqueDossiersConventionCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { type } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const pageValidation = validExportHistoriqueConvention.validate({
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
      const structures: IStructures[] = await app
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
              dossierReconventionnement: 1,
              dossierConventionnement: 1,
              statutConventionnement: 1,
            },
          },
        ]);

      generateCsvHistoriqueDossiersConvention(structures, res);
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
