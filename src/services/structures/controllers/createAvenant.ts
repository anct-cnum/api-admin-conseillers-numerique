import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationAvenant } from '../../../schemas/structures.schemas';
import getDetailStructureById from './getDetailStructureById';
import {
  PhaseConventionnement,
  StatutConventionnement,
} from '../../../ts/enum';

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

    const createAvenantValidation = validCreationAvenant.validate({
      type,
      nombreDePostes,
      motif,
    });

    if (createAvenantValidation.error) {
      res.status(400).json({ message: createAvenantValidation.error.message });
      return;
    }

    const getStructure = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne();

    if (!getStructure) {
      res.status(404).json({ message: "La structure n'existe pas" });
      return;
    }

    const phaseConventionnement =
      getStructure?.conventionnement?.statut ===
      StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
        ? PhaseConventionnement.PHASE_2
        : PhaseConventionnement.PHASE_1;

    const demandeCoselec = {
      id: new ObjectId(),
      ...(type === 'retrait'
        ? { nombreDePostesRendus: nombreDePostes }
        : { nombreDePostesSouhaites: nombreDePostes }),
      motif,
      emetteurAvenant: { date: new Date(), email: req.user?.name },
      type,
      statut: 'en_cours',
      banniereValidationAvenant: false,
      phaseConventionnement,
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

      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          { 'structure.$id': new ObjectId(id) },
          { $push: { 'structureObj.demandesCoselec': demandeCoselec } },
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

export default createAvenant;
