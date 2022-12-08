import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const dossierIncompletRuptureConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    try {
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: new ObjectId(idConseiller) },
          {
            $set: {
              dossierIncompletRupture: true,
            },
          },
        );

      res.status(200).json({ dossierIncompletRupture: true });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default dossierIncompletRuptureConseiller;
