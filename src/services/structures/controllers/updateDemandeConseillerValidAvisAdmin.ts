import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IStructures, IUser } from '../../../ts/interfaces/db.interfaces';
import {
  PhaseConventionnement,
  StatutConventionnement,
} from '../../../ts/enum';
import mailer from '../../../mailer';
import { validationCandidaturePosteConseillerPrefet } from '../../../emails';

const updateDemandeConseillerValidAvisAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { nombreConseillersCoselec } = req.body;
    if (!ObjectId.isValid(idStructure)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    if (
      Number.isNaN(Number(nombreConseillersCoselec)) ||
      nombreConseillersCoselec < 1
    ) {
      res
        .status(400)
        .json({ message: 'Nombre de conseillers saisi incorrect' });
      return;
    }
    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.findOne({
          _id: new ObjectId(idStructure),
          coordinateurCandidature: false,
          statut: { $in: ['CREEE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'] },
        });
      if (!structure) {
        res.status(404).json({
          message:
            "La structure n'existe pas ou n'a pas postulé pour recruter un conseiller",
        });
        return;
      }
      const updatedAt = new Date();
      const structureUpdated = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: structure._id,
          },
          {
            $set: {
              'conventionnement.statut':
                StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
              statut: 'VALIDATION_COSELEC',
              coselecAt: updatedAt,
              updatedAt,
            },
            $push: {
              coselec: {
                nombreConseillersCoselec,
                avisCoselec: 'POSITIF',
                phaseConventionnement: PhaseConventionnement.PHASE_2,
                validateur: req.user?.name,
                insertedAt: new Date(),
              },
            },
          },
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
      const prefets: IUser[] = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          roles: { $in: ['prefet'] },
          departement: structure.codeDepartement,
        })
        .select({ _id: 0, name: 1 });

      const mailerInstance = mailer(app);
      if (prefets.length > 0) {
        const promises: Promise<void>[] = [];
        const messageAvisCandidaturePosteConseiller =
          validationCandidaturePosteConseillerPrefet(mailerInstance);
        await prefets.forEach(async (prefet) => {
          // eslint-disable-next-line no-async-promise-executor
          const p = new Promise<void>(async (resolve, reject) => {
            const errorSmtpMailCandidaturePosteConseiller =
              await messageAvisCandidaturePosteConseiller
                .send(prefet, structureUpdated)
                .catch((errSmtp: Error) => {
                  return errSmtp;
                });
            if (errorSmtpMailCandidaturePosteConseiller instanceof Error) {
              reject();
              return;
            }
            resolve(p);
          });
          promises.push(p);
        });
        await Promise.allSettled(promises);
      }

      res.status(200).json(structureUpdated);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateDemandeConseillerValidAvisAdmin;
