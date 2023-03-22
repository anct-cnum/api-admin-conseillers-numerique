import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  IRequest,
  ICodeRegion,
  IDepartement,
} from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from './getStatsGlobales';
import { validStatGrandReseau } from '../../../schemas/stats.schemas';

const departements = require('../../../../datas/imports/departements-region.json');
const codesRegions = require('../../../../datas/imports/code_region.json');

const getStatsNationalesGrandReseau =
  (app: Application, exportStats = false) =>
  // eslint-disable-next-line consistent-return
  async (req: IRequest, res: Response) => {
    try {
      const dateDebut = new Date(String(req.query.dateDebut));
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(String(req.query.dateFin));
      dateFin.setUTCHours(23, 59, 59, 59);
      const { codePostal, ville, codeRegion, numeroDepartement } = req.query;
      const structureIds = JSON.parse(req.query.structureIds);
      const conseillerIds = JSON.parse(req.query.conseillerIds);
      if (!exportStats) {
        const statsValidation = validStatGrandReseau.validate({
          dateDebut,
          dateFin,
          codePostal,
          ville,
          codeRegion,
          numeroDepartement,
        });

        if (statsValidation.error) {
          res.status(400).json({ message: statsValidation.error.message });
          return;
        }
      }
      let numerosDepartements: number[];

      // Rajout de la date dans la requête
      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      };
      // Si la requête contient un code région, on l'ajoute à la requête
      if (
        codeRegion !== '' &&
        codeRegion !== undefined &&
        codeRegion !== 'undefined' &&
        codeRegion !== 'tous'
      ) {
        const regionInfos = codesRegions.find(
          (region: ICodeRegion) => codeRegion === region.code,
        );
        // Si la région est la Corse, on ajoute les codes postaux de la Corse du Sud et de la Haute-Corse
        if (codeRegion === '94') {
          query['cra.codePostal'] = { $regex: `^200.*|^201.*|^202.*|^206.*` };
          // Sinon on ajoute les codes postaux des départements de la région
        } else if (codeRegion === '00') {
          query['cra.codePostal'] = '97150';
        } else {
          numerosDepartements = departements
            .filter(
              (departement: IDepartement) =>
                departement.region_name === regionInfos?.nom,
            )
            .map((departement: IDepartement) => departement.num_dep);

          const regexListDeps = numerosDepartements
            .map((e: Number) => `^${e}.*`)
            .join('|');
          query['cra.codePostal'] = { $regex: regexListDeps };
        }
      }
      // Si la requête contient un numéro de département, on l'ajoute à la requête
      if (
        numeroDepartement !== '' &&
        numeroDepartement !== undefined &&
        numeroDepartement !== 'undefined' &&
        numeroDepartement !== 'tous'
      ) {
        // Si le numéro de département est la Corse du Sud 2A, on ajoute les codes postaux de la Corse du Sud
        if (numeroDepartement === '2A') {
          query['cra.codePostal'] = { $regex: `^200.*|^201.*` };
        }
        // Si le numéro de département est la Haute-Corse 2B, on ajoute les codes postaux de la Haute-Corse
        else if (numeroDepartement === '2B') {
          query['cra.codePostal'] = { $regex: `^202.*|^206.*` };
        }
        // Si le numéro de département est Saint-Martin 978, on ajoute le code postal de Saint-Martin
        else if (numeroDepartement === '978') {
          query['cra.codePostal'] = '97150';
        }
        // Sinon on ajoute les codes postaux du département
        else {
          query['cra.codePostal'] = { $regex: `^${numeroDepartement}.*` };
        }
      }
      // Instanciation de la requête pour récupérer les codes postaux
      let codesPostauxQuery = {};
      if (query['cra.codePostal']) {
        codesPostauxQuery = {
          'cra.codePostal': query['cra.codePostal'],
        };
      }
      // Si la requête contient une ville, on l'ajoute à la requête avec le code postal associé
      if (
        ville !== '' &&
        ville !== undefined &&
        ville !== 'undefined' &&
        codePostal !== 'tous'
      ) {
        query['cra.codePostal'] = codePostal;
        query['cra.nomCommune'] = ville;
      }
      // Si la requête contient une structure, on l'ajoute à la requête
      if (structureIds.length > 0) {
        query['structure.$id'] = {
          $in: structureIds.map((id: string) => new ObjectId(id)),
        };
      }
      // Si la requête contient un conseiller, on l'ajoute à la requête
      if (conseillerIds.length > 0) {
        query['conseiller.$id'] = {
          $in: conseillerIds.map((id: string) => new ObjectId(id)),
        };
      }
      // Récupération des données
      const donneesStats = await getStatsGlobales(
        query,
        req.ability,
        action.read,
        app,
        true,
        codesPostauxQuery,
      );

      if (exportStats) {
        // eslint-disable-next-line consistent-return
        return donneesStats;
      }

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

export default getStatsNationalesGrandReseau;
