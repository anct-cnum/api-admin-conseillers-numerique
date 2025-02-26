import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  filterNomStructure,
  filterNomAndEmailConseiller,
} from '../repository/conseillers.repository';
import { getNombreCras } from '../../cras/cras.repository';
import {
  filterRegionConseillerObj,
  filterDepartementConseillerObj,
  checkAccessReadRequestMisesEnRelation,
} from '../../misesEnRelation/misesEnRelation.repository';
import { validConseillersCoordonnes } from '../../../schemas/conseillers.schemas';

interface IConseillerCoordonne {
  dateDebutDeContrat: Date;
  dateFinDeContrat: Date;
  nomStructure: string;
  idPG: number;
  _id: ObjectId;
  nom: string;
  prenom: string;
  codeDepartement: string;
  codeRegion: string;
  mattermostId?: string;
}

const getTotalConseillersCoordonnes =
  (app: Application, checkAccess) =>
  async (searchByStructure: string, region: string, departement: string) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          statut: 'finalisee',
          ...filterNomStructure(searchByStructure),
          ...filterRegionConseillerObj(region),
          ...filterDepartementConseillerObj(departement),
          $and: [checkAccess],
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
      { $project: { _id: 0, count_conseillers: '$count' } },
    ]);

const getConseillersCoordonnes =
  (app: Application, options) => async (req: IRequest, res: Response) => {
    const {
      skip,
      ordre,
      nomOrdre,
      searchByConseiller,
      searchByStructure,
      region,
      departement,
    } = req.query;

    const limit = options.paginate.default;
    const validate = validConseillersCoordonnes.validate({
      skip,
      ordre,
      nomOrdre,
      searchByConseiller,
      searchByStructure,
      region,
      departement,
    });

    const checkAccessMiseEnRelation =
      await checkAccessReadRequestMisesEnRelation(app, req);

    if (validate.error) {
      res.statusMessage = validate.error.message;
      return res.status(400).end();
    }

    const items: { total: number; data: object; limit: number; skip: number } =
      {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
    const sortColonne = JSON.parse(`{"conseillerObj.${nomOrdre}":${ordre}}`);

    try {
      const coordonnes = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $addFields: {
              nomPrenomStr: {
                $concat: ['$conseillerObj.nom', ' ', '$conseillerObj.prenom'],
              },
            },
          },
          {
            $addFields: {
              prenomNomStr: {
                $concat: ['$conseillerObj.prenom', ' ', '$conseillerObj.nom'],
              },
            },
          },
          { $addFields: { idPGStr: { $toString: '$conseillerObj.idPG' } } },
          {
            $match: {
              statut: 'finalisee',
              ...filterNomStructure(searchByStructure),
              ...filterRegionConseillerObj(region),
              ...filterDepartementConseillerObj(departement),
              ...filterNomAndEmailConseiller(searchByConseiller),
              $and: [checkAccessMiseEnRelation],
            },
          },
          {
            $project: {
              nomStructure: '$structureObj.nom',
              dateDebutDeContrat: 1,
              dateFinDeContrat: 1,
              idPG: '$conseillerObj.idPG',
              _id: '$conseillerObj._id',
              nom: '$conseillerObj.nom',
              prenom: '$conseillerObj.prenom',
              codeDepartement: '$conseillerObj.codeDepartement',
              codeRegion: '$conseillerObj.codeRegion',
              mattermostId: '$conseillerObj.mattermost.id',
            },
          },
          {
            $sort: sortColonne,
          },
          {
            $skip: Number(skip) > 0 ? (Number(skip) - 1) * Number(limit) : 0,
          },
          { $limit: Number(limit) },
        ]);

      const promises = coordonnes.map(
        async (coordonne: IConseillerCoordonne) => {
          const craCount = await getNombreCras(app, req)(coordonne._id);
          return {
            ...coordonne,
            craCount,
          };
        },
      );

      const conseillersCoordonnes = await (
        await Promise.all(promises)
      ).filter((item) => item !== null);

      if (coordonnes.length > 0) {
        const totalConseillersCoordonnes = await getTotalConseillersCoordonnes(
          app,
          checkAccessMiseEnRelation,
        )(searchByStructure as string, region as string, departement as string);
        items.data = conseillersCoordonnes;
        items.total = totalConseillersCoordonnes[0]?.count_conseillers;
        items.limit = limit;
        items.skip = Number(skip);
      }
      return res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getConseillersCoordonnes;
