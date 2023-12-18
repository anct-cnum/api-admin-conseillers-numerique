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
        if (
          new Date(req.body.dateRupture) >=
          new Date(miseEnRelationVerif?.dateFinDeContrat)
        ) {
          res.status(409).json({
            message:
              'La date de rupture doit être antérieure à la date de fin contrat',
          });
          return;
        }
        // Etat initiale: dossierIncompletRupture = false -> afin de définir le flag 'Nouvelle demande'
        // Etat intermédiaire : dossierIncompletRupture = true -> afin de définir le flag 'En attente de document'
        // Etat finale unset de dossierIncompletRupture -> afin de définir le flag 'Complet'
        update.dossierIncompletRupture = false;
        update.emetteurRupture = {
          email: req.user.name,
          date: new Date(),
        };
      }
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: filter },
          {
            $set: update,
            $unset: remove,
          },
          { new: true, rawResult: true },
        );
      if (miseEnRelation.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "Le contrat n'a pas été mis à jour",
        });
        return;
      }
      res.status(200).json({ miseEnRelation: miseEnRelation.value });
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
