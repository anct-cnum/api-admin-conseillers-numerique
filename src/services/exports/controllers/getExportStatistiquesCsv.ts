import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from '../../stats/controllers/getStatsGlobales';
import { generateCsvStatistiques } from '../exports.repository';
import {
  getConseillersIdsByStructure,
  getConseillersIdsByTerritoire,
} from '../../cras/cras.repository';
import service from '../../../helpers/services';
import { getStatsNationalesGrandReseau } from '../../stats/controllers';

const getExportStatistiquesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let { idType, codePostal, ville, nom, prenom } = req.query;
    const { type } = req.query;
    const dateDebut = new Date(String(req.query.dateDebut));
    dateDebut.setUTCHours(0, 0, 0, 0);
    const dateFin = new Date(String(req.query.dateFin));
    dateFin.setUTCHours(23, 59, 59, 59);
    idType = idType === 'undefined' ? '' : idType;
    codePostal = codePostal === 'undefined' ? '' : codePostal;
    ville = ville === 'undefined' ? '' : ville;
    nom = nom === 'undefined' ? '' : nom;
    prenom = prenom === 'undefined' ? '' : prenom;
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
          // eslint-disable-next-line no-case-declarations
          const structure = await app
            .service(service.structures)
            .Model.findOne({ _id: idStructure }, { nom: 1, _id: 0 });
          nom = structure.nom;
          idType = undefined;
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
          idType = undefined;
          break;
        case 'codeDepartement':
        case 'codeRegion':
          conseillerIds = await getConseillersIdsByTerritoire(
            dateFin,
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
        case 'grandReseau':
          statistiques = await getStatsNationalesGrandReseau(app, true)(
            req,
            res,
          );
          break;
        default:
          break;
      }

      generateCsvStatistiques(
        statistiques,
        dateDebut,
        dateFin,
        type,
        idType,
        codePostal,
        nom,
        prenom,
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
