import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action } from '../../../helpers/accessControl/accessList';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { getConseillersIdsByStructure } from '../../cras/cras.repository';
import {
  countStructures,
  getStructuresIds,
} from '../../structures/structures.repository';
import {
  getNombreCra,
  getPersonnesAccompagnees,
  getStatsActivites,
} from '../stats.repository';

const getDatasStructures =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    try {
      const dateDebut = new Date(String(req.query.dateDebut));
      const dateFin = new Date(String(req.query.dateFin));
      const page = Number(req.query.page);

      const items = {
        data: [],
        skip: page,
        total: 0,
        limit: options.paginate.default,
      };
      const count = await countStructures(req.ability, action.read, app);
      const structures = await getStructuresIds(
        page > 0 ? (page - 1) * options.paginate.default : 0,
        options.paginate.default,
        req.ability,
        action.read,
        app,
      );
      const structuresStatistiques = [];
      await Promise.all(
        structures.map(async (structure) => {
          const conseillerIds = await getConseillersIdsByStructure(
            structure._id,
            app,
          );
          let CRAEnregistres = 0;
          let personnesAccompagnees = 0;
          if (conseillerIds?.length > 0) {
            try {
              const query = {
                'conseiller.$id': {
                  $in: conseillerIds,
                },
                'cra.dateAccompagnement': {
                  $gte: dateDebut,
                  $lte: dateFin,
                },
              };

              CRAEnregistres = await getNombreCra(query, app);
              const statsActivites = await getStatsActivites(
                query,
                req.ability,
                action.read,
                app,
              );
              if (statsActivites) {
                personnesAccompagnees = await getPersonnesAccompagnees(
                  statsActivites,
                );
              }
            } catch (error) {
              res.status(500).json(error.message);
              throw new Error(error);
            }
          }
          const structureStatistiques = {
            _id: structure._id,
            idPG: structure.idPG,
            siret: structure.siret,
            nom: structure.nom,
            codePostal: structure.codePostal,
            CRAEnregistres,
            personnesAccompagnees,
          };
          structuresStatistiques.push(structureStatistiques);
        }),
      );

      items.data = structuresStatistiques;
      items.total = count;

      res.status(200).json({ items });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDatasStructures;
