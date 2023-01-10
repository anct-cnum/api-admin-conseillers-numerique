import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  IConseillers,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { validCandidatsStructure } from '../../../schemas/conseillers.schemas';
import {
  filterNomConseiller,
  filterPix,
  filterCv,
  filterDiplome,
} from '../conseillers.repository';
import { action } from '../../../helpers/accessControl/accessList';

const getTotalCandidatsStructure =
  (app: Application) =>
  async (
    conseillerIds: ObjectId[],
    pix: string,
    diplome: string,
    cv: string,
    searchByName: string,
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $match: {
          _id: { $nin: conseillerIds },
          ...filterPix(pix),
          ...filterCv(cv),
          ...filterDiplome(diplome),
          ...filterNomConseiller(searchByName),
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_candidats: '$count' } },
    ]);

const getCandidatsStructureAvecFiltre =
  (app: Application) =>
  async (
    conseillerIds: ObjectId[],
    pix: string,
    diplome: string,
    cv: string,
    searchByName: string,
    sortColonne: object,
    skip: string,
    limit: number,
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $match: {
          _id: { $nin: conseillerIds },
          ...filterPix(pix),
          ...filterCv(cv),
          ...filterDiplome(diplome),
          ...filterNomConseiller(searchByName),
        },
      },
      {
        $project: {
          _id: 1,
          nom: 1,
          prenom: 1,
          codePostal: 1,
          createdAt: 1,
          statut: 1,
          email: 1,
          pix: 1,
          cv: 1,
        },
      },
      { $sort: sortColonne },
      {
        $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
      },
      { $limit: Number(limit) },
    ]);

const getCandidatsStructure =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const structureId = req.params.id;
    const structure: IStructures = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ _id: new ObjectId(structureId) });
    if (structure === null) {
      res.status(404).json({ message: "La structure n'existe pas" });
      return;
    }
    const { pix, diplome, cv, skip, search, nomOrdre } = req.query;
    const candidatValidation = validCandidatsStructure.validate({
      skip,
      pix,
      diplome,
      cv,
      search,
      nomOrdre,
    });

    if (candidatValidation.error) {
      res.status(400).json({ message: candidatValidation.error.message });
      return;
    }
    const items: { total: number; data: object; limit: number; skip: number } =
      {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
    const sortColonne = JSON.parse(`{"${nomOrdre}":1}`);

    try {
      const conseillerIds = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find()
        .select({ 'conseillerObj._id': 1, _id: 0 });
      const candidats: IConseillers[] = await getCandidatsStructureAvecFiltre(
        app,
      )(
        conseillerIds.map((conseiller) => conseiller.conseillerObj._id),
        pix as string,
        diplome as string,
        cv as string,
        search as string,
        sortColonne,
        skip as string,
        options.paginate.default,
      );
      if (candidats.length > 0) {
        const totalCandidats = await getTotalCandidatsStructure(app)(
          conseillerIds.map((conseiller) => conseiller.conseillerObj._id),
          pix as string,
          diplome as string,
          cv as string,
          search as string,
        );
        items.data = candidats;
        items.total = totalCandidats[0]?.count_candidats;
        items.limit = options.paginate.default;
        items.skip = Number(skip);
      }
      res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getCandidatsStructure;
