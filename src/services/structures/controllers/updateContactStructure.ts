import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { updateContact } from '../../../schemas/structures.schemas';
import getDetailStructureById from './getDetailStructureById';

const { Pool } = require('pg');

const updateContactStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    delete req.body.contact.email; // gérer dans updateEmailStructure
    const update = { contact: req.body.contact };
    const pool = new Pool();

    const contactValidation = updateContact.validate(update.contact);

    if (contactValidation.error) {
      res.status(400).json({ message: contactValidation.error.message });
      return;
    }

    try {
      let structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idStructure) });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      await pool.query(
        `UPDATE djapp_hostorganization
          SET (
                contact_first_name,
                contact_last_name,
                contact_job,
                contact_phone)
                =
                ($2,$3,$4,$5)
              WHERE id = $1`,
        [
          structure.idPG,
          update.contact.prenom,
          update.contact.nom,
          update.contact.fonction,
          update.contact.telephone,
        ],
      );
      await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: new ObjectId(idStructure) },
          {
            $set: {
              'contact.prenom': update.contact.prenom,
              'contact.nom': update.contact.nom,
              'contact.fonction': update.contact.fonction,
              'contact.telephone': update.contact.telephone,
            },
          },
          { returnOriginal: false },
        );
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          { 'structure.$id': new ObjectId(idStructure) },
          {
            $set: {
              'structureObj.contact.prenom': update.contact.prenom,
              'structureObj.contact.nom': update.contact.nom,
              'structureObj.contact.fonction': update.contact.fonction,
              'structureObj.contact.telephone': update.contact.telephone,
            },
          },
        );
      await getDetailStructureById(app)(req, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateContactStructure;
