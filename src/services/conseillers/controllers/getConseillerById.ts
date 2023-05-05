import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestConseillers } from '../conseillers.repository';
import { getTypeDossierDemarcheSimplifiee } from '../../structures/repository/reconventionnement.repository';
import { action } from '../../../helpers/accessControl/accessList';
import { StatutConventionnement } from '../../../ts/enum';

const getConseillerById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    const { idMiseEnRelation } = req.params;
    try {
      if (!ObjectId.isValid(idConseiller)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const checkAccess = await checkAccessReadRequestConseillers(app, req);
      const conseiller = await app
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
                            { $eq: ['renouvellement_initié', '$statut'] },
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
                    emetteurRenouvellement: 1,
                    salaire: 1,
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
              codeCommune: 1,
              nomCommune: 1,
              telephonePro: 1,
              mattermost: 1,
              dateDeNaissance: 1,
              dateFinFormation: 1,
              dateDisponibilite: 1,
              datePrisePoste: 1,
              statut: 1,
              sexe: 1,
              structureId: 1,
              certifie: 1,
              dossierIncompletRupture: 1,
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
      if (idMiseEnRelation !== undefined) {
        conseiller[0].contrat = conseiller[0].misesEnRelation.find(
          (miseEnRelation) => String(miseEnRelation._id) === idMiseEnRelation,
        );
        if (!conseiller[0]?.contrat) {
          res.status(404).json({ message: 'Mise en relation non trouvée' });
          return;
        }
        const structure = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .findOne({
            _id: new ObjectId(conseiller[0].contrat?.structureObj?._id),
          });
        const typeDossierDs = getTypeDossierDemarcheSimplifiee(
          structure?.insee?.entreprise?.forme_juridique,
        );
        if (typeDossierDs === null) {
          res.status(500).json({
            message: 'Erreur lors de la récupération du type de la structure',
          });
          return;
        }
        if (
          structure?.conventionnement?.statut ===
          StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
        ) {
          conseiller[0].url = `https://www.demarches-simplifiees.fr/procedures/${typeDossierDs?.numero_demarche_reconventionnement}/dossiers/${structure?.conventionnement?.dossierReconventionnement?.numero}/messagerie`;
        } else {
          conseiller[0].url = `https://www.demarches-simplifiees.fr/procedures/${typeDossierDs?.numero_demarche_conventionnement}/dossiers/${structure?.conventionnement?.dossierConventionnement?.numero}/messagerie`;
        }
      }
      res.status(200).json(conseiller[0]);
      return;
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
