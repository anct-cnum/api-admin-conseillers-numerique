import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  IRequest,
  ICodeRegion,
  IDepartement,
} from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobalesGrandReseau from './getStatsGlobalesGrandReseau';
import service from '../../../helpers/services';

const departements = require('../../../../datas/imports/departements-region.json');
const codesRegions = require('../../../../datas/imports/code_region.json');

const getStatsNationalesGrandReseau =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const dateDebut = new Date(String(req.query.dateDebut));
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(String(req.query.dateFin));
      dateFin.setUTCHours(23, 59, 59, 59);
      const {
        codePostal,
        villes,
        codeRegion,
        numeroDepartement,
        structureId,
        conseillerId,
      } = req.query;

      let numerosDepartements: number[];

      // Rajout de la date dans la requête
      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      };
      // Si la requête contient un code région, on l'ajoute à la requête
      if (codeRegion !== 'tous') {
        const regionInfos = codesRegions.find(
          (region: ICodeRegion) => codeRegion === region.code,
        );
        // Si la région est la Corse, on ajoute les codes postaux de la Corse du Sud et de la Haute-Corse
        if (codeRegion === '94') {
          query['cra.codePostal'] = { $regex: `^200.*|^201.*|^202.*|^206.*` };
          // Sinon on ajoute les codes postaux des départements de la région
        } else {
          numerosDepartements = departements
            .filter(
              (departement: IDepartement) =>
                departement.region_name === regionInfos?.nom,
            )
            .map((departement: IDepartement) => departement.num_dep);

          const regex = numerosDepartements
            .map((e: Number) => `^${e}.*`)
            .join('|');
          query['cra.codePostal'] = { $regex: regex };
        }
      }
      // Si la requête contient un numéro de département, on l'ajoute à la requête
      if (numeroDepartement !== 'tous') {
        // Si le numéro de département est la Corse du Sud 2A, on ajoute les codes postaux de la Corse du Sud
        if (numeroDepartement === '2A') {
          query['cra.codePostal'] = { $regex: `^200.*|^201.*` };
        }
        // Si le numéro de département est la Haute-Corse 2B, on ajoute les codes postaux de la Haute-Corse
        else if (numeroDepartement === '2B') {
          query['cra.codePostal'] = { $regex: `^202.*|^206.*` };
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
      if (villes !== 'tous') {
        query['cra.codePostal'] = codePostal;
        query['cra.nomCommune'] = villes;
      }
      // Si la requête contient une structure, on l'ajoute à la requête
      if (structureId !== 'tous') {
        try {
          const conseillersIds: ObjectId[] = await app
            .service(service.conseillers)
            .Model.find({ structureId })
            .distinct('_id');
          query['conseiller.$id'] = { $in: conseillersIds };
        } catch (error) {
          throw new Error(error);
        }
      }
      // Si la requête contient un conseiller, on l'ajoute à la requête
      if (conseillerId !== 'tous') {
        query['conseiller.$id'] = new ObjectId(conseillerId);
      }

      const donneesStats = await getStatsGlobalesGrandReseau(
        query,
        codesPostauxQuery,
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

export default getStatsNationalesGrandReseau;
