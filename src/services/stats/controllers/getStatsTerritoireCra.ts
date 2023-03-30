import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validTerritoireCra } from '../../../schemas/territoires.schemas';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from './getStatsGlobales';

const getStatsTerritoireCra =
  (app: Application) => async (req: IRequest, res: Response) => {
    const dateFin: Date = new Date(req.query.dateFin);
    const dateDebut: Date = new Date(req.query.dateDebut);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    const conseillerIds = JSON.parse(req.query?.conseillerIds as string);
    const statsValidation = validTerritoireCra.validate({
      conseillerIds,
      dateDebut,
      dateFin,
    });
    if (statsValidation.error) {
      res.statusMessage = statsValidation.error.message;
      res.status(400).end();
      return;
    }
    try {
      if (conseillerIds) {
        const ids = conseillerIds.map((id: string) => new ObjectId(id));
        const query = {
          'cra.dateAccompagnement': {
            $gte: dateDebut,
            $lte: dateFin,
          },
          'conseiller.$id': { $in: ids },
        };
        const stats = await getStatsGlobales(
          query,
          req.ability,
          action.read,
          app,
        );
        res.status(200).json(stats);
      }
      res.status(200).end();
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStatsTerritoireCra;
