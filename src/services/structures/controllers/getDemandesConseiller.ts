import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestStructures,
  filterSearchBar,
  filterRegion,
  filterDepartement,
  filterStatutDemandeDePostes,
  sortGestionDemandesConseiller,
  totalParDemandesConseiller,
} from '../repository/structures.repository';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { validDemandesConseiller } from '../../../schemas/structures.schemas';
import { action } from '../../../helpers/accessControl/accessList';

const getStructures =
  (app: Application, checkAccess) =>
  async (
    statutDemande: string,
    search: string,
    region: string,
    departement: string,
    avisPrefet: string,
  ) =>
    app.service(service.structures).Model.aggregate([
      {
        $addFields: {
          idPGStr: { $toString: '$idPG' },
          lastPrefet: { $arrayElemAt: ['$prefet', -1] },
        },
      },
      {
        $match: {
          $and: [
            checkAccess,
            filterSearchBar(search),
            filterStatutDemandeDePostes(statutDemande, avisPrefet),
          ],
          ...filterRegion(region),
          ...filterDepartement(departement),
        },
      },
      {
        $project: {
          nom: 1,
          codePostal: 1,
          demandesCoselec: 1,
          idPG: 1,
          createdAt: 1,
          coselec: 1,
          statut: 1,
          nombreConseillersSouhaites: 1,
          prefet: '$lastPrefet',
        },
      },
    ]);

const getDemandesConseiller =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      page,
      statutDemande,
      nomOrdre,
      ordre,
      search,
      departement,
      region,
      avisPrefet,
    } = req.query;
    try {
      const demandesConseillerValidation = validDemandesConseiller.validate({
        page,
        statutDemande,
        nomOrdre,
        ordre,
        search,
        departement,
        region,
        avisPrefet,
      });
      if (demandesConseillerValidation.error) {
        res
          .status(400)
          .json({ message: demandesConseillerValidation.error.message });
        return;
      }
      const items: {
        total: number;
        data: object;
        structurePrimoEntranteBannerAvisPrefetOpen: object;
        ajoutPosteBannerAvisPrefetOpen: object;
        totalParDemandesConseiller: {
          totalDemandePoste: number;
          totalPosteValider: number;
          totalPosteRefuser: number;
          totalPosteRenduEnCours: number;
        };
        limit: number;
        skip: number;
      } = {
        total: 0,
        data: [],
        structurePrimoEntranteBannerAvisPrefetOpen: [],
        ajoutPosteBannerAvisPrefetOpen: [],
        totalParDemandesConseiller: {
          totalDemandePoste: 0,
          totalPosteValider: 0,
          totalPosteRefuser: 0,
          totalPosteRenduEnCours: 0,
        },
        limit: 0,
        skip: 0,
      };
      const checkAccess = await checkAccessReadRequestStructures(app, req);
      const structures: IStructures[] = await getStructures(app, checkAccess)(
        statutDemande,
        search,
        region,
        departement,
        avisPrefet,
      );
      const structuresFormat = sortGestionDemandesConseiller(
        statutDemande,
        ordre,
        structures,
      );
      items.structurePrimoEntranteBannerAvisPrefetOpen = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          prefet: {
            $elemMatch: {
              banniereValidationAvisPrefet: true,
            },
          },
        })
        .select({ nom: 1, 'prefet.$': 1 });
      items.ajoutPosteBannerAvisPrefetOpen = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          demandesCoselec: {
            $elemMatch: {
              banniereValidationAvisPrefet: true,
            },
          },
        })
        .select({ nom: 1, 'demandesCoselec.$': 1 });
      items.total = structuresFormat.length;
      const totalParDemandes = await totalParDemandesConseiller(app, req);
      items.totalParDemandesConseiller = {
        ...items.totalParDemandesConseiller,
        ...totalParDemandes,
      };
      items.data = structuresFormat.slice(
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

export default getDemandesConseiller;
