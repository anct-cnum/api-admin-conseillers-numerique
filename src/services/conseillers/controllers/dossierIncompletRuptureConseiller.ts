import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const dossierIncompletRuptureConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    const { dateFinDeContrat, dossierIncomplet } = req.body;
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
              dossierIncompletRupture: dossierIncomplet,
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
