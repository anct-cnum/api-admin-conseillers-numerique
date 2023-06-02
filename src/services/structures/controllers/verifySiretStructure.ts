import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

const axios = require('axios');

const verifySiretStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { siret } = req.params;
    try {
      const urlSiret = `https://entreprise.api.gouv.fr/v3/insee/sirene/etablissements/${siret}?context=cnum&object=checkSiret&recipient=13002603200016`;
      const bearer = 'Bearer ';
      const result = await axios.get(urlSiret, {
        headers: {
          Authorization: bearer + app.get('api_entreprise'),
        },
      });

      if (result.status !== 200) {
        return res.status(400).json({ message: result.data.errors[0] });
      }
      const nomStructure =
        result?.data?.data?.unite_legale?.personne_morale_attributs
          ?.raison_sociale;
      return res.send({ nomStructure });
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
