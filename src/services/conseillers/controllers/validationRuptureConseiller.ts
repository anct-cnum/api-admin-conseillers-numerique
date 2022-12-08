import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import axios from 'axios';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  IConseillers,
  IMisesEnRelation,
  IUser,
} from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import emails from '../../../emails/emails';
import mailer from '../../../mailer';

const { Pool } = require('pg');

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

const loginAPI = async ({ mattermost }) => {
  const resultLogin = await axios({
    method: 'post',
    url: `${mattermost.endPoint}/api/v4/users/login`,
    headers: {
      'Content-Type': 'application/json',
    },
    data: { login_id: mattermost.login, password: mattermost.password },
  });

  return resultLogin.request.res.headers.token;
};

const deleteAccount = (app, req) => async (conseiller) => {
  const mattermost = app.get('mattermost');
  try {
    const token = await loginAPI({ mattermost });

    // Query parameter permanent pour la suppression définitive (il faut que le paramètre ServiceSettings.EnableAPIUserDeletion soit configuré à true)
    await axios({
      method: 'delete',
      url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}?permanent=true`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    await app
      .service(service.conseillers)
      .Model.accessibleBy(req.ability, action.update)
      .updateOne(
        { _id: conseiller._id },
        {
          $set: { 'mattermost.errorDeleteAccount': false },
        },
      );
  } catch (error) {
    await app
      .service(service.conseillers)
      .Model.accessibleBy(req.ability, action.update)
      .updateOne(
        { _id: conseiller._id },
        {
          $set: { 'mattermost.errorDeleteAccount': true },
        },
      );
    throw new Error(error);
  }
};

const deleteMailbox = (app, req) => async (conseillerId, login) => {
  const gandi = app.get('gandi');
  try {
    // Récuperation de l'id mailbox associé au login pour 'delete'
    const mailbox = await axios({
      method: 'get',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}?login=${login}`,
      headers: {
        Authorization: `Apikey ${gandi.token}`,
      },
    });

    // Si trouvé : suppression de la boite mail
    if (mailbox?.data.length === 1) {
      await axios({
        method: 'delete',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${mailbox.data[0].id}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Apikey ${gandi.token}`,
        },
      });
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: conseillerId },
          {
            $set: { 'emailCN.deleteMailboxCNError': false },
          },
        );
    }
  } catch (error) {
    await app
      .service(service.conseillers)
      .Model.accessibleBy(req.ability, action.update)
      .updateOne(
        { _id: conseillerId },
        {
          $set: { 'emailCN.deleteMailboxCNError': true },
        },
      );
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
        dateRupture: miseEnRelation.dateRupture,
        motifRupture: miseEnRelation.motifRupture,
      };
      await app.service(service.conseillersRuptures).create(objAnonyme);

      const conseillerUpdate = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: conseiller._id },
          {
            $set: {
              disponible: true,
              statut: 'RUPTURE',
            },
            $push: {
              ruptures: {
                structureId: conseiller.structureId,
                dateRupture: miseEnRelation.dateRupture,
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
              dossierIncompletRupture: '',
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
            statut: 'RECRUTE',
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
            ],
          },
          {
            $pull: {
              conseillers: conseiller._id,
              conseillersItinerants: conseiller._id,
            },
          },
        );

      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            'conseiller.$id': conseiller._id,
            'structure.$id': conseiller.structureId,
            statut: { $in: ['finalisee', 'nouvelle_rupture'] },
          },
          {
            $set: {
              statut: 'finalisee_rupture',
              dateRupture: dateFinDeContrat,
              conseillerObj: conseillerUpdate,
            },
          },
        );
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
      const miseEnRelation: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          'conseiller.$id': conseiller._id,
          'structure.$id': conseiller.structureId,
          statut: { $in: ['finalisee', 'nouvelle_rupture'] },
        });
      if (!miseEnRelation) {
        res.status(404).json({
          message: `Aucune mise en relation finalisée entre la structure id ${conseiller.structureId} et le conseiller id ${conseiller._id}`,
        });
        return;
      }
      const users: IUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          roles: { $in: ['conseiller'] },
          'entity.$id': conseiller._id,
        });
      if (!users) {
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
          message: `Accès refusé, vous n'êtes pas autorisé à validé la rupture d'un conseiller`,
        });
        return;
      }
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
          users._id,
          conseiller._id,
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
      const mailerInstance = mailer(app);
      const messageRupturePix = emails(
        app,
        mailerInstance,
        req,
      ).getEmailMessageByTemplateName('conseillerRupturePix');
      const errorSmtpMailRupturePix = await messageRupturePix
        .send(conseiller)
        .catch((errSmtp: Error) => {
          return errSmtp;
        });
      if (errorSmtpMailRupturePix instanceof Error) {
        res.status(503).json({ message: errorSmtpMailRupturePix.message });
        return;
      }
      const messageRuptureStructure = emails(
        app,
        mailerInstance,
        req,
      ).getEmailMessageByTemplateName('conseillerRuptureStructure');
      const errorSmtpMailRuptureStructure = await messageRuptureStructure
        .send(miseEnRelation)
        .catch((errSmtp: Error) => {
          return errSmtp;
        });
      if (errorSmtpMailRuptureStructure instanceof Error) {
        res
          .status(503)
          .json({ message: errorSmtpMailRuptureStructure.message });
        return;
      }
      res.send({ deleteSuccess: true });
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
