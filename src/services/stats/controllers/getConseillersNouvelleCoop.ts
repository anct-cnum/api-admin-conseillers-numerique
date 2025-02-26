import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validSearchConseiller } from '../../../schemas/stats.schemas';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const axios = require('axios');

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
    ],
  };
};

const getConseillersNouvelleCoop =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const { role, ...rest } = req.query;
      const coop = app.get('coop');

      const statsValidation = validSearchConseiller.validate(rest);
      if (statsValidation.error) {
        return res.status(400).json({ message: statsValidation.error.message });
      }
      if (!req.user?.roles.includes('admin') && role !== 'admin') {
        return res.status(403).json({
          message: `User not authorized`,
        });
      }
      const conseillersIds = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .find(filterNomAndPrenomConseiller(req.query.search))
        .distinct('_id');
      const idsConseillerFilter = `?filter[conseiller_numerique_id]=${conseillersIds.map((i) => i.toString()).join(',')}`;
      const initialMediateursOptions = await axios({
        method: 'get',
        url: `${coop.domain}${coop.endPointUtilisateur}${idsConseillerFilter}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${coop.token}`,
        },
      });
      const initialMediateursOptionsResult =
        initialMediateursOptions.data.data.map((mediateur) => ({
          label: `${mediateur.attributes.prenom} ${mediateur.attributes.nom}`,
          value: {
            mediateurId: mediateur.attributes.mediateur?.id,
            email: mediateur.attributes.email,
          },
        }));

      return res.status(200).json({ result: initialMediateursOptionsResult });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getConseillersNouvelleCoop;
