import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import emails from '../../../emails/emails';
import mailer from '../../../mailer';

const { Pool } = require('pg');
const aws = require('aws-sdk');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const verificationCandidaturesRecrutee =
  (app: Application, req: IRequest) =>
  async (tableauCandidat, id: ObjectId): Promise<void | Error> => {
    try {
      const error = await Promise.all(
        tableauCandidat.map(async (profil) => {
          const misesEnRelations = await app
            .service(service.misesEnRelation)
            .Model.accessibleBy(req.ability, action.read)
            .find({
              'conseiller.$id': profil._id,
              statut: { $in: ['finalisee', 'recrutee', 'nouvelle_rupture'] },
            });
          if (misesEnRelations.length !== 0) {
            const misesEnRelationsFinalisees = await app
              .service(service.misesEnRelation)
              .Model.accessibleBy(req.ability, action.read)
              .findOne({
                'conseiller.$id': profil._id,
                statut: { $in: ['finalisee', 'recrutee', 'nouvelle_rupture'] },
              });
            const statut =
              misesEnRelationsFinalisees.statut === 'finalisee' ||
              misesEnRelationsFinalisees.statut === 'nouvelle_rupture'
                ? 'recrutée'
                : 'validée';
            const structure = await app
              .service(service.structures)
              .Model.accessibleBy(req.ability, action.read)
              .findOne({ _id: misesEnRelationsFinalisees.structure.oid });
            const idConvertString = JSON.stringify(profil._id);
            const messageDoublon =
              idConvertString === `"${id}"`
                ? `est ${statut} par`
                : `a un doublon qui est ${statut}`;
            const messageSiret = structure?.siret ?? `non renseigné`;
            throw new Error(
              `Le conseiller ${messageDoublon} par la structure ${structure.nom}, SIRET: ${messageSiret}`,
            );
          }
          // Vérification compte coop inexistant
          const usersCount = await app
            .service(service.users)
            .Model.accessibleBy(req.ability, action.read)
            .countDocuments({
              'entity.$id': profil._id,
              roles: { $eq: ['conseiller'] },
            });

          if (usersCount >= 1) {
            const idConvertString = JSON.stringify(profil._id);
            const messageDoublonCoop =
              idConvertString === `"${id}"` ? `` : `a un doublon qui`;
            throw new Error(
              `Le conseiller ${messageDoublonCoop} a un compte COOP d'activé`,
            );
          }
        }),
      ).catch((err) => {
        return err;
      });
      return error;
    } catch (error) {
      throw new Error(error);
    }
  };

const archiverLaSuppression = (app) => async (tableauCandidat, user, motif) => {
  try {
    await Promise.all(
      tableauCandidat.map(async (profil) => {
        try {
          // eslint-disable-next-line no-unused-vars
          const {
            email,
            telephone,
            nom,
            prenom,
            emailPro,
            telephonePro,
            ...conseiller
          } = profil;
          const objAnonyme = {
            deletedAt: new Date(),
            motif,
            conseiller,
            role: 'admin',
            userId: user._id,
          };
          await app.service(service.conseillersSupprimes).create(objAnonyme);
        } catch (error) {
          throw new Error(error);
        }
      }),
    );
  } catch (error) {
    throw new Error(error);
  }
};

const suppressionTotalCandidat =
  (app, req, pool) => async (tableauCandidat) => {
    try {
      await Promise.all(
        tableauCandidat.map(async (profil) => {
          try {
            await pool.query(
              `
          DELETE FROM djapp_matching WHERE coach_id = $1`,
              [profil.idPG],
            );
            await pool.query(
              `
          DELETE FROM djapp_coach WHERE id = $1`,
              [profil.idPG],
            );
          } catch (error) {
            throw new Error(error);
          }
          try {
            await app
              .service(service.misesEnRelation)
              .Model.accessibleBy(req.ability, action.delete)
              .deleteMany({ 'conseiller.$id': profil._id });
            await app
              .service(service.users)
              .Model.accessibleBy(req.ability, action.delete)
              .deleteOne({ 'entity.$id': profil._id });
            await app
              .service(service.conseillers)
              .Model.accessibleBy(req.ability, action.delete)
              .deleteOne({ _id: profil._id });
          } catch (error) {
            throw new Error(error);
          }
        }),
      );
    } catch (error) {
      throw new Error(error);
    }
  };

const suppressionCv = async (cv, app) => {
  try {
    const awsConfig = app.get('aws');
    aws.config.update({
      accessKeyId: awsConfig.access_key_id,
      secretAccessKey: awsConfig.secret_access_key,
    });
    const ep = new aws.Endpoint(awsConfig.endpoint);
    const s3 = new aws.S3({ endpoint: ep });

    const paramsDelete = { Bucket: awsConfig.cv_bucket, Key: cv?.file };
    await s3.deleteObject(paramsDelete).promise();
  } catch (error) {
    throw new Error(error);
  }
};

const deleteMailSib = (app) => async (emailPerso) => {
  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = app.get('sib_api_key');
    const apiInstance = new SibApiV3Sdk.ContactsApi();
    await apiInstance.deleteContact(emailPerso);
  } catch (error) {
    throw new Error(error);
  }
};

const deleteCandidatById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    const { motif } = req.query;
    const pool = new Pool();
    try {
      const conseiller: IConseillers = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idConseiller) });
      if (!conseiller) {
        res.status(404).json({ message: "Le candidat n'existe pas" });
        return;
      }
      const { nom, prenom, email, cv } = conseiller;
      const instructionSuppression =
        motif === 'doublon'
          ? { _id: new ObjectId(idConseiller), email }
          : { email };

      const tableauCandidat = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .find(instructionSuppression);
      const errorVerificationCandidaturesRecrutee =
        await verificationCandidaturesRecrutee(app, req)(
          tableauCandidat,
          new ObjectId(idConseiller),
        );
      if (errorVerificationCandidaturesRecrutee instanceof Error) {
        res
          .status(409)
          .json({ message: errorVerificationCandidaturesRecrutee.message });
        return;
      }
      const canCreate = req.ability.can(
        action.create,
        ressource.conseillersSupprimes,
      );
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à supprimer un candidat`,
        });
        return;
      }
      await archiverLaSuppression(app)(tableauCandidat, req.user, motif);
      await suppressionTotalCandidat(app, req, pool)(tableauCandidat);
      if (cv?.file && motif !== 'doublon') {
        await suppressionCv(cv, app);
      }
      if (motif !== 'doublon') {
        const mailerInstance = mailer(app);
        const message = emails(
          app,
          mailerInstance,
          req,
        ).getEmailMessageByTemplateName('candidatSupprimePix');
        const errorSmtpMail = await message
          .send({ nom, prenom, email })
          .catch((errSmtp: Error) => {
            return errSmtp;
          });
        if (errorSmtpMail instanceof Error) {
          res.status(503).json({
            message: errorSmtpMail.message,
          });
          return;
        }
        await deleteMailSib(app)(email);
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

export default deleteCandidatById;
