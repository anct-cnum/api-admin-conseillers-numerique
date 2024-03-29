import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from './getStatsGlobales';
import { validStatConseiller } from '../../../schemas/stats.schemas';

const getStatsConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idConseiller = String(req.query?.idConseiller);
      const dateDebut = new Date(req.query.dateDebut);
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(req.query.dateFin);
      dateFin.setUTCHours(23, 59, 59, 59);
      const { codePostal, codeCommune, idStructure } = req.query;
      const statsValidation = validStatConseiller.validate({
        dateDebut,
        dateFin,
        codePostal,
        codeCommune,
      });
      if (!ObjectId.isValid(idConseiller)) {
        res.status(400).json({ message: "l'id du conseiller est invalide" });
        return;
      }
      if (idStructure && !ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: "l'id de la structure est invalide" });
        return;
      }
      if (statsValidation.error) {
        res.status(400).json({ message: statsValidation.error.message });
        return;
      }
      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
        'conseiller.$id': { $eq: new ObjectId(idConseiller) },
      };

      if (codePostal) {
        query['cra.codePostal'] = codePostal;
      }
      if (
        req.query?.codeCommune !== '' &&
        req.query?.codeCommune !== 'null' &&
        req.query?.codeCommune !== undefined
      ) {
        query['cra.codeCommune'] = req.query?.codeCommune;
      }
      if (idStructure) {
        query['structure.$id'] = new ObjectId(idStructure);
      }
      const donneesStats = await getStatsGlobales(
        query,
        req.ability,
        action.read,
        app,
      );

      res.status(200).json(donneesStats);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStatsConseiller;
