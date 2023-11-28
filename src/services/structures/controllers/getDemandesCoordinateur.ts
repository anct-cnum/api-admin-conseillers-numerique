import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validDemandesCoordinateur } from '../../../schemas/coordinateur.schemas';
import {
  checkAccessReadRequestStructures,
  filterSearchBar,
  filterRegion,
  filterDepartement,
} from '../repository/structures.repository';
import {
  ExtendedDemandesCoordinateur,
  checkAvisPrefet,
  sortDemandesCoordinateurs,
  filterStatutAndAvisPrefetDemandesCoordinateur,
} from '../../conseillers/repository/coordinateurs.repository';
import { IStructures } from '../../../ts/interfaces/db.interfaces';

const totalParStatutDemandesCoordinateur = async (
  app: Application,
  checkAccess,
) => {
  const countDemandesCoordinateur = await app
    .service(service.structures)
    .Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
        },
      },
      { $unwind: '$demandesCoordinateur' },
      {
        $group: {
          _id: '$demandesCoordinateur.statut',
          count: { $sum: 1 },
        },
      },
    ]);
  const totalDemandesCoordinateurEnCours =
    countDemandesCoordinateur.find((element) => element._id === 'en_cours')
      ?.count ?? 0;
  const totalDemandesCoordinateurValider =
    countDemandesCoordinateur.find((element) => element._id === 'validee')
      ?.count ?? 0;
  const totalDemandesCoordinateurRefuser =
    countDemandesCoordinateur.find((element) => element._id === 'refusee')
      ?.count ?? 0;
  const total =
    totalDemandesCoordinateurEnCours +
    totalDemandesCoordinateurValider +
    totalDemandesCoordinateurRefuser;

  return {
    nouvelleCandidature: totalDemandesCoordinateurEnCours,
    candidatureValider: totalDemandesCoordinateurValider,
    candidatureNonRetenus: totalDemandesCoordinateurRefuser,
    total,
  };
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
          nom: 1,
          codePostal: 1,
          idPG: 1,
          demandesCoordinateur: 1,
        },
      },
    ]);

const getDemandesCoordinateur =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      page,
      statut,
      nomOrdre,
      ordre,
      search,
      departement,
      region,
      avisPrefet,
    } = req.query;
    try {
      const demandesCoordinateurValidation = validDemandesCoordinateur.validate(
        {
          page,
          statut,
          nomOrdre,
          ordre,
          search,
          departement,
          region,
          avisPrefet,
        },
      );
      if (demandesCoordinateurValidation.error) {
        res
          .status(400)
          .json({ message: demandesCoordinateurValidation.error.message });
        return;
      }
      const items: {
        total: number;
        data: object;
        totalParDemandesCoordinateur: {
          nouvelleCandidature: number;
          candidatureValider: number;
          candidatureNonRetenus: number;
          total: number;
        };
        limit: number;
        skip: number;
      } = {
        total: 0,
        data: [],
        totalParDemandesCoordinateur: {
          nouvelleCandidature: 0,
          candidatureValider: 0,
          candidatureNonRetenus: 0,
          total: 0,
        },
        limit: 0,
        skip: 0,
      };
      const checkAccess = await checkAccessReadRequestStructures(app, req);
      const structures: IStructures[] = await getDemandesCoordo(
        app,
        checkAccess,
      )(statut, search, region, departement, avisPrefet);
      const demandesCoordinateurs = structures.flatMap((structure) => {
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
          const item: ExtendedDemandesCoordinateur = demande;
          item.nomStructure = structure.nom;
          item.codePostal = structure.codePostal;
          item.idPG = structure.idPG;
          item.idStructure = structure._id;

          return item;
        });
      });
      const demandesCoordinateurSort = sortDemandesCoordinateurs(
        demandesCoordinateurs,
        nomOrdre,
        ordre,
      );
      items.total = demandesCoordinateurSort.length;
      items.totalParDemandesCoordinateur =
        await totalParStatutDemandesCoordinateur(app, checkAccess);
      items.data = demandesCoordinateurSort.slice(
        (page - 1) * options.paginate.default,
        page * options.paginate.default,
      );
      items.limit = options.paginate.default;
      items.skip = page;
      res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDemandesCoordinateur;
