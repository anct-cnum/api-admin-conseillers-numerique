import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import mailer from '../../../mailer';
import {
  refusCandidatureStructurePrefet,
  refusCandidatureStructure,
} from '../../../emails';
import { IStructures, IUser } from '../../../ts/interfaces/db.interfaces';

const updateRefusConventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    if (!ObjectId.isValid(idStructure)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(idStructure),
          coordinateurCandidature: false,
          statut: 'CREEE',
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }

      const coselec = [
        {
          nombreConseillersCoselec: 0,
          avisCoselec: 'NÉGATIF',
          insertedAt: new Date(),
        },
      ];

      const structureUpdated = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idStructure),
            coordinateurCandidature: false,
            statut: 'CREEE',
          },
          {
            $set: {
              statut: 'REFUS_COSELEC',
              coselec,
              coselecAt: new Date(),
            },
          },
          {
            returnOriginal: false,
            rawResult: true,
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
            'structure.$id': new ObjectId(idStructure),
            'structureObj.coordinateurCandidature': false,
            'structureObj.statut': 'CREEE',
          },
          {
            $set: {
              'structureObj.statut': 'REFUS_COSELEC',
              'structure.coselec': coselec,
              'structureObj.coselecAt': new Date(),
            },
          },
        );

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
        const messageRefusCandidatureStructurePrefet =
          refusCandidatureStructurePrefet(mailerInstance);
        await prefets.forEach(async (prefet) => {
          // eslint-disable-next-line no-async-promise-executor
          const p = new Promise<void>(async (resolve, reject) => {
            const errorSmtpMailCandidatureStructurePrefet =
              await messageRefusCandidatureStructurePrefet
                .send(prefet, structureUpdated)
                .catch((errSmtp: Error) => {
                  return errSmtp;
                });
            if (errorSmtpMailCandidatureStructurePrefet instanceof Error) {
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
        const messageRefusCandidatureStructure =
          refusCandidatureStructure(mailerInstance);
        const errorSmtpMailRefusCandidatureStructure =
          await messageRefusCandidatureStructure
            .send(structureUpdated.value)
            .catch((errSmtp: Error) => {
              return errSmtp;
            });
        if (errorSmtpMailRefusCandidatureStructure instanceof Error) {
          res.status(503).json({
            message: errorSmtpMailRefusCandidatureStructure.message,
          });
          return;
        }
      }
      res
        .status(200)
        .json({ success: true, structure: structureUpdated.value });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateRefusConventionnement;
