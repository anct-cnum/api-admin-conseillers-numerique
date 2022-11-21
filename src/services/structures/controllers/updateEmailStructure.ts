import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { updateEmail } from '../../../schemas/structures.schemas';
import { IStructures } from '../../../ts/interfaces/db.interfaces';

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
      const emailExists: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ name: email });
      if (emailExists !== null) {
        res.status(409).json({ message: `l'email ${email} est déjà utilisé` });
        return;
      }
      const emailExistStructure: number = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({ 'contact.email': email });
      if (emailExistStructure !== 0) {
        res.status(409).json({
          message:
            "L'adresse email que vous avez renseigné existe déjà dans une autre structure",
        });
        return;
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
