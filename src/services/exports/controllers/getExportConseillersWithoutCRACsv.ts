import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { generateCsvConseillersWithoutCRA } from '../exports.repository';
import { action } from '../../../helpers/accessControl/accessList';

const getExportConseillersWithoutCRACsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let conseillers: IConseillers[];
    const dateMoins15jours = dayjs(Date.now()).subtract(15, 'day').toDate();
    try {
      const query = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();
      conseillers = await app.service(service.conseillers).Model.aggregate([
        {
          $match: {
            $and: [query],
            groupeCRA: { $eq: 4 },
            statut: { $eq: 'RECRUTE' },
            estCoordinateur: { $exists: false },
            groupeCRAHistorique: {
              $elemMatch: {
                nbJourDansGroupe: { $exists: false },
                'mailSendConseillerM+1,5': true,
                'dateMailSendConseillerM+1,5': { $lte: dateMoins15jours },
                'mailSendConseillerM+1': true,
              },
            },
          },
        },
        {
          $lookup: {
            localField: 'structureId',
            from: 'structures',
            foreignField: '_id',
            as: 'structure',
          },
        },
        { $unwind: '$structure' },
        {
          $project: {
            prenom: 1,
            nom: 1,
            emailCN: 1,
            codePostal: 1,
            codeDepartement: 1,
            telephone: 1,
            groupeCRAHistorique: 1,
            'structure.idPG': 1,
            'structure.siret': 1,
            'structure.nom': 1,
          },
        },
      ]);
      if (conseillers.length < 1) {
        res.statusMessage = 'Aucun conseiller';
        res.status(404).end();
        return;
      }
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.statusMessage = 'Accès refusé';
        res.status(403).end();
        return;
      }
      res.statusMessage = error.message;
      res.status(500).end();
      throw new Error(error);
    }
    generateCsvConseillersWithoutCRA(conseillers, res);
  };

export default getExportConseillersWithoutCRACsv;
