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
import { action, ressource } from '../../../helpers/accessControl/accessList';
import mailer from '../../../mailer';
import deleteMailbox from '../../../utils/gandi';
import deleteAccount from '../../../utils/mattermost';
import {
  conseillerRupturePix,
  conseillerRuptureStructure,
} from '../../../emails';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const updateConseillersPG = (pool) => async (email, disponible) => {
  try {
    await pool.query(
      `
      UPDATE djapp_coach
      SET disponible = $2
      WHERE LOWER(email) = LOWER($1)`,
      [email, disponible],
    );
  } catch (error) {
    throw new Error(error);
  }
};

const conseillerRecruteReinscription =
  (app, req) => async (idUser: ObjectId, idConseiller: ObjectId) => {
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
            },
            $push: {
              ruptures: {
                structureId: conseiller.structureId,
                dateRupture: dateFinDeContrat,
                motifRupture: miseEnRelation.motifRupture,
              },
            },
            $unset: {
              estRecrute: '',
              datePrisePoste: '',
              dateFinFormation: '',
              structureId: '',
              emailCNError: '',
              emailCN: '',
              mattermost: '',
              resetPasswordCNError: '',
              codeRegionStructure: '',
              codeDepartementStructure: '',
              hasPermanence: '',
            },
          },
          { returnOriginal: false },
        );

      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
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
      return { miseEnRelationUpdated, conseillerUpdated };
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
        });
      if (!miseEnRelation) {
        res.status(404).json({
          message: `Aucune mise en relation finalisée entre la structure id ${structure.idPG} et le conseiller id ${conseiller.idPG}`,
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
      await updateConseillersPG(pool)(conseiller.email, true);
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
      const { miseEnRelationUpdated, conseillerUpdated } =
        await updateConseillerRupture(app, req)(
          conseiller,
          miseEnRelation,
          dateFinDeContrat,
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
        );
        conseillerUpdated.userCreated = false;
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
      res.send({ miseEnRelationUpdated, conseillerUpdated });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default validationRuptureConseiller;
