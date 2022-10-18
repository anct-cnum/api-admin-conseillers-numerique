import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validExportConseillers } from '../../../schemas/conseillers.schemas';
import {
  filterIsCoordinateur,
  filterNomConseiller,
  checkAccessReadRequestConseillers,
  filterRegion,
  filterNomStructure,
  filterIsRupture,
} from '../../conseillers/conseillers.repository';
import { generateCsvConseillers } from '../exports.repository';
import { getNombreCras } from '../../cras/cras.repository';

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
    const sortColonne = JSON.parse(`{"${nomOrdre}":${ordre}}`);
    try {
      let conseillers: any[];
      const checkAccess = await checkAccessReadRequestConseillers(app, req);
      conseillers = await app.service(service.conseillers).Model.aggregate([
        {
          $match: {
            statut: 'RECRUTE',
            datePrisePoste: { $gt: dateDebut, $lt: dateFin },
            $and: [checkAccess],
            ...filterIsCoordinateur(coordinateur as string),
            ...filterNomConseiller(searchByConseiller as string),
            ...filterRegion(region as string),
          },
        },
        {
          $lookup: {
            from: 'structures',
            let: { idStructure: '$structureId' },
            as: 'structure',
            pipeline: filterNomStructure(searchByStructure as string),
          },
        },
        { $unwind: '$structure' },
        {
          $lookup: {
            from: 'misesEnRelation',
            let: { idConseiller: '$idPG', idStructure: '$structure.idPG' },
            as: 'miseEnRelation',
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: { $eq: ['$$idConseiller', '$conseillerObj.idPG'] },
                    },
                    { $expr: { $eq: ['$$idStructure', '$structureObj.idPG'] } },
                    filterIsRupture(rupture as string),
                  ],
                },
              },
            ],
          },
        },
        { $unwind: '$miseEnRelation' },
        {
          $project: {
            _id: 1,
            idPG: 1,
            prenom: 1,
            nom: 1,
            'emailCN.address': 1,
            'miseEnRelation.dateRecrutement': 1,
            telephonePro: 1,
            email: 1,
            datePrisePoste: 1,
            dateFinFormation: 1,
            disponible: 1,
            estCoordinateur: 1,
          },
        },
        { $sort: sortColonne },
      ]);
      conseillers = await Promise.all(
        conseillers.map(async (ligneStats) => {
          const item = { ...ligneStats };
          item.craCount = await getNombreCras(app, req)(item._id);

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
