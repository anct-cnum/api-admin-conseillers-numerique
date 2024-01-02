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
  filterNomAndEmailConseiller,
  filterPix,
  filterCv,
  filterDiplome,
  filterCCP1,
} from '../repository/conseillers.repository';
import { action } from '../../../helpers/accessControl/accessList';
import { getCoselec } from '../../../utils';

interface IConseillersWithMiseEnRelation extends IConseillers {
  miseEnRelation: object;
}

const getTotalCandidatsStructure =
  (app: Application) =>
  async (
    conseillerIds: ObjectId[],
    pix: string,
    diplome: string,
    cv: string,
    ccp1: string,
    searchByName: string,
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $addFields: {
          nomPrenomStr: { $concat: ['$nom', ' ', '$prenom'] },
          email: '$email',
        },
      },
      {
        $addFields: {
          prenomNomStr: { $concat: ['$prenom', ' ', '$nom'] },
          email: '$email',
        },
      },
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          _id: { $nin: conseillerIds },
          disponible: true,
          ...filterPix(pix),
          ...filterCv(cv),
          ...filterDiplome(diplome),
          ...filterCCP1(ccp1),
          ...filterNomAndEmailConseiller(searchByName),
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
    ccp1: string,
    searchByName: string,
    sortColonne: object,
    skip: string,
    limit: number,
  ) =>
    app.service(service.conseillers).Model.aggregate([
      {
        $addFields: {
          nomPrenomStr: { $concat: ['$nom', ' ', '$prenom'] },
          email: '$email',
        },
      },
      {
        $addFields: {
          prenomNomStr: { $concat: ['$prenom', ' ', '$nom'] },
          email: '$email',
        },
      },
      { $addFields: { idPGStr: { $toString: '$idPG' } } },
      {
        $match: {
          _id: { $nin: conseillerIds },
          disponible: true,
          ...filterPix(pix),
          ...filterCv(cv),
          ...filterDiplome(diplome),
          ...filterCCP1(ccp1),
          ...filterNomAndEmailConseiller(searchByName),
        },
      },
      {
        $project: {
          _id: 1,
          idPG: 1,
          nom: 1,
          prenom: 1,
          codePostal: 1,
          dateDisponibilite: 1,
          structureId: 1,
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
    const structureId = req.user?.entity?.oid;
    if (!ObjectId.isValid(structureId)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    const structure: IStructures = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne();
    if (structure === null) {
      res.status(404).json({ message: "La structure n'existe pas" });
      return;
    }
    const { pix, diplome, ccp1, cv, skip, search, nomOrdre, ordre } = req.query;
    const candidatValidation = validCandidatsStructure.validate({
      skip,
      pix,
      diplome,
      ccp1,
      cv,
      search,
      nomOrdre,
      ordre,
    });

    if (candidatValidation.error) {
      res.status(400).json({ message: candidatValidation.error.message });
      return;
    }
    const items: {
      total: number;
      data: object;
      limit: number;
      skip: number;
      coselec: object;
    } = {
      total: 0,
      data: [],
      limit: 0,
      skip: 0,
      coselec: {},
    };
    const sortColonne = JSON.parse(`{"${nomOrdre}":${ordre}}`);

    try {
      const conseillerIds = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find()
        .select({ 'conseillerObj._id': 1, _id: 0 });
      let candidats: IConseillersWithMiseEnRelation[] =
        await getCandidatsStructureAvecFiltre(app)(
          conseillerIds.map((conseiller) => conseiller.conseillerObj._id),
          pix as string,
          diplome as string,
          cv as string,
          ccp1 as string,
          search as string,
          sortColonne,
          skip as string,
          options.paginate.default,
        );
      if (candidats.length > 0) {
        candidats = await Promise.all(
          candidats.map(async (candidat) => {
            const item = { ...candidat };
            if (item.statut === 'RECRUTE') {
              item.miseEnRelation = await app
                .service(service.misesEnRelation)
                .Model.findOne({
                  'conseiller.$id': item._id,
                  'structure.$id': item.structureId,
                })
                .select({ statut: 1, _id: 0 });
            }
            return item;
          }),
        );
        const totalCandidats = await getTotalCandidatsStructure(app)(
          conseillerIds.map((conseiller) => conseiller.conseillerObj._id),
          pix as string,
          diplome as string,
          cv as string,
          ccp1 as string,
          search as string,
        );
        items.data = candidats;
        items.total = totalCandidats[0]?.count_candidats;
        items.limit = options.paginate.default;
        items.skip = Number(skip);
        items.coselec = getCoselec(structure);
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
