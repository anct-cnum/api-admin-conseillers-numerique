import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { generateCsvCandidat } from '../exports.repository';

const getExportCandidatsValideStructureCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let misesEnRelations;
    try {
      const query = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();
      misesEnRelations = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              $and: [query],
              statut: { $in: ['recrutee'] },
            },
          },
          {
            $lookup: {
              localField: 'conseiller.$id',
              from: 'conseillers',
              foreignField: '_id',
              as: 'conseiller',
            },
          },
          { $unwind: '$conseiller' },
          {
            $lookup: {
              localField: 'structure.$id',
              from: 'structures',
              foreignField: '_id',
              as: 'structure',
            },
          },
          { $unwind: '$structure' },
          {
            $sort: {
              'structure.oid': 1,
            },
          },
          {
            $project: {
              dateRecrutement: 1,
              'conseiller.createdAt': 1,
              'conseiller.prenom': 1,
              'conseiller.nom': 1,
              'conseiller.aUneExperienceMedNum': 1,
              'conseiller.email': 1,
              'conseiller.telephone': 1,
              'conseiller.nomCommune': 1,
              'conseiller.codePostal': 1,
              'conseiller.codeDepartement': 1,
              'conseiller.pix': 1,
              'structure.idPG': 1,
              'structure.siret': 1,
              'structure.nom': 1,
              'structure.contact': 1,
              'structure.codeCommune': 1,
              'structure.codeRegion': 1,
              'structure.type': 1,
              'structure.codeDepartement': 1,
              'structure.statut': 1,
              'structure.coselec': 1,
            },
          },
        ]);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.statusMessage = 'Accès refusé';
        res.status(403).end();
        return;
      }
      res.statusMessage = error.message;
      res.status(500).end();
      return;
    }

    generateCsvCandidat(misesEnRelations, res);
  };

export default getExportCandidatsValideStructureCsv;
