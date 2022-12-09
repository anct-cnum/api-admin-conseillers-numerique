import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestConseillers } from '../conseillers.repository';

const getConseillerById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    try {
      const checkAccess = await checkAccessReadRequestConseillers(app, req);
      const conseiller: IConseillers[] = await app
        .service(service.conseillers)
        .Model.aggregate([
          {
            $match: {
              _id: new ObjectId(idConseiller),
              $and: [checkAccess],
            },
          },
          {
            $lookup: {
              from: 'misesEnRelation',
              let: {
                idConseiller: '$_id',
                statutMisesEnrelation: [
                  'nouvelle_rupture',
                  'finalisee',
                  'finalisee_rupture',
                ],
              },
              as: 'misesEnRelation',
              pipeline: [
                {
                  $match: {
                    $and: [
                      {
                        $expr: {
                          $eq: ['$$idConseiller', '$conseillerObj._id'],
                        },
                      },
                      {
                        $expr: {
                          $or: [
                            { $eq: ['finalisee', '$statut'] },
                            { $eq: ['nouvelle_rupture', '$statut'] },
                            { $eq: ['finalisee_rupture', '$statut'] },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  $project: {
                    statut: 1,
                    dateRecrutement: 1,
                    dateRupture: 1,
                    motifRupture: 1,
                    'structureObj.idPG': 1,
                    'structureObj.nom': 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: 'permanences',
              let: { idConseiller: '$_id' },
              as: 'permanences',
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $in: ['$$idConseiller', '$conseillers'] },
                        { $in: ['$$idConseiller', '$lieuPrincipalPour'] },
                        { $in: ['$$idConseiller', '$conseillersItinerants'] },
                      ],
                    },
                  },
                },
              ],
            },
          },
          {
            $project: {
              idPG: 1,
              prenom: 1,
              nom: 1,
              email: 1,
              codeCommune: 1,
              nomCommune: 1,
              telephonePro: 1,
              dateDeNaissance: 1,
              dateFinFormation: 1,
              dateDisponibilite: 1,
              datePrisePoste: 1,
              userCreated: 1,
              statut: 1,
              sexe: 1,
              structureId: 1,
              certifie: 1,
              groupeCRA: 1,
              'emailCN.address': 1,
              pix: 1,
              distanceMax: 1,
              estCoordinateur: 1,
              emailPro: 1,
              misesEnRelation: '$misesEnRelation',
              permanences: '$permanences',
            },
          },
        ]);
      if (conseiller.length === 0) {
        return res.status(404).json({ message: 'Conseiller non trouvé' });
      }
      return res.status(200).json(conseiller[0]);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getConseillerById;
