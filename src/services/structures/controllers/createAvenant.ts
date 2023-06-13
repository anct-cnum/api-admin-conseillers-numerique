import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validDemandeCoselec } from '../../../schemas/structures.schemas';
import getDetailStructureById from './getDetailStructureById';

const createAvenant =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      body: { type, nombreDePostes, motif },
      params: { id },
    } = req;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    const statut = type === 'retrait' ? 'validee' : 'en_cours';

    const createAvenantValidation = validDemandeCoselec.validate({
      type,
      nombreDePostes,
      motif,
    });

    if (createAvenantValidation.error) {
      res.status(400).json({ message: createAvenantValidation.error.message });
      return;
    }

    const demandeCoselec = {
      id: new ObjectId(),
      ...(type === 'retrait'
        ? { nombreDePostesRendus: nombreDePostes }
        : { nombreDePostesSouhaites: nombreDePostes }),
      motif,
      emetteurAvenant: { date: new Date(), email: req.user?.name },
      type,
      statut,
      banniereValidationAvenant: type === 'retrait',
    };

    try {
      const updateStructure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: new ObjectId(id) },
          { $push: { demandesCoselec: demandeCoselec } },
        );

      if (updateStructure.modifiedCount === 0) {
        res
          .status(404)
          .json({ message: "La structure n'a pas été mise à jour" });
        return;
      }

      const updateMiseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          { 'structureObj._id': new ObjectId(id) },
          { $push: { 'structureObj.demandesCoselec': demandeCoselec } },
        );

      if (updateMiseEnRelation.modifiedCount === 0) {
        await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            { _id: new ObjectId(id) },
            { $pull: { demandesCoselec: demandeCoselec } },
          );

        res.status(404).json({
          message:
            "Les mises en relation liées à la structure n'ont pas été mise à jour",
        });
        return;
      }

      const structure = await getDetailStructureById(app)(req, res);
      res.status(200).json(structure);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default createAvenant;
