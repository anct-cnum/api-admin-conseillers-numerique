import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  filterRegionConseillerObj,
  filterDepartementConseillerObj,
  filterNomConseillerObj,
} from '../../misesEnRelation/misesEnRelation.repository';
import { filterNomStructure } from '../../conseillers/repository/conseillers.repository';

import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';

import { generateCsvConseillersCoordonnes } from '../exports.repository';
import { getNombreCras } from '../../cras/cras.repository';
import { action } from '../../../helpers/accessControl/accessList';

const getExportConseillersCoordonnesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      ordre,
      nomOrdre,
      searchByConseiller,
      searchByStructure,
      region,
      departement,
    } = req.query;

    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);

    const items: { total: number; data: object } = {
      total: 0,
      data: [],
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
              nomStructure: '$structureObj.nom',
              dateDebutDeContrat: 1,
              dateFinDeContrat: 1,
              idPG: '$conseillerObj.idPG',
              _id: '$conseillerObj._id',
              nom: '$conseillerObj.nom',
              prenom: '$conseillerObj.prenom',
              groupeCRA: '$conseillerObj.groupeCRA',
              codeDepartement: '$conseillerObj.codeDepartement',
              codeRegion: '$conseillerObj.codeRegion',
              craCount: 1,
            },
          },
          {
            $sort: sortColonne,
          },
        ]);

      const promises = misesEnRelation.map(
        async (miseEnRelation: IMisesEnRelation) => {
          const craCount = await getNombreCras(app, req)(miseEnRelation._id);
          const dernierCRA = await app
            .service(service.cras)
            .Model.findOne({
              'conseiller.$id': miseEnRelation._id,
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
      }

      generateCsvConseillersCoordonnes(conseillersCoordonnes, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportConseillersCoordonnesCsv;
