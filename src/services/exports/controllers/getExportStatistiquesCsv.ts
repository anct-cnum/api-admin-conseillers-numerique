import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from '../../stats/controllers/getStatsGlobales';
import { generateCsvSatistiques } from '../exports.repository';
import {
  getConseillersIdsByStructure,
  getConseillersIdsByTerritoire,
} from '../../cras/cras.repository';

const getExportStatistiquesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let { idType, codePostal, ville } = req.query;
    const { type } = req.query;
    const dateDebut = new Date(String(req.query.dateDebut));
    dateDebut.setUTCHours(0, 0, 0, 0);
    const dateFin = new Date(String(req.query.dateFin));
    dateFin.setUTCHours(23, 59, 59, 59);
    idType = idType === 'undefined' ? '' : idType;
    codePostal = codePostal === 'undefined' ? '' : codePostal;
    ville = ville === 'undefined' ? '' : ville;
    let idStructure: ObjectId;
    let idConseiller: ObjectId;
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
          conseillerIds = await getConseillersIdsByStructure(idStructure, app);
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
          if (ville !== '' && ville !== 'null') {
            query['cra.nomCommune'] = ville;
          }
          statistiques = await getStatsGlobales(
            query,
            req.ability,
            action.read,
            app,
          );
          break;
        case 'conseiller':
          idConseiller = new ObjectId(String(idType));
          query = {
            'cra.dateAccompagnement': {
              $gte: dateDebut,
              $lte: dateFin,
            },
            'conseiller.$id': { $eq: idConseiller },
          };
          if (codePostal !== '' && codePostal !== 'null') {
            query['cra.codePostal'] = codePostal;
          }
          if (ville !== '' && ville !== 'null') {
            query['cra.nomCommune'] = ville;
          }
          statistiques = await getStatsGlobales(
            query,
            req.ability,
            action.read,
            app,
          );
          break;
        case 'codeDepartement' || 'codeRegion':
          conseillerIds = await getConseillersIdsByTerritoire(
            type,
            idType,
            app,
          );

          query = {
            'cra.dateAccompagnement': {
              $gte: dateDebut,
              $lte: dateFin,
            },
            'conseiller.$id': { $in: conseillerIds },
          };
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

      generateCsvSatistiques(
        statistiques,
        dateDebut,
        dateFin,
        type,
        idType,
        codePostal,
        res,
      );
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportStatistiquesCsv;
