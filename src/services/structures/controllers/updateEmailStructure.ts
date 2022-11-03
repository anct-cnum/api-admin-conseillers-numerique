import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { updateEmail } from '../../../schemas/structures.schemas';

const { Pool } = require('pg');

const updateEmailStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const idUser = req.user?._id;
    const pool = new Pool();

    const { email } = req.body;
    const emailValidation = updateEmail.validate(email);

    if (emailValidation.error) {
      res.statusMessage = emailValidation.error.message;
      res.status(400).end();
      return;
    }
    try {
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idStructure) });
      if (!structure) {
        res.statusMessage = "La strutucture n'existe pas";
        res.status(404).end();
        return;
      }
      const emailExists = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ name: email });
      if (emailExists !== null) {
        res.statusMessage = `l'email ${email} est déjà utilisé`;
        res.status(409).end();
        return;
      }
      const emailExistStructure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({ 'contact.email': email });
      if (emailExistStructure !== 0) {
        res.statusMessage =
          "L'adresse email que vous avez renseigné existe déjà dans une autre structure";
        res.status(409).end();
        return;
      }
      await pool.query(
        `
      UPDATE djapp_hostorganization
      SET contact_email = $2
      WHERE id = $1`,
        [idStructure, email],
      );
      await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
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
        );
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
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          { 'structure.$id': new ObjectId(idStructure) },
          { $set: { 'structureObj.contact.email': email } },
        );
      res.send({ emailUpdated: true });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default updateEmailStructure;
