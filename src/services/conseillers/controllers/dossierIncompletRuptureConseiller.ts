import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';

const dossierIncompletRuptureConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    const { dateFinDeContrat } = req.body;
    if (!dateFinDeContrat) {
      res.status(400).json({
        message: 'Aucune date de fin de contrat renseignée',
      });
      return;
    }
    if (new Date(dateFinDeContrat) > new Date()) {
      res.status(400).json({
        message:
          'La date de fin de contrat doit être antérieure à la date du jour',
      });
      return;
    }

    try {
      const miseEnRelationVerif: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          'conseiller.$id': new ObjectId(idConseiller),
          statut: 'nouvelle_rupture',
        });
      if (
        miseEnRelationVerif?.dateFinDeContrat !== null &&
        new Date(dateFinDeContrat) >=
          new Date(miseEnRelationVerif?.dateFinDeContrat)
      ) {
        res.status(400).json({
          message:
            'La date de rupture doit être antérieure à la date de fin contrat',
        });
        return;
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            'conseiller.$id': new ObjectId(idConseiller),
            statut: 'nouvelle_rupture',
          },
          {
            $set: {
              dossierIncompletRupture: true,
              dateRupture: new Date(dateFinDeContrat),
            },
          },
          {
            new: true,
          },
        );

      res.status(200).json(miseEnRelationUpdated);
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
