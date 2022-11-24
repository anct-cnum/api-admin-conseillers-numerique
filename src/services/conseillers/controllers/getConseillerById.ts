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
              localField: 'structureId',
              from: 'structures',
              foreignField: '_id',
              as: 'structure',
            },
          },
          { $unwind: '$structure' },
          {
            $lookup: {
              from: 'misesEnRelation',
              let: { idConseiller: '$idPG', idStructure: '$structure.idPG' },
              as: 'miseEnRelation',
              pipeline: [
                {
                  $match: {
                    $and: [
                      {
                        $expr: {
                          $eq: ['$$idConseiller', '$conseillerObj.idPG'],
                        },
                      },
                      {
                        $expr: { $eq: ['$$idStructure', '$structureObj.idPG'] },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { $unwind: '$miseEnRelation' },
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
              sexe: 1,
              structureId: 1,
              certifie: 1,
              groupeCRA: 1,
              'emailCN.address': 1,
              'miseEnRelation.dateRecrutement': 1,
              pix: 1,
              distanceMax: 1,
              estCoordinateur: 1,
              emailPro: 1,
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
      return res.status(500).json({ message: error.message });
    }
  };

export default getConseillerById;
