import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { avenantAjoutPoste } from '../../../schemas/structures.schemas';
import { PhaseConventionnement } from '../../../ts/enum';
import { checkStructurePhase2 } from '../repository/structures.repository';
import mailer from '../../../mailer';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import {
  confirmationAttributionPostePrefet,
  confirmationAttributionPoste,
  refusAttributionPostePrefet,
  refusAttributionPoste,
} from '../../../emails';

interface IUpdateStructureAvenant {
  $push?: {
    coselec: {
      nombreConseillersCoselec: number;
      avisCoselec: string;
      insertedAt: Date;
      phaseConventionnement?: string;
    };
  };
  $set?: {
    coselecAt?: Date;
    updatedAt?: Date;
    'demandesCoselec.$.statut': string;
    'demandesCoselec.$.nombreDePostesAccordes'?: number;
    'demandesCoselec.$.banniereValidationAvenant'?: boolean;
    'demandesCoselec.$.validateurAvenant'?: object;
  };
}

interface IUpdateMiseEnRelationAvenant {
  $push?: {
    'structureObj.coselec': {
      nombreConseillersCoselec: number;
      avisCoselec: string;
      insertedAt: Date;
      phaseConventionnement?: string;
    };
  };
  $set?: {
    'structureObj.coselecAt'?: Date;
    'structureObj.updatedAt'?: Date;
    'structureObj.demandesCoselec.$.statut': string;
    'structureObj.demandesCoselec.$.nombreDePostesAccordes'?: number;
    'structureObj.demandesCoselec.$.banniereValidationAvenant'?: boolean;
    'structureObj.demandesCoselec.$.validateurAvenant'?: object;
  };
}

