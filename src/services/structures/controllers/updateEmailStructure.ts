import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { DBRef, ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { updateEmail } from '../../../schemas/structures.schemas';
import { IStructures, IUser } from '../../../ts/interfaces/db.interfaces';
import { envoiEmailInvit } from '../../../utils/email';
import mailer from '../../../mailer';

const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const updateEmailStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const idUser = req.user?._id;
    const pool = new Pool();

    const { email } = req.body;
    const emailValidation = updateEmail.validate(email);

    if (emailValidation.error) {
      res.status(400).json({ message: emailValidation.error.message });
      return;
    }
    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idStructure) });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }

      // Pas d'access control pour vérifier dans les autres structures
      const emailExistStructure: number = await app
        .service(service.structures)
        .Model.countDocuments({ 'contact.email': email });
      if (emailExistStructure !== 0) {
        res.status(409).json({
          message:
            "L'adresse email que vous avez renseigné existe déjà dans une autre structure",
        });
        return;
      }

      let impactUser = true;
      // Pas d'access control pour vérifier dans tous les users
      const emailExists: IUser = await app
        .service(service.users)
        .Model.findOne({ name: email });
      if (
        emailExists !== null &&
        emailExists?.entity?.oid?.toString() !== idStructure
      ) {
        res.status(409).json({ message: `l'email ${email} est déjà utilisé` });
        return;
      }

      if (
        emailExists !== null &&
        emailExists?.entity?.oid?.toString() === idStructure
      ) {
        impactUser = false;
      }

      await pool.query(
        `
      UPDATE djapp_hostorganization
      SET contact_email = $2
      WHERE id = $1`,
        [structure.idPG, email],
      );
      const structureUpdated: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: new ObjectId(idStructure) },
          {
            $set: { 'contact.email': email },
            $push: {
              historique: {
                data: {
                  ancienEmail: structure?.contact?.email,
                  nouveauEmail: email,
                },
                changement: 'email',
                date: new Date(),
                idAdmin: idUser,
              },
            },
          },
          { returnOriginal: false },
        );

      if (
        structureUpdated.contact?.inactivite === true &&
        structureUpdated.statut === 'VALIDATION_COSELEC'
      ) {
        let errorSmtpMail: Error | null = null;
        await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate(
            { _id: new ObjectId(idStructure) },
            {
              $set: {
                userCreated: true,
              },
              $unset: {
                'contact.inactivite': '',
                userCreationError: '',
              },
            },
          );

        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany(
            { 'structure.$id': new ObjectId(idStructure) },
            {
              $set: {
                'structureObj.userCreated': true,
                'structureObj.contact.email': email,
              },
              $unset: {
                'structureObj.contact.inactivite': '',
                'structureObj.userCreationError': '',
              },
            },
          );

        if (impactUser === true) {
          const connect = app.get('mongodb');
          const database = connect.substr(connect.lastIndexOf('/') + 1);

          const canCreate = req.ability.can(action.create, ressource.users);
          if (!canCreate) {
            res.status(403).json({
              message: `Accès refusé, vous n'êtes pas autorisé à créer un nouvel utilisateur`,
            });
            return;
          }
          const user: IUser = await app.service(service.users).create({
            name: email,
            roles: ['structure'],
            entity: new DBRef(
              'structures',
              new ObjectId(idStructure),
              database,
            ),
            password: uuidv4(),
            token: uuidv4(),
            tokenCreatedAt: new Date(),
            passwordCreated: false,
            migrationDashboard: true,
            mailSentDate: null,
            resend: false,
          });

          errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
          if (errorSmtpMail instanceof Error) {
            res.status(503).json({
              message:
                "Une erreur est survenue lors de l'envoi du mail d'invitation",
            });
            return;
          }
        }
      } else {
        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany(
            { 'structure.$id': new ObjectId(idStructure) },
            { $set: { 'structureObj.contact.email': email } },
          );

        if (impactUser === true) {
          await app
            .service(service.users)
            .Model.accessibleBy(req.ability, action.update)
            .updateOne(
              {
                name: structure.contact.email,
                'entity.$id': new ObjectId(idStructure),
                roles: { $in: ['structure'] },
              },
              { $set: { name: email } },
            );
        }
      }
      res.send({ emailUpdated: structureUpdated.contact.email });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateEmailStructure;
