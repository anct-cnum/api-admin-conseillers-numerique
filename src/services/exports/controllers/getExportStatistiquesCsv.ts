import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from '../../stats/controllers/getStatsGlobales';
import { generateCsvStatistiques } from '../exports.repository';
import { getStructuresIdsByTerritoire } from '../../cras/cras.repository';
import service from '../../../helpers/services';
import { getStatsNationalesGrandReseau } from '../../stats/controllers';
import { validStatCsv } from '../../../schemas/stats.schemas';
import { formatDateGMT } from '../../../utils';

const labelsCorrespondance = require('../../../../datas/themesCorrespondances.json');

const sortByName = (a, b) => {
  if (a.nom < b.nom) {
    return -1;
  }
  if (a.nom > b.nom) {
    return 1;
  }
  return 0;
};

function matchCorrespondance(stats) {
  return {
    nom: labelsCorrespondance.find((label) => label.nom === stats.nom)
      .correspondance,
    percent: stats.percent,
    valeur: stats.valeur,
  };
}

const getExportStatistiquesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let { idType, nom, idStructure, idConseiller } = req.query;
    const {
      codePostal,
      ville,
      codeCommune,
      codeRegion,
      prenom,
      numeroDepartement,
    } = req.query;
    const { type } = req.query;
    const dateDebut = new Date(req.query.dateDebut);
    const dateFin = new Date(req.query.dateFin);
    let query: Object;
    let statistiques = {};
    const statsValidation = validStatCsv.validate({
      dateDebut,
      dateFin,
      codePostal,
      ville,
      codeCommune,
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
    if (idConseiller && !ObjectId.isValid(idConseiller)) {
      res.status(400).json({ message: 'Id conseiller incorrect' });
      return;
    }
    if (idStructure && !ObjectId.isValid(idStructure)) {
      res.status(400).json({ message: 'Id structure incorrect' });
      return;
    }
    const dateDebutFormat = formatDateGMT(dateDebut);
    dateDebutFormat.setUTCHours(0, 0, 0, 0);
    const dateFinFormat = formatDateGMT(dateFin);
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
          query = {
            'cra.dateAccompagnement': {
              $gte: dateDebutFormat,
              $lte: dateFinFormat,
            },
            'structure.$id': idStructure,
          };
          if (codePostal) {
            query['cra.codePostal'] = codePostal;
          }
          if (codeCommune !== 'null' && codeCommune !== '') {
            query['cra.codeCommune'] = codeCommune;
          }
          statistiques = await getStatsGlobales(
            query,
            req.ability,
            action.read,
            app,
          );
          // @ts-expect-error
          statistiques.statsThemes = statistiques.statsThemes
            .map(matchCorrespondance)
            .sort(sortByName);
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
          if (idStructure) {
            query['structure.$id'] = { $eq: new ObjectId(idStructure) };
          }
          if (codeCommune !== 'null' && codeCommune !== '') {
            query['cra.codeCommune'] = codeCommune;
          }
          statistiques = await getStatsGlobales(
            query,
            req.ability,
            action.read,
            app,
          );
          // @ts-expect-error
          statistiques.statsThemes = statistiques.statsThemes
            .map(matchCorrespondance)
            .sort(sortByName);
          idType = undefined;
          break;
        case 'codeDepartement':
        case 'codeRegion':
          // eslint-disable-next-line no-case-declarations
          const structureIds = await getStructuresIdsByTerritoire(
            type,
            idType,
            app,
          );
          query = {
            'cra.dateAccompagnement': {
              $gte: dateDebutFormat,
              $lte: dateFinFormat,
            },
            'structure.$id': { $in: structureIds },
          };
          statistiques = await getStatsGlobales(
            query,
            req.ability,
            action.read,
            app,
          );
          // @ts-expect-error
          statistiques.statsThemes = statistiques.statsThemes
            .map(matchCorrespondance)
            .sort(sortByName);
          break;
        case 'grandReseau':
          req.query = {
            dateDebut: dateDebutFormat,
            dateFin: dateFinFormat,
            idStructure,
            idConseiller,
            codeRegion,
            numeroDepartement,
            codeCommune,
            codePostal,
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
        ville,
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
