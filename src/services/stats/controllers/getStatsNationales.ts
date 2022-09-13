import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import { getStatsAccompagnements } from '../stats.repository';

const getStatsNationales =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      /* const cras: ICras[] | ICras = await app
        .service(service.cras)
        .Model.accessibleBy(req.ability, action.read)
        .find();
      */

      const dateDebut = new Date(String(req.query.dateDebut));
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(String(req.query.dateFin));
      dateFin.setUTCHours(23, 59, 59, 59);
      const accompagnements = await getStatsAccompagnements(
        {
          'cra.dateAccompagnement': {
            $gte: dateDebut,
            $lte: dateFin,
          },
        },
        app,
      );

      const donneesStats = {
        accompagnements,
      };
      res.status(200).json({ donneesStats });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
    }
  };

export default getStatsNationales;
