import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validExportCandidatsCoordinateurs } from '../../../schemas/structures.schemas';
import { generateCsvCandidaturesCoordinateur } from '../exports.repository';
import { getTimestampByDate } from '../../../utils';
import {
  checkAccessReadRequestStructures,
  filterSearchBar,
  filterRegion,
  filterDepartement,
  filterStatutAndAvisPrefetDemandesCoordinateur,
} from '../../structures/repository/structures.repository';

const getDemandesCoordo =
  (app: Application, checkAccess) =>
  async (
    statut: string,
    search: string,
    region: string,
    departement: string,
    avisPrefet: string,
  ) =>
    app.service(service.structures).Model.aggregate([
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          $and: [
            checkAccess,
            filterSearchBar(search),
            filterStatutAndAvisPrefetDemandesCoordinateur(statut, avisPrefet),
          ],
          ...filterRegion(region),
          ...filterDepartement(departement),
        },
      },
      {
        $project: {
          nom: 1,
          codePostal: 1,
          idPG: 1,
          demandesCoordinateur: 1,
        },
      },
    ]);

const getExportCandidatsCoordinateursCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { statut, search, region, departement, avisPrefet, nomOrdre, ordre } =
      req.query;
    try {
      const exportCandidatsCoordinateursValidation =
        validExportCandidatsCoordinateurs.validate({
          statut,
          nomOrdre,
          ordre,
          search,
          region,
          departement,
          avisPrefet,
        });
      if (exportCandidatsCoordinateursValidation.error) {
        res.status(400).json({
          message: exportCandidatsCoordinateursValidation.error.message,
        });
        return;
      }
      const checkAccess = await checkAccessReadRequestStructures(app, req);

      const candidaturesCoordinateurs = await getDemandesCoordo(
        app,
        checkAccess,
      )(statut, search, region, departement, avisPrefet);

      candidaturesCoordinateurs.sort((a, b) => {
        if (
          getTimestampByDate(a.dossier.dateDeCreation) <
          getTimestampByDate(b.dossier.dateDeCreation)
        ) {
          return ordre < 0 ? 1 : -1;
        }
        if (
          getTimestampByDate(a.dossier.dateDeCreation) >
          getTimestampByDate(b.dossier.dateDeCreation)
        ) {
          return ordre;
        }
        return 0;
      });

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
