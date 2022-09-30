import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from '../../stats/controllers/getStatsGlobales';
import { generateCsvSatistiques } from '../exports.repository';
import { getConseillersIdsByStructure } from '../../cras/cras.repository';

const getExportStatistiquesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let { idType, codePostal } = req.query;
    const { type } = req.query;
    const dateDebut = new Date(String(req.query.dateDebut));
    dateDebut.setUTCHours(0, 0, 0, 0);
    const dateFin = new Date(String(req.query.dateFin));
    dateFin.setUTCHours(23, 59, 59, 59);
    idType = idType === 'undefined' ? '' : idType;
    codePostal = codePostal === 'undefined' ? '' : codePostal;
    let idStructure: ObjectId;
    let conseillerIds: ObjectId[];
    let query: Object;
    let statistiques = {};

    try {
      switch (type) {
        case 'nationales':
          query = {
            'cra.dateAccompagnement': {
              $gte: dateDebut,
              $lte: dateFin,
            },
          };
          statistiques = await getStatsGlobales(
            query,
            req.ability,
            action.read,
            app,
          );
          break;
        case 'structure':
          idStructure = new ObjectId(String(idType));
          conseillerIds = await getConseillersIdsByStructure(
            idStructure,
            req.ability,
            action.read,
            app,
          );
          query = {
            'cra.dateAccompagnement': {
              $gte: dateDebut,
              $lte: dateFin,
            },
            'conseiller.$id': { $in: conseillerIds },
          };
          if (codePostal !== '' && codePostal !== 'null') {
            query['cra.codePostal'] = codePostal;
          }
          statistiques = await getStatsGlobales(
            query,
            req.ability,
            action.read,
            app,
          );
          break;
        default:
          break;
      }
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.statusMessage = 'Accès refusé';
        res.status(403).end();
        return;
      }
      res.statusMessage = error.message;
      res.status(500).end();
      throw new Error(error);
    }

    generateCsvSatistiques(
      statistiques,
      dateDebut,
      dateFin,
      type,
      idType,
      codePostal,
      res,
    );
  };

export default getExportStatistiquesCsv;
