import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const closeBanner =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { type } = req.query;
    const filter = { _id: req.params.id };

    try {
      if (type !== 'renouvellement') {
        res.status(400).json({ message: 'Type incorrect' });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(filter, {
          $set: { banniereValidationRenouvellement: false },
        });

      res.status(200).json({ message: 'Bannière fermée' });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default closeBanner;
