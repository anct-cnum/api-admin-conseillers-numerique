import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';

const annulationRecrutementContrat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idMiseEnRelation = req.params.id;
    try {
      if (!ObjectId.isValid(idMiseEnRelation)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const miseEnRelation: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(idMiseEnRelation),
          statut: 'recrutee',
        });
      if (!miseEnRelation) {
        res.status(404).json({ message: "La mise en relation n'existe pas" });
        return;
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: new ObjectId(idMiseEnRelation),
            statut: 'recrutee',
          },
          {
            $set: {
              statut: 'interessee',
              banniereRefusRecrutement: true,
            },
            $unset: {
              dateDebutDeContrat: '',
              dateFinDeContrat: '',
              typeDeContrat: '',
              salaire: '',
              contratCoordinateur: '',
              emetteurRecrutement: '',
            },
          },
        );
      if (miseEnRelationUpdated.modifiedCount === 0) {
        res.status(404).json({
          message: "La mise en relation n'a pas été mise à jour",
        });
        return;
      }

      res.status(200).json(true);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default annulationRecrutementContrat;
