import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  IConseillers,
  IMisesEnRelation,
  IStructures,
  IUser,
} from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import mailer from '../../../mailer';
import { deleteAccount } from '../../../utils/mattermost';
import { conseillerRuptureStructure } from '../../../emails';
import canValidateTermination from '../../../helpers/accessControl/canValidateTermination';

const { v4: uuidv4 } = require('uuid');

const conseillerRecruteReinscription =
  (app, req) =>
  async (idUser: ObjectId, idConseiller: ObjectId, updatedAt: Date) => {
    try {
      await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.delete)
        .deleteOne({ _id: idUser });
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: idConseiller },
          {
            $set: {
              userCreated: false,
              updatedAt,
            },
          },
        );
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          { 'conseiller.$id': idConseiller },
          {
            $set: {
              'conseillerObj.userCreated': false,
              'conseillerObj.updatedAt': updatedAt,
            },
          },
        );
    } catch (error) {
      throw new Error(error);
    }
  };

const updateCoordinateurRupture =
  (app: Application) =>
  async (
    conseillerId: ObjectId,
    structureId: ObjectId,
    miseEnRelationId: ObjectId,
  ) => {
    try {
      const conseillers: IConseillers[] = await app
        .service(service.conseillers)
        .Model.find({
          coordinateurs: {
            $elemMatch: {
              id: conseillerId,
            },
          },
        })
        .select({ coordinateurs: 1 });
      if (conseillers.length > 0) {
        const promises: Promise<void>[] = [];
        conseillers.forEach(async (conseillerCoordonnee: IConseillers) => {
          // eslint-disable-next-line no-async-promise-executor
          const p = new Promise<void>(async (resolve, reject) => {
            try {
              if (conseillerCoordonnee.coordinateurs.length === 1) {
                await app.service(service.conseillers).Model.updateOne(
                  { _id: conseillerCoordonnee._id },
                  {
                    $unset: {
                      coordinateurs: '',
                    },
                  },
                );
                await app.service(service.misesEnRelation).Model.updateMany(
                  { 'conseiller.$id': conseillerCoordonnee._id },
                  {
                    $unset: {
                      'conseillerObj.coordinateurs': '',
                    },
                  },
                );
              } else {
                await app.service(service.conseillers).Model.updateOne(
                  { _id: conseillerCoordonnee._id },
                  {
                    $pull: {
                      coordinateurs: {
                        id: conseillerId,
                      },
                    },
                  },
                );
                await app.service(service.misesEnRelation).Model.updateMany(
                  { 'conseiller.$id': conseillerCoordonnee._id },
                  {
                    $pull: {
                      'conseillerObj.coordinateurs': {
                        id: conseillerId,
                      },
                    },
                  },
                );
              }
              resolve(p);
            } catch (e) {
              reject(e);
            }
          });
          promises.push(p);
        });
        await Promise.allSettled(promises);
      }
      await app.service(service.structures).Model.updateOne(
        {
          _id: structureId,
          demandesCoordinateur: {
            $elemMatch: {
              statut: 'validee',
              miseEnRelationId,
            },
          },
        },
        {
          $unset: {
            'demandesCoordinateur.$.miseEnRelationId': '',
          },
        },
      );
      await app.service(service.misesEnRelation).Model.updateMany(
        {
          'structure.$id': structureId,
          'structureObj.demandesCoordinateur': {
            $elemMatch: {
              statut: 'validee',
              miseEnRelationId,
            },
          },
        },
        {
          $unset: {
            'structureObj.demandesCoordinateur.$.miseEnRelationId': '',
          },
        },
      );
    } catch (error) {
      throw new Error(error);
    }
  };

