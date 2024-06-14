import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { generateCsvHistoriqueRuptures } from '../conseillersRuptures.repository';

const getExportHistoriqueRuptureCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const query = await app
        .service(service.conseillersRuptures)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();

      const historiqueRuptures = await app
        .service(service.conseillersRuptures)
        .Model.aggregate([
          {
            $match: {
              $and: [query],
            },
          },
          {
            $lookup: {
              localField: 'conseillerId',
              from: 'conseillers',
              foreignField: '_id',
              as: 'conseiller',
            },
          },
          {
            $unwind: {
              path: '$conseiller',
              preserveNullAndEmptyArrays: true, // Soit collection conseillers soit conseillersSupprimes
            },
          },
          {
            $lookup: {
              localField: 'conseillerId',
              from: 'conseillersSupprimes',
              foreignField: 'conseiller._id',
              as: 'conseillerSupprime',
            },
          },
          {
            $unwind: {
              path: '$conseillerSupprime',
              preserveNullAndEmptyArrays: true, // Soit collection conseillers soit conseillersSupprimes
            },
          },
          {
            $lookup: {
              localField: 'structureId',
              from: 'structures',
              foreignField: '_id',
              as: 'structure',
            },
          },
          {
            $unwind: {
              path: '$structure', // Obligatoire ici
            },
          },
          {
            $lookup: {
              from: 'misesEnRelation',
              let: {
                idStructure: '$structureId',
                idConseiller: '$conseillerId',
              },
              as: 'miseEnRelation',
              pipeline: [
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $eq: ['$$idStructure', '$structureObj._id'] },
                      },
                      {
                        $expr: {
                          $eq: ['$$idConseiller', '$conseillerObj._id'],
                        },
                      },
                      { $expr: { $eq: ['$statut', 'finalisee_rupture'] } },
                    ],
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: '$miseEnRelation',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              dateRupture: 1,
              motifRupture: 1,
              'conseiller.idPG': 1,
              'conseillerSupprime.conseiller.idPG': 1,
              'conseiller.prenom': 1,
              'conseiller.nom': 1,
              'conseiller.email': 1,
              'structure.idPG': 1,
              'structure.nom': 1,
              'miseEnRelation.phaseConventionnement': 1,
              'miseEnRelation.dateDebutDeContrat': 1,
              'miseEnRelation.dateFinDeContrat': 1,
              'miseEnRelation.typeDeContrat': 1,
            },
          },
        ]);

      await generateCsvHistoriqueRuptures(historiqueRuptures, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportHistoriqueRuptureCsv;
