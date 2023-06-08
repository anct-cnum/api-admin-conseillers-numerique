import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { generateCsvCandidat } from '../exports.repository';

const getExportJeRecruteCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let miseEnRelations;
    try {
      const query = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();
      miseEnRelations = await app
        .service(service.misesEnRelation)
        .Model.aggregate(
          [
            {
              $match: {
                $and: [query],
                statut: { $in: ['recrutee', 'finalisee', 'nouvelle_rupture'] },
              },
            },
            {
              $addFields: {
                fk_conseiller: { $objectToArray: '$$ROOT.conseiller' },
              },
            },
            {
              $addFields: {
                fk_structure: { $objectToArray: '$$ROOT.structure' },
              },
            },
            {
              $lookup: {
                localField: 'fk_conseiller.1.v',
                from: 'conseillers',
                foreignField: '_id',
                as: 'conseiller',
              },
            },
            { $unwind: '$conseiller' },
            {
              $lookup: {
                localField: 'fk_structure.1.v',
                from: 'structures',
                foreignField: '_id',
                as: 'structure',
              },
            },
            { $unwind: '$structure' },
            {
              $sort: {
                'structure.idPG': 1,
              },
            },
            {
              $project: {
                _id: 0,
                dateRecrutement: 1,
                'conseiller.idPG': 1,
                'conseiller.createdAt': 1,
                'conseiller.prenom': 1,
                'conseiller.nom': 1,
                'conseiller.aUneExperienceMedNum': 1,
                'conseiller.email': 1,
                'conseiller.emailCN': 1,
                'conseiller.telephone': 1,
                'conseiller.nomCommune': 1,
                'conseiller.codePostal': 1,
                'conseiller.codeDepartement': 1,
                'conseiller.pix': 1,
                'conseiller.datePrisePoste': 1,
                'conseiller.dateFinFormation': 1,
                'structure.idPG': 1,
                'structure.siret': 1,
                'structure.nom': 1,
                'structure.contact': 1,
                'structure.codePostal': 1,
                'structure.codeCommune': 1,
                'structure.codeRegion': 1,
                'structure.type': 1,
                'structure.codeDepartement': 1,
                'structure.statut': 1,
                'structure.coselec': 1,
              },
            },
            {
              $sort: {
                'structure.oid': 1,
              },
            },
          ],
          {
            allowDiskUse: true,
          },
        );

      generateCsvCandidat(miseEnRelations, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportJeRecruteCsv;