const updateConseillerRupture =
  (app, req) =>
  async (
    conseiller: IConseillers,
    miseEnRelation: IMisesEnRelation,
    dateFinDeContrat: Date,
    updatedAt: Date,
  ) => {
    try {
      const objAnonyme = {
        conseillerId: conseiller._id,
        structureId: conseiller.structureId,
        dateRupture: dateFinDeContrat,
        motifRupture: miseEnRelation.motifRupture,
      };

      await app.service(service.conseillersRuptures).Model.create(objAnonyme);

      const conseillerUpdated = await app
        .service(service.conseillers)
        .Model.findOneAndUpdate(
          { _id: conseiller._id },
          {
            $set: {
              disponible: true,
              statut: 'RUPTURE',
              updatedAt,
            },
            $push: {
              ruptures: {
                structureId: conseiller.structureId,
                dateRupture: new Date(dateFinDeContrat),
                motifRupture: miseEnRelation.motifRupture,
              },
            },
            $unset: {
              estRecrute: '',
              structureId: '',
              emailCNError: '',
              emailCN: '',
              emailPro: '',
              telephonePro: '',
              supHierarchique: '',
              mattermost: '',
              resetPasswordCNError: '',
              codeRegionStructure: '',
              codeDepartementStructure: '',
              hasPermanence: '',
              coordinateurs: '',
              listeSubordonnes: '',
              estCoordinateur: '',
            },
          },
          { returnOriginal: false },
        );

      await app.service(service.conseillers).Model.updateMany(
        {
          estCoordinateur: true,
          'listeSubordonnes.type': 'conseillers',
          'listeSubordonnes.liste': {
            $elemMatch: { $eq: conseiller._id },
          },
        },
        {
          $pull: {
            'listeSubordonnes.liste': conseiller._id,
          },
        },
      );

      await app.service(service.permanences).Model.deleteMany({
        conseillers: {
          $eq: [conseiller._id],
        },
      });

      await app.service(service.permanences).Model.updateMany(
        {
          $or: [
            { conseillers: { $elemMatch: { $eq: conseiller._id } } },
            {
              conseillersItinerants: {
                $elemMatch: { $eq: conseiller._id },
              },
            },
            {
              lieuPrincipalPour: {
                $elemMatch: { $eq: conseiller._id },
              },
            },
          ],
        },
        {
          $pull: {
            conseillers: conseiller._id,
            lieuPrincipalPour: conseiller._id,
            conseillersItinerants: conseiller._id,
          },
        },
      );

      await app
        .service(service.cras)
        .Model.updateMany(
          { 'conseiller.$id': conseiller._id },
          { $unset: { permanence: '' } },
        );

      const miseEnRelationUpdated: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.findOneAndUpdate(
          {
            'conseiller.$id': conseiller._id,
            'structure.$id': conseiller.structureId,
            statut: { $eq: 'nouvelle_rupture' },
          },
          {
            $set: {
              statut: 'finalisee_rupture',
              dateRupture: new Date(dateFinDeContrat),
              conseillerObj: conseillerUpdated,
              validateurRupture: { email: req.user?.name, date: new Date() },
            },
            $unset: {
              dossierIncompletRupture: '',
            },
          },
          { returnOriginal: false },
        );

      // Modification des doublons potentiels
      await app.service(service.conseillers).Model.updateMany(
        {
          _id: { $ne: conseiller._id },
          email: conseiller.email,
        },
        {
          $set: {
            disponible: true,
            updatedAt,
          },
        },
      );
      return miseEnRelationUpdated;
    } catch (error) {
      throw new Error(error);
    }
  };
