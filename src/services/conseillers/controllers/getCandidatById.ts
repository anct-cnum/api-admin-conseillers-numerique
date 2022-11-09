import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';

const getCandidatById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    try {
      // Attention : pas d'access control car tout le monde peut voir tous les candidats
      const conseiller: IConseillers = await app
        .service(service.conseillers)
        .Model.findOne({ _id: new ObjectId(idConseiller) });

      res.status(200).json(conseiller);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
    }
  };

export default getCandidatById;