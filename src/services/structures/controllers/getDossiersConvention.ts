import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validReconventionnement } from '../../../schemas/reconventionnement.schemas';
import {
  filterStatut,
  getTime,
  totalParConvention,
} from '../repository/reconventionnement.repository';
import {
  checkAccessReadRequestStructures,
  filterSearchBar,
} from '../repository/structures.repository';
import service from '../../../helpers/services';
import { StatutConventionnement } from '../../../ts/enum';

const getStructures =
  (app: Application, checkAccess) =>
  async (
    skip: string,
    limit: number,
    typeConvention: string,
    searchByNomStructure: string,
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
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getDossiersConvention =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const { page, type, nomOrdre, ordre, searchByNomStructure } = req.query;
    let avenantSort: any = [];
    let conventionnement: any = [];
    let reconventionnement: any = [];
    try {
      const pageValidation = validReconventionnement.validate({
        page,
        type,
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
        page,
        options.paginate.default,
        type,
        searchByNomStructure,
      );
      if (type.includes('avenant') || type === 'toutes') {
        avenantSort = structures
          .filter((structure) => structure?.demandesCoselec?.length > 0)
          .map((structure) => {
            const avenant = structure.demandesCoselec.find(
              (demande) => demande.statut === 'en_cours',
            );
            avenant.dateSorted = avenant.emetteurAvenant.date;
            avenant.typeConvention =
              avenant.type === 'retrait'
                ? 'avenantRenduPoste'
                : 'avenantAjoutPoste';
            avenant.idPG = structure.idPG;
            avenant.nom = structure.nom;
            avenant.idStructure = structure._id;

            return avenant;
          });
      }
      if (type.includes('tionnement') || type === 'toutes') {
        reconventionnement = structures
          .filter(
            (structure) =>
              structure.conventionnement.statut ===
              StatutConventionnement.RECONVENTIONNEMENT_EN_COURS,
          )
          .map((structure) => {
            const item = structure.conventionnement.dossierReconventionnement;
            item.dateSorted = item?.dateDeCreation;
            item.idPG = structure.idPG;
            item.nom = structure.nom;
            item._id = structure._id;
            item.typeConvention = 'reconventionnement';
            item.statutConventionnement = structure.conventionnement.statut;
            return item;
          });
        conventionnement = structures
          .filter(
            (structure) =>
              structure.conventionnement.statut ===
              StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
          )
          .map((structure) => {
            const item = structure.conventionnement.dossierConventionnement;
            item.dateSorted = item?.dateDeCreation;
            item.idPG = structure.idPG;
            item.nom = structure.nom;
            item._id = structure._id;
            item.typeConvention = 'conventionnement';
            item.statutConventionnement = structure.conventionnement.statut;
            return item;
          });
      }
      const structureFormat = avenantSort.concat(
        reconventionnement,
        conventionnement,
      );
      structureFormat.sort((a, b) => {
        if (getTime(a.dateSorted) < getTime(b.dateSorted)) {
          return ordre;
        }
        if (getTime(a.dateSorted) > getTime(b.dateSorted)) {
          return ordre < 0 ? 1 : -1;
        }
        return 0;
      });

      items.total = structureFormat.length;
      const totalConvention = await totalParConvention(app, req);
      items.totalParConvention = {
        ...items.totalParConvention,
        ...totalConvention,
      };
      items.data = structureFormat;
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
