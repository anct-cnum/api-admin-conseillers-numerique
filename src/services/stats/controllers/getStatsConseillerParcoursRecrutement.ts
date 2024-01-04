import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import getStatsGlobales from './getStatsGlobales';
import { validStatConseiller } from '../../../schemas/stats.schemas';
import service from '../../../helpers/services';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';

const getStatsConseillerParcoursRecrutement =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idConseiller = String(req.query?.idConseiller);
      const dateDebut = new Date(req.query?.dateDebut);
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(req.query?.dateFin);
      dateFin.setUTCHours(23, 59, 59, 59);
      const { codePostal, codeCommune } = req.query;
      const statsValidation = validStatConseiller.validate({
        dateDebut,
        dateFin,
        codePostal,
        codeCommune,
      });
      if (statsValidation.error) {
        res.status(400).json({ message: statsValidation.error.message });
        return;
      }
      if (!ObjectId.isValid(idConseiller)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const conseiller: IConseillers = await app
        .service(service.conseillers)
        .Model.findOne({
          _id: new ObjectId(idConseiller),
          disponible: true,
        });
      if (!conseiller) {
        res.status(404).json({
          message: "Le conseiller n'existe pas ou il est non disponible",
        });
        return;
      }
      const structure = await app.service(service.structures).Model.findOne({
        _id: new ObjectId(req.user?.entity?.oid),
        statut: 'VALIDATION_COSELEC',
      });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
        'conseiller.$id': { $eq: conseiller._id },
      };

      if (codePostal) {
        query['cra.codePostal'] = codePostal;
      }
      if (
        req.query?.codeCommune !== '' &&
        req.query?.codeCommune !== 'null' &&
        req.query?.codeCommune !== undefined
      ) {
        query['cra.codeCommune'] = req.query?.codeCommune;
      }
      const donneesStats = await getStatsGlobales(
        query,
        req.ability,
        action.read,
        app,
      );

      res.status(200).json(donneesStats);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStatsConseillerParcoursRecrutement;
