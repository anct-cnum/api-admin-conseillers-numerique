import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const closeBanner =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { type } = req.query;
    const filter = { _id: req.params.id };

    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    try {
      const query = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .getQuery();

      if (type === 'renouvellement') {
        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate(filter, {
            $set: { banniereValidationRenouvellement: false },
          });
      } else {
        const getStructure = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .findById(req.params.id);

        if (!getStructure) {
          res.status(404).json({ message: "La structure n'existe pas" });
          return;
        }

        const latestIndex = getStructure?.demandesCoselec.length
          ? getStructure.demandesCoselec.length - 1
          : 0;

        await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .findByIdAndUpdate(req.params.id, {
            $set: {
              [`demandesCoselec.${latestIndex}.banniereValidationAvenant`]:
                false,
            },
          });

        const structure = await app
          .service(service.structures)
          .Model.aggregate([
            { $match: { $and: [query], _id: new ObjectId(req.params.id) } },
            {
              $addFields: {
                lastDemandeCoselec: { $arrayElemAt: ['$demandesCoselec', -1] },
              },
            },
          ]);

        res.status(200).json(structure[0]);
      }
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default closeBanner;
