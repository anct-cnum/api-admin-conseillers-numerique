import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validHistoriqueContrat } from '../../../schemas/contrat.schemas';
import { generateCsvHistoriqueContrats } from '../exports.repository';
import {
  checkAccessReadRequestMisesEnRelation,
  filterStatutContrat,
} from '../../misesEnRelation/misesEnRelation.repository';

const getExportHistoriqueContratsCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { statut } = req.query;
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
        },
      );
      if (contratHistoriqueExportValidation.error) {
        res
          .status(400)
          .json({ message: contratHistoriqueExportValidation.error.message });
        return;
      }
      const statutHistoriqueContrat = [
        'finalisee',
        'finalisee_rupture',
        'renouvelee',
      ];
      const checkAccess = await checkAccessReadRequestMisesEnRelation(app, req);
      const contrats = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              $and: [checkAccess],
              $or: [
                { 'emetteurRupture.date': { $gte: dateDebut, $lte: dateFin } },
                {
                  'emetteurRenouvellement.date': {
                    $gte: dateDebut,
                    $lte: dateFin,
                  },
                },
                {
                  dateRecrutement: { $gte: dateDebut, $lte: dateFin },
                },
              ],
              ...filterStatutContrat(statut, statutHistoriqueContrat),
            },
          },
          {
            $project: {
              _id: 0,
              emetteurRupture: 1,
              emetteurRenouvellement: 1, // à définir
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
        ]);
      contrats.map((contrat) => {
        const item = contrat;
        if (contrat.statut === 'finalisee') {
          item.statut = 'Recrutement';
          item.dateDeLaDemande = null;
        }
        if (contrat.statut === 'finalisee_rupture') {
          item.statut = 'Rupture de contrat';
          item.dateDeLaDemande = contrat?.emetteurRupture?.date;
        }
        if (contrat.statut === 'renouvelee') {
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
