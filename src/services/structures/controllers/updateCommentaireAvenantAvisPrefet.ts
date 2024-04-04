import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { commentaireConseillerAvisPrefet } from '../../../schemas/structures.schemas';

const updateCommentaireAvenantAvisPrefet =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { commentaire, idDemandeCoselec } = req.body;
    const avisPrefetValidation = commentaireConseillerAvisPrefet.validate({
      commentaire,
    });
    if (avisPrefetValidation.error) {
      res.status(400).json({ message: avisPrefetValidation.error.message });
      return;
    }
    const checkIdDemandeCoselec = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.update)
      .countDocuments({
        demandesCoselec: {
          $elemMatch: {
            id: idDemandeCoselec,
          },
        },
      });
    if (checkIdDemandeCoselec === 0) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    if (!ObjectId.isValid(idStructure)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    try {
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idStructure),
            demandesCoselec: {
              $elemMatch: { id: idDemandeCoselec },
            },
          },
          {
            $set: {
              'demandesCoselec.$.prefet.commentaire': commentaire,
              'demandesCoselec.$.banniereValidationAvisPrefet': true,
            },
          },
          { returnOriginal: false, includeResultMetadata: true },
        );
      if (structure.lastErrorObject.n === 0) {
        res
          .status(404)
          .json({ message: "La structure n'a pas été mise à jour" });
        return;
      }
      const objectStructureUpdated = {
        $set: {
          structureObj: structure.value,
        },
      };
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'structure.$id': new ObjectId(idStructure),
          },
          objectStructureUpdated,
        );
      res.status(200).json({ success: true });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateCommentaireAvenantAvisPrefet;
