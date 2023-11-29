import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  IConseillers,
  IMisesEnRelation,
  IStructures,
  IUser,
} from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import mailer from '../../../mailer';
import { deleteMailbox } from '../../../utils/gandi';
import deleteAccount from '../../../utils/mattermost';
import {
  conseillerRupturePix,
  conseillerRuptureStructure,
} from '../../../emails';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const updateConseillersPG = (pool) => async (email, disponible, datePG) => {
  try {
    await pool.query(
      `
      UPDATE djapp_coach
      SET (
        disponible,
        updated
      )
      =
      ($2,$3)
      WHERE LOWER(email) = LOWER($1)`,
      [email, disponible, datePG],
    );
  } catch (error) {
    throw new Error(error);
  }
};

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

      await app.service(service.conseillersRuptures).create(objAnonyme);

      const conseillerUpdated = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
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

      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
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

      await app
        .service(service.permanences)
        .Model.accessibleBy(req.ability, action.delete)
        .deleteMany({
          conseillers: {
            $eq: [conseiller._id],
          },
        });

      await app
        .service(service.permanences)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
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
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          { 'conseiller.$id': conseiller._id },
          { $unset: { permanence: '' } },
        );

      const miseEnRelationUpdated: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
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
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
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

const validationRuptureConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    const { dateFinDeContrat } = req.body;
    const pool = new Pool();
    try {
      if (!dateFinDeContrat) {
        res.status(400).json({
          message: 'Aucune date de fin de contrat renseignée',
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

      const miseEnRelation: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          'conseiller.$id': conseiller._id,
          'structure.$id': structure._id,
          statut: { $eq: 'nouvelle_rupture' },
          dateFinDeContrat: {
            $gte: new Date(dateFinDeContrat), // recherche de la nouvelle rupture qui a une fin de contrat >= à la date de rupture
          },
        });

      if (!miseEnRelation) {
        res.status(400).json({
          message:
            'La date de rupture doit être antérieure à la date de fin de contrat',
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
      const login = conseiller?.emailCN?.address?.substring(
        0,
        conseiller.emailCN?.address?.lastIndexOf('@'),
      );
      const canCreate = req.ability.can(
        action.create,
        ressource.conseillersRuptures,
      );
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à valider la rupture d'un conseiller`,
        });
        return;
      }
      const updatedAt = new Date();
      const datePG = dayjs(updatedAt).format('YYYY-MM-DD');
      await updateConseillersPG(pool)(conseiller.email, true, datePG);
      const miseEnRelationUpdated = await updateConseillerRupture(app, req)(
        conseiller,
        miseEnRelation,
        dateFinDeContrat,
        updatedAt,
      );
      // Cas spécifique : conseiller recruté s'est réinscrit sur le formulaire d'inscription => compte coop + compte candidat
      const userCandidatAlreadyPresent = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          roles: { $in: ['candidat'] },
          name: conseiller.email,
        });
      if (userCandidatAlreadyPresent !== null) {
        await conseillerRecruteReinscription(app, req)(
          userCoop._id,
          conseiller._id,
          updatedAt,
        );
      }
      // Suppression compte Gandi
      if (login !== undefined) {
        await deleteMailbox(app, req)(conseiller._id, login);
      }
      // Suppression compte Mattermost
      if (conseiller.mattermost?.id !== undefined) {
        await deleteAccount(app, req)(conseiller);
      }
      const userToUpdate = {
        name: conseiller.email,
        roles: ['candidat'],
        token: uuidv4(),
        tokenCreatedAt: new Date(),
        mailSentDate: null, // pour le mécanisme de relance d'invitation candidat
        passwordCreated: false,
      };
      if (userCoop !== null && userCandidatAlreadyPresent === null) {
        // Maj name si le compte coop a été activé
        if (conseiller.email !== userCoop.name) {
          await app
            .service(service.users)
            .Model.accessibleBy(req.ability, action.update)
            .updateOne(
              { _id: userCoop._id },
              {
                $set: { ...userToUpdate },
              },
            );
        } else {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const { name: _, ...userWithoutName } = userToUpdate; // nécessaire pour ne pas avoir d'erreur de duplicate key
          await app
            .service(service.users)
            .Model.accessibleBy(req.ability, action.update)
            .updateOne(
              { _id: userCoop._id },
              {
                $set: { ...userWithoutName },
              },
            );
        }
      }
      const mailerInstance = mailer(app);
      const messageRupturePix = conseillerRupturePix(mailerInstance);
      const errorSmtpMailRupturePix = await messageRupturePix
        .send(conseiller)
        .catch((errSmtp: Error) => {
          return errSmtp;
        });
      if (errorSmtpMailRupturePix instanceof Error) {
        res.status(503).json({ message: errorSmtpMailRupturePix.message });
        return;
      }
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
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
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
