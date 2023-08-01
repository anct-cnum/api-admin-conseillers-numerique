import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvListeStructures } from '../exports.repository';
import { validExportStructures } from '../../../schemas/structures.schemas';
import {
  checkAccessReadRequestStructures,
  filterDepartement,
  filterSearchBar,
  filterRegion,
  filterStatut,
  filterType,
} from '../../structures/repository/structures.repository';
import { getNombreCrasByStructureId } from '../../cras/cras.repository';
import { getCoselec } from '../../../utils';
import { action } from '../../../helpers/accessControl/accessList';

const getExportListeStructuresCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { ordre, nomOrdre, type, statut, searchByNom, departement, region } =
      req.query;
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const emailValidation = validExportStructures.validate({
      dateDebut,
      dateFin,
      ordre,
      nomOrdre,
      type,
      statut,
      searchByNom,
      departement,
      region,
    });

    if (emailValidation.error) {
      res.statusMessage = emailValidation.error.message;
      res.status(400).end();
      return;
    }
    const sortColonne = JSON.parse(`{"${nomOrdre}":${ordre}}`);
    try {
      let structures;
      const checkAccessStructures = await checkAccessReadRequestStructures(
        app,
        req,
      );
      structures = await app.service(service.structures).Model.aggregate([
        {
          $match: {
            createdAt: { $gt: dateDebut, $lt: dateFin },
            $and: [checkAccessStructures],
            ...filterType(type),
            ...filterStatut(statut),
            ...filterRegion(region),
            ...filterDepartement(departement),
            ...filterSearchBar(searchByNom),
          },
        },
        {
          $project: {
            _id: 1,
            idPG: 1,
            nom: 1,
            siret: 1,
            createdAt: 1,
            codePostal: 1,
            type: 1,
            coselec: 1,
            statut: 1,
            qpvStatut: 1,
            insee: 1,
            'contact.prenom': 1,
            'contact.nom': 1,
            'contact.email': 1,
            'contact.telephone': 1,
            'contact.fonction': 1,
          },
        },
        { $sort: sortColonne },
      ]);

      structures = await Promise.all(
        structures.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.craCount = await getNombreCrasByStructureId(app, req)(item._id);
          item.conseillersRecruter = await app
            .service(service.misesEnRelation)
            .Model.accessibleBy(req.ability, action.read)
            .countDocuments({
              'structure.$id': item._id,
              statut: { $in: ['recrutee', 'finalisee'] },
            });
          item.posteValiderCoselec =
            getCoselec(item)?.nombreConseillersCoselec ?? 0;

          return item;
        }),
      );
      generateCsvListeStructures(structures, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportListeStructuresCsv;
