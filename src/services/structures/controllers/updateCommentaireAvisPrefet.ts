import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { commentaireConseillerAvisPrefet } from '../../../schemas/structures.schemas';

const updateCommentaireAvisPrefet =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { commentaire } = req.body;
    const avisPrefetValidation = commentaireConseillerAvisPrefet.validate({
      commentaire,
    });

    if (avisPrefetValidation.error) {
      res.status(400).json({ message: avisPrefetValidation.error.message });
      return;
    }

    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structurePrefet = await app
        .service(service.structures)
        .Model.aggregate([
          { $match: { _id: new ObjectId(idStructure) } },
          {
            $addFields: {
              lastPrefet: { $arrayElemAt: ['$prefet', -1] },
            },
          },
          {
            $project: {
              _id: 0,
              lastPrefet: '$lastPrefet',
            },
          },
        ]);

      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idStructure),
            prefet: {
              $in: [structurePrefet[0].lastPrefet],
            },
          },
          {
            $set: {
              'prefet.$.commentairePrefet': commentaire,
            },
          },
          {
            returnOriginal: false,
            includeResultMetadata: true,
          },
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
      res.status(200).json({ prefet: structure.value.prefet.pop() });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateCommentaireAvisPrefet;
