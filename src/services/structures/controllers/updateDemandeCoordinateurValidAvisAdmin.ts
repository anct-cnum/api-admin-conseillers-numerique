import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { GraphQLClient } from 'graphql-request';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { getCoselec } from '../../../utils';
import {
  IMisesEnRelation,
  IStructures,
  IUser,
} from '../../../ts/interfaces/db.interfaces';
import {
  PhaseConventionnement,
  StatutConventionnement,
} from '../../../ts/enum';
import mailer from '../../../mailer';
import {
  validationCandidaturePosteCoordinateur,
  validationCandidaturePosteCoordinateurPrefet,
} from '../../../emails';
import { queryGetDossierDemarcheSimplifiee } from '../repository/demarchesSimplifiees.repository';
import { checkIfStructurePrimoPhase2 } from '../repository/structures.repository';

interface RequestBody {
  idDemandeCoordinateur: string;
}

const updateDemandeCoordinateurValidAvisAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { idDemandeCoordinateur }: RequestBody = req.body;
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
        'demandesCoordinateur.$.emetteurValidation': {
          email: req.user?.name,
          date: new Date(),
        },
        'demandesCoordinateur.$.banniereValidationAvisAdmin': true,
        'demandesCoordinateur.$.banniereInformationAvisStructure': true,
      },
    };
    const updatedDemandeCoordinateurMiseEnRelation = {
      $set: {
        'structureObj.demandesCoordinateur.$.statut': 'validee',
        'structureObj.demandesCoordinateur.$.emetteurValidation': {
          email: req.user?.name,
          date: new Date(),
        },
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
            'contact.email': 1,
            codeDepartement: 1,
          },
        );
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      // récupération des éventuels coordinateurs de la structure
      const miseEnRelations: IMisesEnRelation[] = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          statut: 'finalisee',
          'conseillerObj.estCoordinateur': true,
          'structure.$id': structure._id,
        })
        .select({ _id: 1 });
      // traitement lié aux coordinateurs en poste avant le nouveau parcours coordinateur
      if (miseEnRelations.length > 0) {
        // récupération des demandes coordinateurs validées de la structure qui sont déjà liées à des coordinateurs
        const structureWithDemandeCoordoValider = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .findOne(
            {
              _id: new ObjectId(idStructure),
              demandesCoordinateur: {
                $elemMatch: {
                  statut: 'validee',
                  miseEnRelationId: { $in: miseEnRelations },
                },
              },
            },
            {
              demandesCoordinateur: 1,
            },
          );
        // si aucune demande coordinateur validée n'est liée à un coordinateur, on lie la demande au premier coordinateur récupéré
        if (!structureWithDemandeCoordoValider) {
          Object.assign(updatedDemandeCoordinateur.$set, {
            'demandesCoordinateur.$.miseEnRelationId': miseEnRelations[0]._id,
          });
          Object.assign(updatedDemandeCoordinateurMiseEnRelation.$set, {
            'structureObj.demandesCoordinateur.$.miseEnRelationId':
              miseEnRelations[0]._id,
          });
        } else {
          // si une demande coordinateur validée est déjà liée à un coordinateur,
          // on trouve le premier coordinateur qui n'est pas lié à une demande
          const miseEnRelationId = miseEnRelations.find((miseEnRelation) => {
            return structureWithDemandeCoordoValider.demandesCoordinateur.every(
              (demandeCoordinateur) =>
                demandeCoordinateur?.miseEnRelationId?.toString() !==
                miseEnRelation._id.toString(),
            );
          })?._id;
          // si on trouve un coordinateur, on lie la demande à ce coordinateur sinon cela signifie que tous les coordinateurs sont déjà liés à une demande
          if (miseEnRelationId) {
            Object.assign(updatedDemandeCoordinateur.$set, {
              'demandesCoordinateur.$.miseEnRelationId': miseEnRelationId,
            });
            Object.assign(updatedDemandeCoordinateurMiseEnRelation.$set, {
              'structureObj.demandesCoordinateur.$.miseEnRelationId':
                miseEnRelationId,
            });
          }
        }
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
              ...(checkIfStructurePrimoPhase2(structure) && {
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
              ...(checkIfStructurePrimoPhase2(structure) && {
                phaseConventionnement: PhaseConventionnement.PHASE_2,
              }),
            },
          },
        });
      }
      const updatedAt = new Date();
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
          validationCandidaturePosteCoordinateurPrefet(mailerInstance);
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
          validationCandidaturePosteCoordinateur(mailerInstance);
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
