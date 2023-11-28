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
  checkAvisPrefet,
} from '../../structures/repository/structures.repository';

const formatStatutDemandeCoordinateur = (statut: string) => {
  switch (statut) {
    case 'en_cours':
      return 'Nouvelle candidature';
    case 'validee':
      return 'Candidature validée';
    case 'refusee':
      return 'Non validée';
    default:
      return 'Non renseigné';
  }
};

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
          _id: 0,
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
      const demandesCoordinateurs = candidaturesCoordinateurs.flatMap(
        (structure) => {
          const structureFormat = structure;
          // si une structure possède deux demandes coordinateurs avec des statuts différents
          // la requête renvoie toute les demandes coordinateurs de la structure sans prendre en compte le filtre statut
          // dans l'aggregate on ne peut pas récupérer seulement l'élément du tableau qui match avec le filtre
          if (statut === 'toutes') {
            structureFormat.demandesCoordinateur =
              structure.demandesCoordinateur.filter((demande) =>
                checkAvisPrefet(avisPrefet, demande.avisPrefet),
              );
          } else {
            structureFormat.demandesCoordinateur =
              structure.demandesCoordinateur.filter(
                (demande) =>
                  demande.statut === statut &&
                  checkAvisPrefet(avisPrefet, demande.avisPrefet),
              );
          }
          return structureFormat.demandesCoordinateur.map((demande) => {
            const item = demande;
            item.nomStructure = structure.nom;
            item.codePostal = structure.codePostal;
            item.idPG = structure.idPG;
            item.statut = formatStatutDemandeCoordinateur(demande.statut);

            return item;
          });
        },
      );
      if (nomOrdre === 'dateCandidature') {
        demandesCoordinateurs.sort((a, b) => {
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
      }

      generateCsvCandidaturesCoordinateur(demandesCoordinateurs, res);
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
