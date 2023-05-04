import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const createContrat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      body: { typeDeContrat, dateDebut, dateFin, salaire, miseEnrelationId },
    } = req;

    if (!ObjectId.isValid(miseEnrelationId)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    try {
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.findOne({ _id: new ObjectId(miseEnrelationId) });

      const duplicateMiseEnRelation = {
        ...miseEnRelation.toObject(),
        _id: new ObjectId(),
        typeDeContrat,
        dateDebut,
        dateFin,
        salaire,
        emetteurRenouvellement: {
          date: new Date(),
          email: req.user?.name,
        },
      };

      const newMiseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.create)
        .create(duplicateMiseEnRelation);

      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: miseEnRelation._id },
          {
            $set: {
              miseEnRelationReconventionnement: newMiseEnRelation._id,
            },
          },
        );

      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: newMiseEnRelation._id },
          {
            $set: {
              miseEnRelationConventionnement: miseEnRelation._id,
              statut: 'renouvellement_initié',
            },
          },
        );

      res.status(200).json({ message: 'Contrat créé' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

export default createContrat;
