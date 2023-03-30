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
import { validStatCsv } from '../../../schemas/stats.schemas';
import { formatDate } from '../../../utils';

const getExportStatistiquesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let { idType, nom, conseillerIds } = req.query;
    const {
      codePostal,
      ville,
      codeRegion,
      prenom,
      numeroDepartement,
      structureIds,
    } = req.query;
    const { type } = req.query;
    const dateDebut = new Date(req.query.dateDebut);
    const dateFin = new Date(req.query.dateFin);

    let idStructure: ObjectId;
    let idConseiller: ObjectId;
    let query: Object;
    let statistiques = {};
    const statsValidation = validStatCsv.validate({
      dateDebut,
      dateFin,
      codePostal,
      ville,
      codeRegion,
      numeroDepartement,
      nom,
      prenom,
      idType,
      type,
    });

    if (statsValidation.error) {
      res.status(400).json({ message: statsValidation.error.message });
      return;
    }
    const dateDebutFormat = formatDate(dateDebut);
    dateDebutFormat.setUTCHours(0, 0, 0, 0);
    const dateFinFormat = formatDate(dateFin);
    dateFinFormat.setUTCHours(23, 59, 59, 59);
    try {
      switch (type) {
        case 'nationales':
          query = {
            'cra.dateAccompagnement': {
              $gte: dateDebutFormat,
              $lte: dateFinFormat,
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
              $gte: dateDebutFormat,
              $lte: dateFinFormat,
            },
            'conseiller.$id': { $in: conseillerIds },
          };
          if (codePostal) {
            query['cra.codePostal'] = codePostal;
          }
          if (ville) {
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
              $gte: dateDebutFormat,
              $lte: dateFinFormat,
            },
            'conseiller.$id': { $eq: idConseiller },
          };
          if (codePostal) {
            query['cra.codePostal'] = codePostal;
          }
          if (ville) {
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
            dateFinFormat,
            type,
            idType,
            app,
          );

          query = {
            'cra.dateAccompagnement': {
              $gte: dateDebutFormat,
              $lte: dateFinFormat,
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
          req.query = {
            dateDebutFormat,
            dateFinFormat,
            structureIds,
            conseillerIds,
            codeRegion,
            numeroDepartement,
            ville,
          };
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
        dateDebutFormat,
        dateFinFormat,
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
