import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

const axios = require('axios');

const verifySiretStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { siret } = req.params;
    try {
      const urlSiret = `https://entreprise.api.gouv.fr/v2/etablissements/${siret}`;
      const params = {
        token: app.get('api_entreprise'),
        context: 'cnum',
        recipient: 'cnum',
        object: 'checkSiret',
      };
      const result = await axios.get(urlSiret, { params });
      if (result.status === 404) {
        return res.status(404).json({
          message: `Le numéro de SIRET ( N° ${siret} ) que vous avez demandé n'existe pas !`,
          statut: 404,
        });
      }
      if (result.status === 200) {
        return res.send({ nomStructure: result.data.etablissement.adresse.l1 });
      }
      return res.status(result.status).json({ message: result.statusText });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default verifySiretStructure;
