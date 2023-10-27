import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import mailer from '../../../mailer';
import {
  avisCandidaturePosteCoordinateurStructure,
  avisCandidaturePosteCoordinateurPrefet,
} from '../../../emails';
import { IStructures, IUser } from '../../../ts/interfaces/db.interfaces';

const updateDemandeCoordinateurRefusAvisAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { idDemandeCoordinateur } = req.body;
    if (
      !ObjectId.isValid(idStructure) ||
      !ObjectId.isValid(idDemandeCoordinateur)
    ) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    const updatedDemandeCoordinateur = {
      $set: {
        'demandesCoordinateur.$.statut': 'refusee',
        'demandesCoordinateur.$.banniereValidationAvisAdmin': true,
      },
    };
    const updatedDemandeCoordinateurMiseEnRelation = {
      $set: {
        'structureObj.demandesCoordinateur.$.statut': 'refusee',
        'structureObj.demandesCoordinateur.$.banniereValidationAvisAdmin': true,
      },
    };
    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(idStructure),
          $or: [
            {
              statut: 'VALIDATION_COSELEC',
            },
            {
              coordinateurCandidature: true,
              statut: 'CREEE',
            },
          ],
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      if (structure.statut === 'CREEE') {
        Object.assign(updatedDemandeCoordinateur.$set, {
          statut: 'REFUS_COORDINATEUR',
        });
        Object.assign(updatedDemandeCoordinateurMiseEnRelation.$set, {
          'structureObj.statut': 'REFUS_COORDINATEUR',
        });
      } else {
        Object.assign(updatedDemandeCoordinateur.$set, {
          'demandesCoordinateur.$.banniereRefusAttributionPosteStructure': true,
        });
        Object.assign(updatedDemandeCoordinateurMiseEnRelation.$set, {
          'structureObj.demandesCoordinateur.$.banniereRefusAttributionPosteStructure':
            true,
        });
      }
      const structureUpdated = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: structure._id,
            demandesCoordinateur: {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
          },
          updatedDemandeCoordinateur,
          {
            new: true,
          },
        );
      if (!structureUpdated) {
        res
          .status(404)
          .json({ message: "La structure n'a pas été mise à jour" });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'structure.$id': structure._id,
            'structureObj.demandesCoordinateur': {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
          },
          updatedDemandeCoordinateurMiseEnRelation,
        );
      const prefets: IUser[] = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          roles: { $in: ['prefet'] },
          departement: structure.codeDepartement,
        })
        .select({ _id: 0, name: 1 });

      structureUpdated.demandesCoordinateur =
        structureUpdated.demandesCoordinateur.filter(
          (demandeCoordinateur) =>
            demandeCoordinateur.id.toString() === idDemandeCoordinateur,
        );
      const mailerInstance = mailer(app);
      if (prefets.length > 0) {
        const promises: Promise<void>[] = [];
        const messageAvisCandidaturePosteCoordinateur =
          avisCandidaturePosteCoordinateurPrefet(mailerInstance);
        await prefets.forEach(async (prefet) => {
          // eslint-disable-next-line no-async-promise-executor
          const p = new Promise<void>(async (resolve, reject) => {
            const errorSmtpMailCandidaturePosteCoordinateur =
              await messageAvisCandidaturePosteCoordinateur
                .send(prefet, structureUpdated)
                .catch((errSmtp: Error) => {
                  return errSmtp;
                });
            if (errorSmtpMailCandidaturePosteCoordinateur instanceof Error) {
              reject();
              return;
            }
            resolve(p);
          });
          promises.push(p);
        });
        await Promise.allSettled(promises);
      }
      if (structure?.contact?.email) {
        const messageAvisCandidaturePosteCoordinateur =
          avisCandidaturePosteCoordinateurStructure(mailerInstance);
        const errorSmtpMailCandidaturePosteCoordinateur =
          await messageAvisCandidaturePosteCoordinateur
            .send(structureUpdated)
            .catch((errSmtp: Error) => {
              return errSmtp;
            });
        if (errorSmtpMailCandidaturePosteCoordinateur instanceof Error) {
          res.status(503).json({
            message: errorSmtpMailCandidaturePosteCoordinateur.message,
          });
          return;
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateDemandeCoordinateurRefusAvisAdmin;
