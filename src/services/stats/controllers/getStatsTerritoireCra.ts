import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validTerritoireCra } from '../../../schemas/territoires.schemas';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from './getStatsGlobales';
import { getStructuresIdsByTerritoire } from '../../cras/cras.repository';

const getStatsTerritoireCra =
  (app: Application) => async (req: IRequest, res: Response) => {
    const dateFin: Date = new Date(req.query.dateFin);
    const dateDebut: Date = new Date(req.query.dateDebut);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    const { typeTerritoire, idTerritoire } = req.query;
    const statsValidation = validTerritoireCra.validate({
      typeTerritoire,
      idTerritoire,
      dateDebut,
      dateFin,
    });
    if (statsValidation.error) {
      res.statusMessage = statsValidation.error.message;
      res.status(400).end();
      return;
    }
    const structureIds = await getStructuresIdsByTerritoire(
      typeTerritoire,
      idTerritoire,
      app,
    );
    try {
      if (structureIds) {
        const query = {
          'cra.dateAccompagnement': {
            $gte: dateDebut,
            $lte: dateFin,
          },
          'structure.$id': { $in: structureIds },
        };
        const stats = await getStatsGlobales(
          query,
          req.ability,
          action.read,
          app,
          false,
          null,
          'territoire',
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
