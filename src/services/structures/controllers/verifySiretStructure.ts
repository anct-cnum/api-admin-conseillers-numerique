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

      return res.send({ nomStructure: result.data.etablissement.adresse.l1 });
    } catch (error) {
      if (error.name === 'AxiosError') {
        return res.status(error?.response?.status).json({
          message: error?.response?.data?.errors[0],
        });
      }
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default verifySiretStructure;
