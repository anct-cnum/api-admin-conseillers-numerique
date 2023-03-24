import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';

import getStatsGlobales from './getStatsGlobales';
import { validStatNationales } from '../../../schemas/stats.schemas';

const getStatsNationales =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const dateDebut = new Date(String(req.query.dateDebut));
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(String(req.query.dateFin));
      dateFin.setUTCHours(23, 59, 59, 59);
      const statsValidation = validStatNationales.validate({
        dateDebut,
        dateFin,
      });

      if (statsValidation.error) {
        res.status(400).json({ message: statsValidation.error.message });
        return;
      }
      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      };
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

export default getStatsNationales;
