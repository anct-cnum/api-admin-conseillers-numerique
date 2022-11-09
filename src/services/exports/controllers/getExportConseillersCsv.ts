import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validExportConseillers } from '../../../schemas/conseillers.schemas';
import {
  filterIsCoordinateur,
  filterNomConseiller,
  filterRegion,
  filterNomStructure,
  filterIsRupture,
} from '../../conseillers/conseillers.repository';
import { generateCsvConseillers } from '../exports.repository';
import { getNombreCras } from '../../cras/cras.repository';
import checkAccessReadRequestMisesEnRelation from '../../misesEnRelation/misesEnRelation.repository';

const getExportConseillersCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      searchByStructure,
      region,
    } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const emailValidation = validExportConseillers.validate({
      dateDebut,
      dateFin,
      ordre,
      nomOrdre,
      coordinateur,
      rupture,
      searchByConseiller,
      searchByStructure,
      region,
    });

    if (emailValidation.error) {
      res.statusMessage = emailValidation.error.message;
      res.status(400).end();
      return;
    }
    const sortColonne = JSON.parse(`{"conseillerObj.${nomOrdre}":${ordre}}`);
    try {
      let conseillers: any[];
      const checkAccess = await checkAccessReadRequestMisesEnRelation(app, req);
      conseillers = await app.service(service.misesEnRelation).Model.aggregate([
        {
          $match: {
            ...filterIsRupture(rupture),
            ...filterIsCoordinateur(coordinateur),
            ...filterNomConseiller(searchByConseiller),
            ...filterRegion(region),
            ...filterNomStructure(searchByStructure),
            'conseillerObj.datePrisePoste': { $gt: dateDebut, $lt: dateFin },
            $and: [checkAccess],
          },
        },
        {
          $project: {
            _id: 0,
            'conseillerObj._id': 1,
            'conseillerObj.idPG': 1,
            'conseillerObj.prenom': 1,
            'conseillerObj.nom': 1,
            'conseillerObj.emailCN.address': 1,
            dateRecrutement: 1,
            'structureObj.idPG': 1,
            'structureObj._id': 1,
            'structureObj.nom': 1,
            'conseillerObj.telephonePro': 1,
            'conseillerObj.email': 1,
            'conseillerObj.datePrisePoste': 1,
            'conseillerObj.dateFinFormation': 1,
            'conseillerObj.disponible': 1,
            'conseillerObj.estCoordinateur': 1,
          },
        },
        { $sort: sortColonne },
      ]);
      conseillers = await Promise.all(
        conseillers.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.craCount = await getNombreCras(app, req)(item.conseillerObj._id);

          return item;
        }),
      );

      generateCsvConseillers(conseillers, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getExportConseillersCsv;
