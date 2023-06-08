import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validDemandeCoselec } from '../../../schemas/structures.schemas';

const demandeCoselec =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      body: { type, nombreDePostes, motif, autreMotif },
      query: { structureId },
    } = req;

    if (!ObjectId.isValid(structureId)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    const query = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.update)
      .getQuery();

    const statut = type === 'retrait' ? 'validée' : 'initiée';

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
      date: new Date(),
      nombreDePostesSouhaites: nombreDePostes,
      motif,
      autreMotif,
      emetteur: req.user?.name,
      type,
      statut,
      banniereValidationAvenant: type === 'retrait',
    };

    try {
      await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: structureId },
          { $push: { demandesCoselec: objectDemandeCoselec } },
          { new: true },
        );

      const structure = await app.service(service.structures).Model.aggregate([
        { $match: { $and: [query], _id: new ObjectId(structureId) } },
        {
          $addFields: {
            lastDemandeCoselec: { $arrayElemAt: ['$demandesCoselec', -1] },
          },
        },
      ]);

      res.status(200).json(structure[0]);
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