const updateAvenantAjoutPoste =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { statut, nbDePosteAccorder, nbDePosteCoselec } = req.body;
    const paramsUpdateCollectionStructure: IUpdateStructureAvenant = {};
    const paramsUpdateCollectionMiseEnRelation: IUpdateMiseEnRelationAvenant =
      {};
    const avenantAJoutPosteValidation = avenantAjoutPoste.validate({
      statut,
      nbDePosteAccorder,
      nbDePosteCoselec,
    });

    if (avenantAJoutPosteValidation.error) {
      res
        .status(400)
        .json({ message: avenantAJoutPosteValidation.error.message });
      return;
    }
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne(
          {
            _id: new ObjectId(idStructure),
          },
          { _id: 0, conventionnement: 1 },
        );
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const dateCoselec = new Date();
      if (statut === 'POSITIF') {
        paramsUpdateCollectionStructure.$set = {
          coselecAt: dateCoselec,
          updatedAt: dateCoselec,
          'demandesCoselec.$.statut': 'validee',
          'demandesCoselec.$.nombreDePostesAccordes': Number(nbDePosteAccorder),
          'demandesCoselec.$.banniereValidationAvenant': true,
          'demandesCoselec.$.validateurAvenant': {
            email: req.user?.name,
            date: dateCoselec,
          },
        };
        paramsUpdateCollectionStructure.$push = {
          coselec: {
            nombreConseillersCoselec:
              Number(nbDePosteAccorder) + Number(nbDePosteCoselec),
            avisCoselec: 'POSITIF',
            insertedAt: dateCoselec,
          },
        };
        paramsUpdateCollectionMiseEnRelation.$set = {
          'structureObj.coselecAt': dateCoselec,
          'structureObj.updatedAt': dateCoselec,
          'structureObj.demandesCoselec.$.statut': 'validee',
          'structureObj.demandesCoselec.$.nombreDePostesAccordes':
            Number(nbDePosteAccorder),
          'structureObj.demandesCoselec.$.banniereValidationAvenant': true,
          'structureObj.demandesCoselec.$.validateurAvenant': {
            email: req.user?.name,
            date: dateCoselec,
          },
        };
        paramsUpdateCollectionMiseEnRelation.$push = {
          'structureObj.coselec': {
            nombreConseillersCoselec:
              Number(nbDePosteAccorder) + Number(nbDePosteCoselec),
            avisCoselec: 'POSITIF',
            insertedAt: dateCoselec,
          },
        };
      }
      if (statut === 'NÉGATIF') {
        paramsUpdateCollectionStructure.$set = {
          'demandesCoselec.$.statut': 'refusee',
          'demandesCoselec.$.banniereValidationAvenant': true,
          'demandesCoselec.$.validateurAvenant': {
            email: req.user?.name,
            date: dateCoselec,
          },
        };
        paramsUpdateCollectionMiseEnRelation.$set = {
          'structureObj.demandesCoselec.$.statut': 'refusee',
          'structureObj.demandesCoselec.$.banniereValidationAvenant': true,
          'structureObj.demandesCoselec.$.validateurAvenant': {
            email: req.user?.name,
            date: dateCoselec,
          },
        };
        paramsUpdateCollectionStructure.$push = {
          coselec: {
            nombreConseillersCoselec: 0,
            avisCoselec: 'NÉGATIF',
            insertedAt: new Date(),
          },
        };
        paramsUpdateCollectionMiseEnRelation.$push = {
          'structureObj.coselec': {
            nombreConseillersCoselec: 0,
            avisCoselec: 'NÉGATIF',
            insertedAt: new Date(),
          },
        };
      }
      if (checkStructurePhase2(structure?.conventionnement?.statut)) {
        paramsUpdateCollectionStructure.$push.coselec.phaseConventionnement =
          PhaseConventionnement.PHASE_2;
        Object.assign(
          paramsUpdateCollectionMiseEnRelation.$push['structureObj.coselec'],
          {
            phaseConventionnement: PhaseConventionnement.PHASE_2,
          },
        );
      }
      const structureUpdated = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idStructure),
            demandesCoselec: {
              $elemMatch: {
                statut: { $eq: 'en_cours' },
                type: { $eq: 'ajout' },
              },
            },
            statut: 'VALIDATION_COSELEC',
          },
          paramsUpdateCollectionStructure,
          {
            new: true,
          },
        );
      if (!structureUpdated) {
        res.status(400).json({ message: "L'avenant n'a pas pu être modifié" });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'structure.$id': new ObjectId(idStructure),
            'structureObj.demandesCoselec': {
              $elemMatch: {
                statut: { $eq: 'en_cours' },
                type: { $eq: 'ajout' },
              },
            },
            'structureObj.statut': 'VALIDATION_COSELEC',
          },
          paramsUpdateCollectionMiseEnRelation,
        );
      const prefets: IUser[] = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          roles: { $in: ['prefet'] },
          departement: structureUpdated.codeDepartement,
        })
        .select({ _id: 0, name: 1 });

      const mailerInstance = mailer(app);
      if (prefets.length > 0) {
        const promises: Promise<void>[] = [];
        if (statut === 'POSITIF') {
          const messageConfirmationAttributionPoste =
            confirmationAttributionPostePrefet(mailerInstance);
          await prefets.forEach(async (prefet) => {
            // eslint-disable-next-line no-async-promise-executor
            const p = new Promise<void>(async (resolve, reject) => {
              const errorSmtpMailAttributionPoste =
                await messageConfirmationAttributionPoste
                  .send(prefet, structureUpdated, nbDePosteAccorder)
                  .catch((errSmtp: Error) => {
                    return errSmtp;
                  });
              if (errorSmtpMailAttributionPoste instanceof Error) {
                reject();
                return;
              }
              resolve(p);
            });
            promises.push(p);
          });
        } else {
          const messageRefusAttributionPoste =
            refusAttributionPostePrefet(mailerInstance);
          await prefets.forEach(async (prefet) => {
            // eslint-disable-next-line no-async-promise-executor
            const p = new Promise<void>(async (resolve, reject) => {
              const errorSmtpMailAttributionPoste =
                await messageRefusAttributionPoste
                  .send(prefet, structureUpdated)
                  .catch((errSmtp: Error) => {
                    return errSmtp;
                  });
              if (errorSmtpMailAttributionPoste instanceof Error) {
                reject();
                return;
              }
              resolve(p);
            });
            promises.push(p);
          });
        }
        await Promise.allSettled(promises);
      }
      if (structureUpdated?.contact?.email) {
        if (statut === 'POSITIF') {
          const messageAttributionPoste = confirmationAttributionPoste(
            app,
            mailerInstance,
          );
          const errorSmtpMailAttributionPoste = await messageAttributionPoste
            .send(structureUpdated, nbDePosteAccorder)
            .catch((errSmtp: Error) => {
              return errSmtp;
            });
          if (errorSmtpMailAttributionPoste instanceof Error) {
            res.status(503).json({
              message: errorSmtpMailAttributionPoste.message,
            });
            return;
          }
        } else {
          const messageAttributionPoste = refusAttributionPoste(
            app,
            mailerInstance,
          );
          const errorSmtpMailAttributionPoste = await messageAttributionPoste
            .send(structureUpdated)
            .catch((errSmtp: Error) => {
              return errSmtp;
            });
          if (errorSmtpMailAttributionPoste instanceof Error) {
            res.status(503).json({
              message: errorSmtpMailAttributionPoste.message,
            });
            return;
          }
        }
      }
      res.status(200).json({
        statutAvenantAjoutPosteUpdated:
          statut === 'POSITIF' ? 'validee' : 'refusee',
        nbDePosteAccorderUpdated: nbDePosteAccorder,
      });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateAvenantAjoutPoste;
