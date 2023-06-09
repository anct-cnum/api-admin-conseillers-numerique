import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validDemandeCoselec } from '../../../schemas/structures.schemas';
import getDetailStructureById from './getDetailStructureById';

const demandeCoselec =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      body: { type, nombreDePostes, motif, autreMotif },
      params: { id },
    } = req;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    const statut = type === 'retrait' ? 'validee' : 'initiee';

    const demandeCoselecValidation = validDemandeCoselec.validate({
      type,
      nombreDePostes,
      motif,
      autreMotif,
    });

    if (demandeCoselecValidation.error) {
      res.status(400).json({ message: demandeCoselecValidation.error.message });
      return;
    }

    const objectDemandeCoselec = {
      id: new ObjectId(),
      nombreDePostesSouhaites: nombreDePostes,
      motif: motif || autreMotif,
      emetteurAvenant: { date: new Date(), email: req.user?.name },
      type,
      statut,
      banniereValidationAvenant: type === 'retrait',
    };

    try {
      await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: id },
          { $push: { demandesCoselec: objectDemandeCoselec } },
        );

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

export default demandeCoselec;
