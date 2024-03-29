import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { demandeConseillerAvisPrefet } from '../../../schemas/structures.schemas';

const updateAvenantAvisPrefetPosteSupplementaire =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { avisPrefet, commentaire, idDemandeCoselec, idStructureTransfert } =
      req.body;

    if (idStructureTransfert && !ObjectId.isValid(idStructureTransfert)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    const avisPrefetValidation = demandeConseillerAvisPrefet.validate({
      avisPrefet,
      commentaire,
    });

    if (avisPrefetValidation.error) {
      res.status(400).json({ message: avisPrefetValidation.error.message });
      return;
    }
    const updatedPrefet = {
      avis: avisPrefet === 'favorable' ? 'POSITIF' : 'NÉGATIF',
      commentaire,
      insertedAt: new Date(),
      ...(idStructureTransfert && {
        idStructureTransfert,
      }),
    };
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
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
              'demandesCoselec.$.prefet': updatedPrefet,
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

export default updateAvenantAvisPrefetPosteSupplementaire;
