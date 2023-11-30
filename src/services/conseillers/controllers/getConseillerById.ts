import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  IConseillers,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestConseillers } from '../conseillers.repository';
import { action } from '../../../helpers/accessControl/accessList';

const getConseillerById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    try {
      if (!ObjectId.isValid(idConseiller)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const paramsRequest: any = {
        $match: {
          _id: new ObjectId(idConseiller),
        },
      };
      if (req.query.role === 'structure') {
        const findStructure: IStructures = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .findOne();

        if (!findStructure) {
          res.status(404).json({ message: "La structure n'existe pas" });
          return;
        }
      } else {
        const checkAccessConseillers = await checkAccessReadRequestConseillers(
          app,
          req,
        );
        paramsRequest.$match = {
          $and: [checkAccessConseillers],
          ...paramsRequest.$match,
        };
      }
      const conseiller: IConseillers[] = await app
        .service(service.conseillers)
        .Model.aggregate([
          paramsRequest,
          {
            $lookup: {
              from: 'misesEnRelation',
              let: {
                idConseiller: '$_id',
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
                            { $eq: ['terminee_naturel', '$statut'] },
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
                    dateFinDeContrat: 1,
                    dateDebutDeContrat: 1,
                    typeDeContrat: 1,
                    motifRupture: 1,
                    dossierIncompletRupture: 1,
                    emetteurRupture: 1,
                    'structureObj.idPG': 1,
                    'structureObj.nom': 1,
                    'structureObj._id': 1,
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
              codePostal: 1,
              nomCommune: 1,
              telephonePro: 1,
              telephone: 1,
              nonAffichageCarto: 1,
              mattermost: 1,
              dateDeNaissance: 1,
              dateFinFormation: 1,
              dateDisponibilite: 1,
              datePrisePoste: 1,
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
        res.status(404).json({ message: 'Conseiller non trouvé' });
        return;
      }
      res.status(200).json(conseiller[0]);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getConseillerById;
