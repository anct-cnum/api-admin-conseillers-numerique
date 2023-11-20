import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { getCoselec } from '../../../utils';
import { countConseillersRecrutees } from '../misesEnRelation.repository';

const updateMiseEnRelation =
  (app: Application) => async (req: IRequest, res: Response) => {
    const filter = { _id: req.params.id };

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
        const dernierCoselec = getCoselec(structure);
        if (dernierCoselec !== null) {
          // Nombre de candidats déjà recrutés pour cette structure
          const misesEnRelationRecrutees = await countConseillersRecrutees(
            app,
            req,
            miseEnRelationVerif.structure.oid,
          );
          if (
            misesEnRelationRecrutees.length >
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
          dossierIncompletRupture: '',
        };
      }
      if (
        req.body.statut === 'interessee' &&
        miseEnRelationVerif.statut === 'recrutee'
      ) {
        if (miseEnRelationVerif?.contratCoordinateur) {
          const structureUpdated = await app
            .service(service.structures)
            .Model.accessibleBy(req.ability, action.update)
            .updateOne(
              {
                _id: structure._id,
                demandesCoordinateur: {
                  $elemMatch: {
                    miseEnRelationId: miseEnRelationVerif._id,
                  },
                },
              },
              {
                $unset: {
                  'demandesCoordinateur.$.miseEnRelationId': '',
                },
              },
            );
          if (structureUpdated.modifiedCount === 0) {
            res.status(400).json({
              message: "la structure n'a pas pu être mise à jour",
            });
            return;
          }
          await app
            .service(service.structures)
            .Model.accessibleBy(req.ability, action.update)
            .updateMany(
              {
                _id: structure._id,
                demandesCoordinateur: {
                  $elemMatch: {
                    miseEnRelationId: miseEnRelationVerif._id,
                  },
                },
              },
              {
                $unset: {
                  'demandesCoordinateur.$.miseEnRelationId': '',
                },
              },
            );
        }
        remove = {
          dateDebutDeContrat: '',
          dateFinDeContrat: '',
          typeDeContrat: '',
          salaire: '',
          emetteurRecrutement: '',
          contratCoordinateur: '',
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
        update.dossierIncompletRupture = true;
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
