import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import {
  filterCv,
  filterDiplome,
  filterPix,
  checkAccessReadRequestMisesEnRelation,
  filterNomConseiller,
  filterStatut,
} from '../misesEnRelation.repository';
import validMiseEnRelation from '../../../schemas/miseEnRelation.schemas';

const countMisesEnRelation =
  (app: Application, checkAccess) =>
  async (
    structureId: ObjectId,
    cv: string,
    pix: string,
    diplome: string,
    filter: string,
    searchByNom: string,
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          'structure.$id': structureId,
          ...filterPix(pix),
          ...filterCv(cv),
          ...filterDiplome(diplome),
          ...filterNomConseiller(searchByNom),
          ...filterStatut(filter),
          $and: [checkAccess],
        },
      },
      {
        $project: {
          _id: 1,
          statut: 1,
          'conseillerObj.cv': 1,
          'conseillerObj.prenom': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.email': 1,
          'conseillerObj.createdAt': 1,
          'conseillerObj.codePostal': 1,
          'conseillerObj.pix': 1,
          'conseillerObj._id': 1,
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, countMiseEnRelation: '$count' } },
    ]);

const getMisesEnRelation =
  (app: Application, checkAccess) =>
  async (
    structureId: ObjectId,
    cv: string,
    pix: string,
    diplome: string,
    filter: string,
    searchByNom: string,
    sortColonne: object,
    skip: string,
    limit: number,
  ) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          'structure.$id': structureId,
          ...filterPix(pix),
          ...filterCv(cv),
          ...filterDiplome(diplome),
          ...filterNomConseiller(searchByNom),
          ...filterStatut(filter),
          $and: [checkAccess],
        },
      },
      {
        $project: {
          _id: 1,
          statut: 1,
          'conseillerObj.cv': 1,
          'conseillerObj.prenom': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.email': 1,
          'conseillerObj.createdAt': 1,
          'conseillerObj.codePostal': 1,
          'conseillerObj.pix': 1,
          'conseillerObj._id': 1,
        },
      },
      { $sort: sortColonne },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getStructuresMisesEnRelations =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    try {
      const structureId = req.params.id;
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(structureId) });
      if (structure === null) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }

      // User Filters
      const { pix, diplome, cv, skip, search, filter, nomOrdre } = req.query;
      const emailValidation = validMiseEnRelation.validate({
        skip,
        diplome,
        cv,
        pix,
        search,
        filter,
        nomOrdre,
      });

      if (emailValidation.error) {
        res.statusMessage = emailValidation.error.message;
        res.status(400).end();
        return;
      }
      const items: {
        total: number;
        data: object;
        limit: number;
        skip: number;
      } = {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
      const sortColonne = JSON.parse(`{"conseillerObj.${nomOrdre}":1}`);
      const checkAccess = await checkAccessReadRequestMisesEnRelation(app, req);
      const misesEnRelation = await getMisesEnRelation(app, checkAccess)(
        structure._id,
        cv as string,
        pix,
        diplome as string,
        filter,
        search,
        sortColonne,
        skip as string,
        options.paginate.default,
      );
      if (misesEnRelation.length > 0) {
        const totalMiseEnRelation = await countMisesEnRelation(
          app,
          checkAccess,
        )(structure._id, cv as string, pix, diplome as string, filter, search);
        items.data = misesEnRelation;
        items.total = totalMiseEnRelation[0]?.countMiseEnRelation;
        items.limit = options.paginate.default;
        items.skip = Number(skip);
      }

      res.send(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStructuresMisesEnRelations;
