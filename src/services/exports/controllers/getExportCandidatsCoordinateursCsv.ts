import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { generateCsvCandidaturesCoordinateur } from '../exports.repository';

const getExportCandidatsCoordinateursCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let candidaturesCoordinateurs;
    try {
      const query = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();
      candidaturesCoordinateurs = await app
        .service(service.structures)
        .Model.find(
          { demandesCoordinateur: { $exists: true }, ...query },
          {
            _id: 0,
            idPG: 1,
            nom: 1,
            codePostal: 1,
            'demandesCoordinateur.dossier.numero': 1,
            'demandesCoordinateur.statut': 1,
            'demandesCoordinateur.dossier.dateDeCreation': 1,
            'demandesCoordinateur.avisPrefet': 1,
            'demandesCoordinateur.commentaire': 1,
          },
        );
      generateCsvCandidaturesCoordinateur(candidaturesCoordinateurs, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportCandidatsCoordinateursCsv;
