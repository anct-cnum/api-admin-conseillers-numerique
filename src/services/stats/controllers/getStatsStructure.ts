import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';

import getStatsGlobales from './getStatsGlobales';
import { getConseillersIdsByStructure } from '../../cras/cras.repository';

const getStatsStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idStructure = new ObjectId(String(req.query?.idStructure));
      const dateDebut = new Date(String(req.query.dateDebut));
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(String(req.query.dateFin));
      dateFin.setUTCHours(23, 59, 59, 59);
      const conseillerIds = await getConseillersIdsByStructure(
        idStructure,
        app,
      );
      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
        'conseiller.$id': { $in: conseillerIds },
      };
      if (req.query?.codePostal !== '' && req.query?.codePostal !== 'null') {
        query['cra.codePostal'] = req.query?.codePostal;
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
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getStatsStructure;
