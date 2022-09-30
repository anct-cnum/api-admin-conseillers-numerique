import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  IStructures,
  IMisesEnRelation,
} from '../../../ts/interfaces/db.interfaces';
import { BadRequest, NotFound, Forbidden } from '@feathersjs/errors';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const getStructuresMisesEnRelations =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      let structureId = null;
      try {
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
      } catch (e) {
        res.status(404).json(
          new NotFound('Structure not found', {
            id: req.params.id,
          }),
        );
        return;
      }
      let queryFilter = {};
      const { filter } = req.query;
      const search = req.query['$search'];
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
        queryFilter['$text'] = { $search: '"' + search + '"' };
      }

      //User Filters
      const { pix, diplome, cv } = req.query;
      if (pix !== undefined) {
        const pixInt = pix.split(',').map((k: string) => parseInt(k));
        queryFilter['conseillerObj.pix.palier'] = { $in: pixInt };
      }
      if (diplome !== undefined) {
        queryFilter['conseillerObj.estDiplomeMedNum'] = diplome === 'true';
      }
      if (cv !== undefined) {
        queryFilter['conseillerObj.cv'] =
          cv === 'true' ? { $ne: null } : { $in: [null] };
      }

      const skip = req.query['$skip'];
      if (skip) {
        queryFilter['$skip'] = skip;
      }
      const sort = req.query['$sort'];
      if (sort) {
        queryFilter['$sort'] = sort;
      }

      const misesEnRelation = await app
        .service(service.misesEnRelation)
        .find({
          query: Object.assign(
            { 'structure.$id': new ObjectId(structureId) },
            queryFilter,
          ),
        });

      if (misesEnRelation.total === 0) {
        res.send(misesEnRelation);
        return;
      }
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
