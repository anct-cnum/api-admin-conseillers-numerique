import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { filterNomStructure } from '../repository/conseillers.repository';
import { getNombreCras } from '../../cras/cras.repository';
import { action } from '../../../helpers/accessControl/accessList';
import {
  filterNomConseillerObj,
  filterRegionConseillerObj,
  filterDepartementConseillerObj,
} from '../../misesEnRelation/misesEnRelation.repository';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';

const getConseillersCoordonnes =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      skip,
      ordre,
      nomOrdre,
      searchByConseiller,
      searchByStructure,
      region,
      departement,
    } = req.query;

    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const limit = options.paginate.default;

    const items: { total: number; data: object; limit: number; skip: number } =
      {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
    const sortColonne = JSON.parse(`{"conseillerObj.${nomOrdre}":${ordre}}`);

    try {
      const query = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();

      const misesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              statut: 'finalisee',
              ...filterNomStructure(searchByStructure),
              ...filterRegionConseillerObj(region),
              ...filterDepartementConseillerObj(departement),
              ...filterNomConseillerObj(searchByConseiller),
              $and: [query],
            },
          },
          {
            $project: {
              _id: 0,
              dateDebutDeContrat: 1,
              dateFinDeContrat: 1,
              'structureObj.nom': 1,
              'conseillerObj.idPG': 1,
              'conseillerObj.prenom': 1,
              'conseillerObj.nom': 1,
              'conseillerObj._id': 1,
              'conseillerObj.groupeCRA': 1,
              'conseillerObj.codeDepartement': 1,
              'conseillerObj.codeRegion': 1,
            },
          },
          {
            $sort: sortColonne,
          },
          {
            $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
          },
          { $limit: Number(limit) },
        ]);

      const promises = misesEnRelation.map(
        async (miseEnRelation: IMisesEnRelation) => {
          const structure = miseEnRelation.structureObj;
          const conseiller = miseEnRelation.conseillerObj;
          const craCount = await getNombreCras(app, req)(conseiller._id);
          const dernierCRA = await app
            .service(service.cras)
            .Model.findOne({
              'conseiller.$id': conseiller._id,
            })
            .sort({ createdAt: -1 })
            .limit(1);

          if (
            dernierCRA &&
            (dernierCRA.createdAt < dateDebut || dernierCRA.createdAt > dateFin)
          ) {
            return null;
          }
          return {
            ...miseEnRelation,
            nomStructure: structure.nom,
            dateDebutDeContrat: miseEnRelation.dateDebutDeContrat,
            dateFinDeContrat: miseEnRelation.dateFinDeContrat,
            idPG: conseiller.idPG,
            _id: conseiller._id,
            nom: conseiller.nom,
            prenom: conseiller.prenom,
            groupeCRA: conseiller.groupeCRA,
            codeDepartement: conseiller.codeDepartement,
            craCount,
          };
        },
      );

      const conseillersCoordonnes = await (
        await Promise.all(promises)
      ).filter((item) => item !== null);

      if (misesEnRelation.length > 0) {
        items.data = conseillersCoordonnes;
        items.total = conseillersCoordonnes.length;
        items.limit = limit;
        items.skip = Number(skip);
      }
      return res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getConseillersCoordonnes;
