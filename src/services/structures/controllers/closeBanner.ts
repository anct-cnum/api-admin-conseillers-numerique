import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import getDetailStructureById from './getDetailStructureById';

const closeBanner =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { type } = req.query;
    const filter = { _id: req.params.id };

    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    try {
      if (type === 'renouvellement') {
        const miseEnRelation = await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            {
              ...filter,
              $or: [{ statut: 'finalisee' }, { statut: 'terminee' }],
            },
            {
              $set: { banniereValidationRenouvellement: false },
            },
          );
        if (miseEnRelation.modifiedCount === 0) {
          res.status(404).json({
            message: "La mise en relation n'a pas été mise à jour",
          });
          return;
        }

        req.params.id = req?.user?.entity?.oid;
        const structure = await getDetailStructureById(app)(req, res);
        res.status(200).json(structure);
      }
      // s'il s'agit d'un avenant de contrat
      else {
        const getStructure = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .findOne();

        if (getStructure === null) {
          res.status(404).json({ message: "La structure n'existe pas" });
          return;
        }

        const updateStructure = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            {
              _id: req.params.id,
            },
            {
              $set: {
                [`demandesCoselec.$[elem].banniereValidationAvenant`]: false,
              },
            },
            {
              arrayFilters: [{ 'elem.banniereValidationAvenant': true }],
            },
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
            { 'structureObj._id': new ObjectId(req.params.id) },
            {
              $set: {
                'structureObj.demandesCoselec.$[elem].banniereValidationAvenant':
                  false,
              },
            },
            {
              arrayFilters: [{ 'elem.statut': 'validee' }],
            },
          );

        const structure = await getDetailStructureById(app)(req, res);
        res.status(200).json(structure);
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
