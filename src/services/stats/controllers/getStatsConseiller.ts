import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from './getStatsGlobales';

const getStatsConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idConseiller = new ObjectId(String(req.query?.idConseiller));
      const dateDebut = new Date(String(req.query.dateDebut));
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(String(req.query.dateFin));
      dateFin.setUTCHours(23, 59, 59, 59);

      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
        'conseiller.$id': { $eq: idConseiller },
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

export default getStatsConseiller;
