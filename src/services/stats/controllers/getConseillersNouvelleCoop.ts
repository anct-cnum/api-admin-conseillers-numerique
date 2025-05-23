import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validSearchConseiller } from '../../../schemas/stats.schemas';
import service from '../../../helpers/services';
import { checkAccessReadRequestConseillers } from '../../conseillers/repository/conseillers.repository';

const axios = require('axios');

const sortByName = (a, b) =>
  a.attributes.nom.toLowerCase().localeCompare(b.attributes.nom.toLowerCase());

const filterNomAndPrenomConseiller = (search: string) => {
  const inputSearchBar = search?.trim();
  return {
    statut: { $exists: true },
    $or: [
      {
        nomPrenomStr: {
          $regex: `(?'name'${inputSearchBar}.*$)`,
          $options: 'i',
        },
      },
      {
        prenomNomStr: {
          $regex: `(?'name'${inputSearchBar}.*$)`,
          $options: 'i',
        },
      },
      { idPGStr: { $regex: `(?'name'${inputSearchBar}.*$)`, $options: 'i' } },
    ],
  };
};

const getConseillersNouvelleCoop =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const coop = app.get('coop');
      let initialMediateursOptionsResult = [];
      let conseillersIds = [];
      const { role, ...rest } = req.query;

      const statsValidation = validSearchConseiller.validate(rest);
      if (statsValidation.error) {
        return res.status(400).json({ message: statsValidation.error.message });
      }
      if (!req.user?.roles.includes('admin') && role !== 'admin') {
        return res.status(403).json({
          message: `User not authorized`,
        });
      }
      const checkAccessConseiller = await checkAccessReadRequestConseillers(
        app,
        req,
      );
      if (req.query?.search?.trim()) {
        conseillersIds = await app
          .service(service.conseillers)
          .Model.aggregate([
            {
              $addFields: {
                nomPrenomStr: { $concat: ['$nom', ' ', '$prenom'] },
              },
            },
            {
              $addFields: {
                prenomNomStr: { $concat: ['$prenom', ' ', '$nom'] },
              },
            },
            { $addFields: { idPGStr: { $toString: '$idPG' } } },
            {
              $match: {
                ...filterNomAndPrenomConseiller(req.query.search),
                $and: [checkAccessConseiller],
              },
            },
            { $limit: 100 },
            {
              $group: {
                _id: '$idPG',
              },
            },
          ]);
      }
      const formatIdQueryParams = conseillersIds
        .map((i) => i._id.toString())
        .join(',');
      if (formatIdQueryParams) {
        const idsConseillerFilter = `?filter[soft_deleted]=0&filter[conseiller_numerique_id_pg]=${formatIdQueryParams}`;
        const initialMediateursOptions = await axios({
          method: 'get',
          url: `${coop.domain}${coop.endPointUtilisateur}${idsConseillerFilter}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${coop.token}`,
          },
        });
        initialMediateursOptionsResult = initialMediateursOptions.data.data
          .sort(sortByName)
          .map(
            (mediateur) =>
              mediateur.attributes.mediateur?.id && {
                label: `${mediateur.attributes.conseiller_numerique.id_pg} - ${mediateur.attributes.prenom} ${mediateur.attributes.nom}`,
                value: {
                  mediateurId: mediateur.attributes.mediateur.id,
                  email: mediateur.attributes.email,
                },
              },
          )
          .filter((mediateur) => mediateur);
      }
      return res.status(200).json({ result: initialMediateursOptionsResult });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getConseillersNouvelleCoop;