// Vérification  informations necessairesdes pour valider la rupture d'un conseiller
const validationRuptureConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    const { dateFinDeContrat, motifRupture } = req.body.payload;
    try {
      if (!dateFinDeContrat) {
        res.status(400).json({
          message: 'Aucune date de fin de contrat renseignée',
        });
        return;
      }
      if (new Date(dateFinDeContrat) > new Date()) {
        res.status(400).json({
          message:
            'La date de fin de contrat doit être antérieure à la date du jour',
        });
        return;
      }
      const conseiller: IConseillers = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idConseiller) });
      if (!conseiller) {
        res.status(404).json({ message: "Le conseiller n'existe pas" });
        return;
      }
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: conseiller.structureId });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      // Si CDIsation passer la mise en relation en nouvelle_rupture et motifRupture CDIsation
      let miseEnRelation = null;
      if (
        motifRupture === 'CDIsation' &&
        req.user.entity?.oid.toString() === structure._id.toString()
      ) {
        miseEnRelation = await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate(
            {
              'conseiller.$id': conseiller._id,
              'structure.$id': structure._id,
              statut: { $eq: 'finalisee' },
            },
            {
              $set: {
                statut: 'nouvelle_rupture',
                motifRupture: 'CDIsation',
                emetteurRupture: {
                  email: req.user.name,
                  date: new Date(),
                },
              },
            },
            { returnOriginal: false },
          );
        // Si il y a une erreure lors de l'initialisation de la rupture on ne continue pas on renvoie une erreur
        if (!miseEnRelation) {
          res.status(409).json({
            message:
              'Une erreur est survenue lors de l initialisation de la rupture',
          });
        }
      } else {
        miseEnRelation = await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.read)
          .findOne({
            'conseiller.$id': conseiller._id,
            'structure.$id': structure._id,
            statut: { $eq: 'nouvelle_rupture' },
          });
        if (!miseEnRelation) {
          res.status(404).json({
            message: `Aucune mise en relation finalisée entre la structure id ${structure.idPG} et le conseiller id ${conseiller.idPG}`,
          });
          return;
        }
      }

      const miseEnRelationRenouvellementEnCours: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          'conseiller.$id': conseiller._id,
          'structure.$id': structure._id,
          statut: { $eq: 'renouvellement_initiee' },
        });
      if (miseEnRelationRenouvellementEnCours) {
        res.status(404).json({
          message: `Une demande de renouvellement de contrat est en cours pour ce conseiller`,
        });
        return;
      }
      if (
        new Date(dateFinDeContrat) > new Date(miseEnRelation?.dateFinDeContrat)
      ) {
        res.status(409).json({
          message:
            'La date de rupture doit être antérieure à la date de fin contrat',
        });
        return;
      }
      if (!miseEnRelation.motifRupture) {
        res.status(409).json({
          message: 'Aucun motif de rupture renseigné',
        });
        return;
      }
      const userCoop: IUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          roles: { $in: ['conseiller'] },
          'entity.$id': conseiller._id,
        });
      if (!userCoop) {
        res.status(404).json({ message: "L'utilisateur n'existe pas" });
        return;
      }
      if (!canValidateTermination(req.user, miseEnRelation)) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à valider la rupture d'un conseiller`,
        });
        return;
      }

      const updatedAt = new Date();
      // Création du conseillers dans la table conseillers_ruptures et mise à jour du conseiller en statut RUPTURE dans la collection conseillers
      // Suppression des permanences du conseiller dans la collection permanences et dans les CRAs
      // Passage du statut de la mise en relation de nouvelle_rupture en finalisée_rupture
      const miseEnRelationUpdated = await updateConseillerRupture(app, req)(
        conseiller,
        miseEnRelation,
        dateFinDeContrat,
        updatedAt,
      );
      // Si le conseiller est coordinateur, on supprime les liens avec les conseillers subordonnés
      if (conseiller?.estCoordinateur) {
        await updateCoordinateurRupture(app)(
          conseiller._id,
          structure._id,
          miseEnRelation._id,
        );
      }
      // Cas spécifique : conseiller recruté s'est réinscrit sur le formulaire d'inscription => compte coop + compte candidat
      const userCandidatAlreadyPresent = await app
        .service(service.users)
        .Model.findOne({
          roles: { $in: ['candidat'] },
          name: conseiller.email,
        });
      // Si le conseiller est recruté et qu'il s'est réinscrit, on le réinscrit en tant que candidat
      if (userCandidatAlreadyPresent !== null) {
        await conseillerRecruteReinscription(app, req)(
          userCoop._id,
          conseiller._id,
          updatedAt,
        );
      }
      // Suppression compte Mattermost
      if (conseiller.mattermost?.id !== undefined) {
        await deleteAccount(app, req)(conseiller);
      }
      const userToUpdate = {
        name: conseiller.email,
        roles: ['candidat'],
        ...(!userCoop.passwordCreated && {
          token: uuidv4(),
          tokenCreatedAt: new Date(),
          mailSentDate: null, // pour le mécanisme de relance d'invitation candidat
          passwordCreated: false,
        }),
      };
      if (userCoop !== null && userCandidatAlreadyPresent === null) {
        // Maj name si le compte coop a été activé
        if (conseiller.email !== userCoop.name) {
          await app.service(service.users).Model.updateOne(
            { _id: userCoop._id },
            {
              $set: { ...userToUpdate },
              $unset: {
                resetPasswordCnil: '',
              },
            },
          );
        } else {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const { name: _, ...userWithoutName } = userToUpdate; // nécessaire pour ne pas avoir d'erreur de duplicate key
          await app.service(service.users).Model.updateOne(
            { _id: userCoop._id },
            {
              $set: { ...userWithoutName },
              $unset: {
                resetPasswordCnil: '',
              },
            },
          );
        }
      }
      const mailerInstance = mailer(app);
      const messageRuptureStructure = conseillerRuptureStructure(
        app,
        mailerInstance,
        req,
      );
      const errorSmtpMailRuptureStructure = await messageRuptureStructure
        .send(miseEnRelation, structure)
        .catch((errSmtp: Error) => {
          return errSmtp;
        });
      if (errorSmtpMailRuptureStructure instanceof Error) {
        res
          .status(503)
          .json({ message: errorSmtpMailRuptureStructure.message });
        return;
      }
      res.send(miseEnRelationUpdated);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      await app.service(service.conseillers).Model.updateOne(
        { _id: idConseiller },
        {
          $set: { ruptureError: true },
        },
      );
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default validationRuptureConseiller;
