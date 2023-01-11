import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { getCoselec } from '../../../utils';

const updateMiseEnRelation =
  (app: Application) => async (req: IRequest, res: Response) => {
    const filter = { _id: req.params.id };
    const update = req.body;

    try {
      const miseEnRelationVerif: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(filter._id) });
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();
      if (!structure) {
        res.status(403).json({ message: "La structure n'existe pas" });
        return;
      }
      if (miseEnRelationVerif.statut === 'recrutee') {
        if (!miseEnRelationVerif.dateRecrutement) {
          res.status(400).json({
            message:
              'La date de recrutement doit être obligatoirement renseignée !',
          });
          return;
        }
        const dernierCoselec = getCoselec(structure);
        if (dernierCoselec !== null) {
          // Nombre de candidats déjà recrutés pour cette structure
          const misesEnRelationRecrutees = await app
            .service(service.misesEnRelation)
            .Model.accessibleBy(req.ability, action.read)
            .find({
              query: {
                statut: { $in: ['recrutee', 'finalisee'] },
              },
            });
          if (
            misesEnRelationRecrutees.length >=
            dernierCoselec.nombreConseillersCoselec
          ) {
            res.status(400).json({
              message:
                'Action non autorisée : quota atteint de conseillers validés par rapport au nombre de postes attribués',
            });
            return;
          }
        }
      }
      const miseEnRelation: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: filter },
          {
            $set: { ...update },
          },
          { new: true },
        );
      res.status(200).json(miseEnRelation);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateMiseEnRelation;
