import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { filterNomStructure } from '../repository/conseillers.repository';
import { getNombreCras } from '../../cras/cras.repository';
import { action } from '../../../helpers/accessControl/accessList';
import {
  filterNomConseillerObj,
  filterRegionConseillerObj,
  filterDepartementConseillerObj,
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
  groupeCRA: string;
  codeDepartement: string;
  codeRegion: string;
  emailCN?: string;
  mattermostId?: string;
}

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

    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);
    const limit = options.paginate.default;
    const validate = validConseillersCoordonnes.validate({
      dateDebut,
      dateFin,
      skip,
      ordre,
      nomOrdre,
      searchByConseiller,
      searchByStructure,
      region,
      departement,
    });

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
      const query = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();

      const coordonnes = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              statut: 'finalisee',
              ...filterNomStructure(searchByStructure),
              ...filterRegionConseillerObj(region),
              ...filterDepartementConseillerObj(departement),
              ...filterNomConseillerObj(searchByConseiller),
              $and: [query],
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
              groupeCRA: '$conseillerObj.groupeCRA',
              codeDepartement: '$conseillerObj.codeDepartement',
              codeRegion: '$conseillerObj.codeRegion',
              emailCN: '$conseillerObj.emailCN.address',
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
          const compteCoopActif = coordonne.emailCN && coordonne.mattermostId;
          const dernierCRA = await app
            .service(service.cras)
            .Model.findOne({
              'conseiller.$id': coordonne._id,
            })
            .sort({ createdAt: -1 })
            .limit(1);

          if (
            dernierCRA &&
            (dernierCRA.createdAt < dateDebut || dernierCRA.createdAt > dateFin)
          ) {
            return null;
          }
          return {
            ...coordonne,
            compteCoopActif,
            craCount,
          };
        },
      );

      const conseillersCoordonnes = await (
        await Promise.all(promises)
      ).filter((item) => item !== null);

      if (coordonnes.length > 0) {
        items.data = conseillersCoordonnes;
        items.total = conseillersCoordonnes.length;
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
