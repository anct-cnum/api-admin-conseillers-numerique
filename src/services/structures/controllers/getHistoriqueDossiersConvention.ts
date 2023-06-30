import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validHistoriqueConvention } from '../../../schemas/reconventionnement.schemas';
import {
  filterDateDemandeAndStatutHistorique,
  sortHistoriqueDossierConventionnement,
  totalParHistoriqueConvention,
} from '../repository/reconventionnement.repository';
import {
  checkAccessReadRequestStructures,
  filterSearchBar,
} from '../repository/structures.repository';
import service from '../../../helpers/services';
import { IStructures } from '../../../ts/interfaces/db.interfaces';

const getStructures =
  (app: Application, checkAccess) =>
  async (
    typeConvention: string,
    dateDebut: Date,
    dateFin: Date,
    searchByNomStructure: string,
  ) =>
    app.service(service.structures).Model.aggregate([
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          $and: [
            checkAccess,
            filterDateDemandeAndStatutHistorique(
              typeConvention,
              dateDebut,
              dateFin,
            ),
            filterSearchBar(searchByNomStructure),
          ],
        },
      },
      {
        $project: {
          _id: 1,
          nom: 1,
          idPG: 1,
          nombreConseillersSouhaites: 1,
          demandesCoselec: 1,
          coselec: 1,
          statut: 1,
          conventionnement: 1,
        },
      },
    ]);

const getHistoriqueDossiersConvention =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, type, nomOrdre, ordre, searchByNomStructure } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut);
    const dateFin: Date = new Date(req.query.dateFin);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    try {
      const pageValidation = validHistoriqueConvention.validate({
        page,
        type,
        dateDebut,
        dateFin,
        nomOrdre,
        ordre,
        searchByNomStructure,
      });
      if (pageValidation.error) {
        res.status(400).json({ message: pageValidation.error.message });
        return;
      }
      const items: {
        total: number;
        data: IStructures[];
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
      const structures = await getStructures(app, checkAccess)(
        type,
        dateDebut,
        dateFin,
        searchByNomStructure,
      );
      const structuresFormat = sortHistoriqueDossierConventionnement(
        type,
        ordre,
        structures,
      );
      items.total = structuresFormat.length;
      const totalConvention = await totalParHistoriqueConvention(
        app,
        req,
        dateDebut,
        dateFin,
      );
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

export default getHistoriqueDossiersConvention;
