import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvListeStructures } from '../exports.repository';
import { validExportStructures } from '../../../schemas/structures.schemas';
import {
  checkAccessReadRequestStructures,
  filterComs,
  filterDepartement,
  filterNomStructure,
  filterRegion,
  filterStatut,
  filterType,
} from '../../structures/structures.repository';
import { getConseillersById } from '../../../helpers/commonQueriesFunctions';
import { getNombreCrasByArrayConseillerId } from '../../cras/cras.repository';

const getExportListeStructuresCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      ordre,
      nomOrdre,
      type,
      statut,
      searchByNom,
      departement,
      region,
      coms,
    } = req.query;
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
      coms,
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
            ...filterComs(coms),
            ...filterNomStructure(searchByNom),
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
          const conseillersIds = await getConseillersById(app)(item._id);
          if (conseillersIds.length > 0) {
            item.craCount = await getNombreCrasByArrayConseillerId(
              app,
              req,
            )(conseillersIds);
          } else {
            item.craCount = 0;
          }

          return item;
        }),
      );
      generateCsvListeStructures(structures, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getExportListeStructuresCsv;
