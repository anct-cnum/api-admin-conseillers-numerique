import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const validationRenouvellementContrat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idMiseEnRelation = req.params.id;

    try {
      const miseEnRelationVerif = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idMiseEnRelation) });
      if (
        miseEnRelationVerif.statut !== 'renouvellement_initié' &&
        !miseEnRelationVerif?.miseEnRelationConventionnement
      ) {
        res.status(400).json({
          message: 'Le renouvellement est impossible pour ce contrat',
        });
        return;
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idMiseEnRelation),
          },
          {
            $set: {
              statut: 'finalisee',
            },
          },
          { returnOriginal: false, rawResult: true },
        );
      if (miseEnRelationUpdated.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "La mise en relation n'a pas été mise à jour",
        });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: new ObjectId(
              miseEnRelationVerif.miseEnRelationConventionnement,
            ),
          },
          {
            $set: {
              statut: 'terminée',
            },
          },
        );
      res
        .status(200)
        .json({ miseEnRelationUpdated: miseEnRelationUpdated.value });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default validationRenouvellementContrat;
