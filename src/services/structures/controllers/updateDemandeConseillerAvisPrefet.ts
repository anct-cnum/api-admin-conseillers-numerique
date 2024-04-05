import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { demandeConseillerAvisPrefet } from '../../../schemas/structures.schemas';

const updateDemandeConseillerAvisPrefet =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { avisPrefet, commentaire, idStructureTransfert } = req.body;
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
      avisPrefet: avisPrefet === 'favorable' ? 'POSITIF' : 'NÉGATIF',
      banniereValidationAvisPrefet: true,
      commentairePrefet: commentaire,
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
      const countStructure = await app
        .service(service.structures)
        .Model.countDocuments({
          _id: new ObjectId(idStructure),
          prefet: {
            $elemMatch: { avisPrefet: { $in: ['POSITIF', 'NÉGATIF'] } },
          },
          statut: { $in: ['CREEE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'] },
        });
      if (countStructure !== 0) {
        const structureUpdated = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            {
              _id: new ObjectId(idStructure),
              coordinateurCandidature: false,
              statut: { $in: ['CREEE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'] },
              prefet: {
                $elemMatch: { avisPrefet: { $in: ['POSITIF', 'NÉGATIF'] } },
              },
            },
            {
              $set: {
                'prefet.$': updatedPrefet,
              },
            },
          );
        if (structureUpdated.modifiedCount === 0) {
          res
            .status(404)
            .json({ message: "La structure n'a pas été mise à jour" });
          return;
        }
      } else {
        const structureUpdated = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            {
              _id: new ObjectId(idStructure),
              coordinateurCandidature: false,
              statut: { $in: ['CREEE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'] },
            },
            {
              $push: {
                prefet: updatedPrefet,
              },
            },
          );
        if (structureUpdated.modifiedCount === 0) {
          res
            .status(404)
            .json({ message: "La structure n'a pas été mise à jour" });
          return;
        }
      }
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

export default updateDemandeConseillerAvisPrefet;
