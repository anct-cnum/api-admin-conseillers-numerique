import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { generateCsvListeGestionnaires } from '../exports.repository';
import {
  checkAccessReadRequestGestionnaires,
  filterRole,
  filterNomGestionnaire,
} from '../../users/users.repository';

const getExportListeGestionnairesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const checkAccessGestionnaire = await checkAccessReadRequestGestionnaires(
      app,
      req,
    );
    const { searchRole, searchByName } = req.query;
    try {
      const gestionnaires: IUser[] = await app
        .service(service.users)
        .Model.aggregate([
          {
            $match: {
              $and: [checkAccessGestionnaire],
              ...filterRole(searchRole),
              ...filterNomGestionnaire(searchByName),
            },
          },
          {
            $project: {
              _id: 1,
              roles: 1,
              name: 1,
              reseau: 1,
              nom: 1,
              prenom: 1,
              tokenCreatedAt: 1,
              passwordCreated: 1,
            },
          },
          // { $sort: sortColonne },
        ]);

      generateCsvListeGestionnaires(gestionnaires, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportListeGestionnairesCsv;
