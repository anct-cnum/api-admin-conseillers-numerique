import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { BadRequest, NotFound } from '@feathersjs/errors';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const getStructuresMisesEnRelations =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      let structureId = null;
      structureId = req.params.id;
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: structureId });
      if (structure === null) {
        res.status(404).json(
          new NotFound('Structure not found', {
            id: req.params.id,
          }),
        );
        return;
      }
      let queryFilter = {};
      const { filter } = req.query;
      const search = req.query.$search;
      if (filter) {
        const allowedFilters = [
          'nouvelle',
          'interessee',
          'nonInteressee',
          'recrutee',
          'finalisee',
          'nouvelle_rupture',
          'toutes',
        ];
        if (allowedFilters.includes(filter)) {
          if (filter !== 'toutes') {
            queryFilter = { statut: filter };
          } else {
            queryFilter = { statut: { $ne: 'non_disponible' } };
          }
        } else {
          res.status(400).send(
            new BadRequest('Invalid filter', {
              filter,
            }).toJSON(),
          );
          return;
        }
      }

      if (search) {
        queryFilter['$text'] = { $search: `"${search}"` }; // eslint-disable-line @typescript-eslint/dot-notation
      }

      // User Filters
      const { pix, diplome, cv } = req.query;
      if (pix !== undefined) {
        const pixInt = pix.split(',').map((k: string) => parseInt(k, 10));
        queryFilter['conseillerObj.pix.palier'] = { $in: pixInt };
      }
      if (diplome !== undefined) {
        queryFilter['conseillerObj.estDiplomeMedNum'] = diplome === 'true';
      }
      if (cv !== undefined) {
        queryFilter['conseillerObj.cv'] =
          cv === 'true' ? { $ne: null } : { $in: [null] };
      }

      const skip = req.query.$skip;
      if (skip) {
        queryFilter['$skip'] = skip; // eslint-disable-line @typescript-eslint/dot-notation
      }
      const sort = req.query.$sort;
      if (sort) {
        queryFilter['$sort'] = sort; // eslint-disable-line @typescript-eslint/dot-notation
      }

      const misesEnRelation = await app.service(service.misesEnRelation).find({
        query: {
          'structure.$id': new ObjectId(structureId),
          ...queryFilter,
        },
      });

      res.send(misesEnRelation);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
    }
  };

export default getStructuresMisesEnRelations;
