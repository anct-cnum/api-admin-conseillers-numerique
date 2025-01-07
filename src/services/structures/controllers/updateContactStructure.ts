import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { updateContact } from '../../../schemas/structures.schemas';
import getDetailStructureById from './getDetailStructureById';

const updateContactStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    delete req.body.contact.email; // gérer dans updateEmailStructure
    const update = { contact: req.body.contact };

    if (!ObjectId.isValid(idStructure)) {
      res.status(400).json({
        message:
          'Une erreur est survenue, veuillez recharger la page puis réessayez',
      });
      return;
    }
    const contactValidation = updateContact.validate(update.contact);

    if (contactValidation.error) {
      res.status(400).json({ message: contactValidation.error.message });
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
