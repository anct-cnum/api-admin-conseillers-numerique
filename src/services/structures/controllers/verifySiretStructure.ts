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
      const result = await axios.get(urlSiret, { params: params });
      if (result.status === 404) {
        res.status(404).json({
          message: `Le numéro de SIRET ( N° ${siret} ) que vous avez demandé n\'existe pas !`,
        });
        return;
      }
      if (result.status === 200) {
        return res.send({ nomStructure: result.data.etablissement.adresse.l1 });
      }
      res.status(result.status).json({ message: result.statusText });
      return;
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default verifySiretStructure;
