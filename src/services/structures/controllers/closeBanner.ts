import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const closeBanner =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { type } = req.query;
    const filter = { _id: req.params.id };

    try {
      if (!ObjectId.isValid(filter._id)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      if (type !== 'renouvellement') {
        res.status(400).json({ message: 'Type incorrect' });
        return;
      }
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { ...filter, statut: 'finalisee' },
          {
            $set: { banniereValidationRenouvellement: false },
          },
        );
      if (miseEnRelation.modifiedCount === 0) {
        res.status(404).json({
          message: "La mise en relation n'a pas été mise à jour",
        });
        return;
      }

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
