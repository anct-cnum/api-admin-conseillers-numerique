import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';
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

const { Pool } = require('pg');

const updateStructurePG = (pool) => async (idPG: number, datePG: string) => {
  try {
    await pool.query(
      `
      UPDATE djapp_hostorganization
      SET updated = $2
      WHERE id = $1`,
      [idPG, datePG],
    );
  } catch (error) {
    throw new Error(error);
  }
};

const updateDemandeConseillerValidAvisAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { nombreConseillersCoselec } = req.body;
    const pool = new Pool();
    if (!ObjectId.isValid(idStructure)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    if (
      Number.isNaN(nombreConseillersCoselec) ||
      nombreConseillersCoselec < 1
    ) {
      res
        .status(400)
        .json({ message: 'Nombre de conseillers COSELEC incorrect' });
      return;
    }
    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.findOne({
          _id: new ObjectId(idStructure),
          coordinateurCandidature: false,
          statut: 'CREEE',
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const updatedAt = new Date();
      const datePG = dayjs(updatedAt).format('YYYY-MM-DD');
      await updateStructurePG(pool)(structure.idPG, datePG);
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
                insertedAt: new Date(),
                phaseConventionnement: PhaseConventionnement.PHASE_2,
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
