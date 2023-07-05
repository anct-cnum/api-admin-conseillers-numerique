import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validReconventionnement } from '../../../schemas/reconventionnement.schemas';
import {
  filterStatut,
  sortDossierConventionnement,
  totalParConvention,
} from '../repository/reconventionnement.repository';
import {
  checkAccessReadRequestStructures,
  filterDepartement,
  filterRegion,
  filterSearchBar,
} from '../repository/structures.repository';
import service from '../../../helpers/services';

const getStructures =
  (app: Application, checkAccess) =>
  async (
    typeConvention: string,
    searchByNomStructure: string,
    region: string,
    departement: string,
  ) =>
    app.service(service.structures).Model.aggregate([
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          $and: [
            checkAccess,
            filterSearchBar(searchByNomStructure),
            filterStatut(typeConvention),
          ],
          ...filterRegion(region),
          ...filterDepartement(departement),
        },
      },
      {
        $project: {
          _id: 1,
          nom: 1,
          idPG: 1,
          nombreConseillersSouhaites: 1,
          statut: 1,
          conventionnement: 1,
          demandesCoselec: 1,
        },
      },
    ]);

const getDossiersConvention =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      page,
      type,
      nomOrdre,
      ordre,
      searchByNomStructure,
      region,
      departement,
    } = req.query;
    try {
      const pageValidation = validReconventionnement.validate({
        page,
        type,
        nomOrdre,
        ordre,
        searchByNomStructure,
        region,
        departement,
      });
      if (pageValidation.error) {
        res.status(400).json({ message: pageValidation.error.message });
        return;
      }
      const items: {
        total: number;
        data: object;
        totalParConvention: {
          reconventionnement: number;
          conventionnement: number;
          avenantAjoutPoste: number;
          avenantRenduPoste: number;
          total: number;
        };
        limit: number;
        skip: number;
      } = {
        total: 0,
        data: [],
        totalParConvention: {
          reconventionnement: 0,
          conventionnement: 0,
          avenantAjoutPoste: 0,
          avenantRenduPoste: 0,
          total: 0,
        },
        limit: 0,
        skip: 0,
      };

      const checkAccess = await checkAccessReadRequestStructures(app, req);
      const structures: any = await getStructures(app, checkAccess)(
        type,
        searchByNomStructure,
        region,
        departement,
      );
      const structuresFormat = sortDossierConventionnement(
        type,
        ordre,
        structures,
      );
      items.total = structuresFormat.length;
      const totalConvention = await totalParConvention(app, req);
      items.totalParConvention = {
        ...items.totalParConvention,
        ...totalConvention,
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

export default getDossiersConvention;
