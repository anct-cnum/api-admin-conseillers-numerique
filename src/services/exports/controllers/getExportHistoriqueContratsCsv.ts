import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validHistoriqueContrat } from '../../../schemas/contrat.schemas';
import { generateCsvHistoriqueContrats } from '../exports.repository';
import {
  checkAccessReadRequestMisesEnRelation,
  filterStatutContratHistorique,
} from '../../misesEnRelation/misesEnRelation.repository';
import { filterNomConseiller } from '../../conseillers/conseillers.repository';

const getExportHistoriqueContratsCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { statut, nomOrdre, ordre, searchByNomConseiller } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut);
    const dateFin: Date = new Date(req.query.dateFin);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    try {
      const contratHistoriqueExportValidation = validHistoriqueContrat.validate(
        {
          statut,
          dateDebut,
          dateFin,
          nomOrdre,
          ordre,
          searchByNomConseiller,
        },
      );
      if (contratHistoriqueExportValidation.error) {
        res
          .status(400)
          .json({ message: contratHistoriqueExportValidation.error.message });
        return;
      }
      const checkAccess = await checkAccessReadRequestMisesEnRelation(app, req);
      const contrats = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              $and: [
                checkAccess,
                {
                  $or: [
                    {
                      'emetteurRupture.date': {
                        $gte: dateDebut,
                        $lte: dateFin,
                      },
                    },
                    {
                      'emetteurRenouvellement.date': {
                        $gte: dateDebut,
                        $lte: dateFin,
                      },
                    },
                    {
                      createdAt: { $gte: dateDebut, $lte: dateFin }, // en attendant le dev du parcours de recrutement
                    },
                  ],
                },
                filterNomConseiller(searchByNomConseiller),
              ],
              ...filterStatutContratHistorique(statut),
            },
          },
          {
            $project: {
              _id: 0,
              emetteurRupture: 1,
              createdAt: 1,
              emetteurRenouvellement: 1,
              dateSorted: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$statut', 'finalisee_rupture'] },
                      then: '$emetteurRupture.date',
                    },
                    {
                      case: {
                        $and: [
                          { $eq: ['$statut', 'finalisee'] },
                          {
                            $ne: [
                              { $type: '$miseEnRelationConventionnement' },
                              'missing',
                            ],
                          },
                        ],
                      },
                      then: '$emetteurRenouvellement.date',
                    },
                    {
                      case: {
                        $and: [
                          { $eq: ['$statut', 'finalisee'] },
                          {
                            $eq: [
                              { $type: '$miseEnRelationConventionnement' },
                              'missing',
                            ],
                          },
                        ],
                      },
                      then: '$createdAt',
                    },
                  ],
                  default: null,
                },
              },
              miseEnRelationConventionnement: 1,
              'structureObj.nom': 1,
              'conseillerObj.nom': 1,
              'conseillerObj.prenom': 1,
              'structureObj.idPG': 1,
              'conseillerObj.idPG': 1,
              typeDeContrat: 1,
              dateDebutDeContrat: 1,
              dateFinDeContrat: 1,
              statut: 1,
            },
          },
          { $sort: { dateSorted: Number(ordre) } },
        ]);
      contrats.map((contrat) => {
        const item = contrat;
        if (
          contrat.statut === 'finalisee' &&
          !contrat.miseEnRelationConventionnement
        ) {
          item.statut = 'Recrutement';
          item.dateDeLaDemande = contrat?.createdAt;
        }
        if (contrat.statut === 'finalisee_rupture') {
          item.statut = 'Rupture de contrat';
          item.dateDeLaDemande = contrat?.emetteurRupture?.date;
        }
        if (
          contrat.statut === 'finalisee' &&
          contrat.miseEnRelationConventionnement
        ) {
          item.statut = 'Renouvellement';
          item.dateDeLaDemande = contrat?.emetteurRenouvellement?.date;
        }
        return item;
      });
      generateCsvHistoriqueContrats(contrats, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportHistoriqueContratsCsv;
