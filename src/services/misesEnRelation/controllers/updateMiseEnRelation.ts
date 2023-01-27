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

    if (req.body.dateRecrutement) {
      req.body.dateRecrutement = new Date(req.body.dateRecrutement);
    }
    if (req.body.dateRupture) {
      req.body.dateRupture = new Date(req.body.dateRupture);
    }
    const update = req.body;
    let remove = {};

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
      if (
        miseEnRelationVerif.statut === 'recrutee' ||
        miseEnRelationVerif.statut === 'finalisee'
      ) {
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
      if (req.body.statut === 'finalisee') {
        remove = {
          emetteurRupture: '',
          dateRupture: '',
          motifRupture: '',
        };
      }
      if (req.body.statut === 'nouvelle_rupture') {
        if (req.body.dateRupture === null) {
          res.status(400).json({
            message:
              'La date de rupture doit être obligatoirement renseignée !',
          });
          return;
        }
        if (req.body.motifRupture === null) {
          res.status(400).json({
            message:
              'Le motif de rupture doit être obligatoirement renseigné !',
          });
          return;
        }
        update.emetteurRupture = {
          email: req.user.name,
          date: new Date(),
        };
      }
      const miseEnRelation: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: filter },
          {
            $set: update,
            $unset: remove,
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
