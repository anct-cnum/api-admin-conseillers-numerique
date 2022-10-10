import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validExportConseillers } from '../../../schemas/conseillers.schemas';
import { action } from '../../../helpers/accessControl/accessList';
import {
  filterIsCoordinateur,
  filterNom,
  checkAccessReadRequestConseillers,
} from '../../conseillers/conseillers.repository';
import { generateCsvConseillers } from '../exports.repository';

const getNombreCra =
  (app: Application, req: IRequest) => async (conseillerId: ObjectId) =>
    app
      .service(service.cras)
      .Model.accessibleBy(req.ability, action.read)
      .countDocuments({
        'conseiller.$id': conseillerId,
      });

const getExportConseillersCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { ordre, nomOrdre, isCoordinateur, isRupture, search } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const emailValidation = validExportConseillers.validate({
      dateDebut,
      dateFin,
      ordre,
      nomOrdre,
      isCoordinateur,
      isRupture,
      search,
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
            ...filterIsCoordinateur(isCoordinateur as string),
            ...filterNom(search as string),
          },
        },
        {
          $project: {
            _id: 1,
            idPG: 1,
            prenom: 1,
            nom: 1,
            'emailCN.address': 1,
            estCoordinateur: 1,
            statut: 1,
            structureId: 1,
          },
        },
        { $sort: sortColonne },
      ]);
      conseillers = await Promise.all(
        conseillers.map(async (ligneStats) => {
          const item = { ...ligneStats };
          const structure = await app
            .service(service.structures)
            .Model.findOne({ _id: new ObjectId(item.structureId) });
          const miseEnRelation = await app
            .service(service.misesEnRelation)
            .Model.accessibleBy(req.ability, action.read)
            .countDocuments({
              statut: { $eq: 'nouvelle_rupture' },
              'conseiller.$id': { $eq: new ObjectId(item._id) },
              'structure.$id': { $eq: new ObjectId(item.structureId) },
            });
          item.rupture = miseEnRelation > 0 ? 'oui' : 'non';
          if (structure) {
            item.craCount = await getNombreCra(app, req)(item._id);
          }
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
