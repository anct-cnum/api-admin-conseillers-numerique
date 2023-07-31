import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';

import getStatsGlobales from './getStatsGlobales';
import { validStatStructure } from '../../../schemas/stats.schemas';

const getStatsStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idStructure = String(req.query?.idStructure);
      const dateDebut = new Date(req.query.dateDebut);
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(req.query.dateFin);
      dateFin.setUTCHours(23, 59, 59, 59);
      const { codePostal, codeCommune } = req.query;
      const statsValidation = validStatStructure.validate({
        dateDebut,
        dateFin,
        idStructure,
        codePostal,
        codeCommune,
      });

      if (statsValidation.error) {
        return res.status(400).json({ message: statsValidation.error.message });
      }
      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
        'structure.$id': new ObjectId(idStructure),
      };
      if (codePostal) {
        query['cra.codePostal'] = codePostal;
      }
      if (codeCommune !== 'null' && codeCommune !== '') {
        query['cra.codeCommune'] = codeCommune;
      }

      const donneesStats = await getStatsGlobales(
        query,
        req.ability,
        action.read,
        app,
      );

      return res.status(200).json(donneesStats);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStatsStructure;
