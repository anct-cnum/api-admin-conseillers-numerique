import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { GraphQLClient } from 'graphql-request';
import dayjs from 'dayjs';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { queryGetDossierDemarcheSimplifiee } from '../repository/reconventionnement.repository';
import { getCoselec } from '../../../utils';
import { IStructures, IUser } from '../../../ts/interfaces/db.interfaces';
import {
  PhaseConventionnement,
  StatutConventionnement,
} from '../../../ts/enum';
import mailer from '../../../mailer';
import {
  avisCandidaturePosteCoordinateurStructure,
  avisCandidaturePosteCoordinateurPrefet,
} from '../../../emails';

const { Pool } = require('pg');

const checkIfStructurePhase2 = (structure: IStructures) =>
  structure?.conventionnement?.statut ===
    StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ ||
  structure.statut === 'CREEE';

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

const updateDemandeCoordinateurValidAvisAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const pool = new Pool();
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
        'demandesCoordinateur.$.statut': 'validee',
        'demandesCoordinateur.$.banniereValidationAvisAdmin': true,
        'demandesCoordinateur.$.banniereInformationAvisStructure': true,
      },
    };
    const updatedDemandeCoordinateurMiseEnRelation = {
      $set: {
        'structureObj.demandesCoordinateur.$.statut': 'validee',
        'structureObj.demandesCoordinateur.$.banniereValidationAvisAdmin': true,
        'structureObj.demandesCoordinateur.$.banniereInformationAvisStructure':
          true,
      },
    };
    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne(
          {
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
            demandesCoordinateur: {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
          },
          {
            'demandesCoordinateur.$': 1,
            statut: 1,
            coselec: 1,
            conventionnement: 1,
            idPG: 1,
          },
        );
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
        'demarche_simplifiee',
      );

      const graphQLClient = new GraphQLClient(demarcheSimplifiee.endpoint, {
        headers: {
          authorization: `Bearer ${demarcheSimplifiee.token_api}`,
          'content-type': 'application/json',
        },
      });
      const dossier: any | Error = await graphQLClient
        .request(queryGetDossierDemarcheSimplifiee(), {
          dossierNumber: structure.demandesCoordinateur[0].dossier.numero,
        })
        .catch(() => {
          return new Error("Le dossier n'existe pas");
        });
      if (dossier instanceof Error) {
        res.status(404).json({
          message: dossier.message,
        });
        return;
      }
      const champsFormulaire = dossier?.dossier?.champs?.filter(
        (champ) =>
          champ.id === 'Q2hhbXAtMzQ2MzcxNQ==' ||
          champ.id === 'Q2hhbXAtMzM5NTkxNA==',
      );
      const coselec = getCoselec(structure);
      if (
        champsFormulaire.some((champ) => champ.stringValue === 'Non') ||
        structure.statut === 'CREEE'
      ) {
        const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;
        const nombreConseillersValider = Number(nombreConseillersCoselec) + 1;
        Object.assign(updatedDemandeCoordinateur, {
          $push: {
            coselec: {
              nombreConseillersCoselec: nombreConseillersValider,
              avisCoselec: 'POSITIF',
              insertedAt: new Date(),
              type: 'coordinateur',
              ...(checkIfStructurePhase2(structure) && {
                phaseConventionnement: PhaseConventionnement.PHASE_2,
              }),
            },
          },
        });
        Object.assign(updatedDemandeCoordinateurMiseEnRelation, {
          $push: {
            'structureObj.coselec': {
              nombreConseillersCoselec: nombreConseillersValider,
              avisCoselec: 'POSITIF',
              insertedAt: new Date(),
              type: 'coordinateur',
              ...(checkIfStructurePhase2(structure) && {
                phaseConventionnement: PhaseConventionnement.PHASE_2,
              }),
            },
          },
        });
      }
      const updatedAt = new Date();
      const datePG = dayjs(updatedAt).format('YYYY-MM-DD');
      Object.assign(updatedDemandeCoordinateur.$set, {
        ...(structure.statut === 'CREEE' && {
          'conventionnement.statut':
            StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
        }),
        statut: 'VALIDATION_COSELEC',
        coselecAt: updatedAt,
        updatedAt,
      });
      Object.assign(updatedDemandeCoordinateurMiseEnRelation.$set, {
        ...(structure.statut === 'CREEE' && {
          'structureObj.conventionnement.statut':
            StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
        }),
        'structureObj.statut': 'VALIDATION_COSELEC',
        'structureObj.coselecAt': updatedAt,
        'structureObj.updatedAt': updatedAt,
      });
      await updateStructurePG(pool)(structure.idPG, datePG);
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
      // les nouvelles structures recevront un mail d'information COSELEC
      if (
        structure.statut === 'VALIDATION_COSELEC' &&
        structure?.contact?.email
      ) {
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

export default updateDemandeCoordinateurValidAvisAdmin;
