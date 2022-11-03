import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

const verifySiretStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { siret } = req.params;
    console.log(siret);
    try {
      const params = new URLSearchParams({
        // token: app.get('api_entreprise'),
        context: 'cnum',
        recipient: 'cnum',
        object: 'checkSiret',
      });
      console.log(params);
      const urlSiret = `https://entreprise.api.gouv.fr/v2/etablissements/${siret}?${params.toString()}`;
      const response = await fetch(
        `https://entreprise.api.gouv.fr/v2/etablissements/${siret}`,
        {
          method: 'GET',
        },
      );
      console.log(response);
      const data = await response.json();
      console.log(data);
      // console.log(urlSiret);
      // fetch(urlSiret)
      //   .then((data) => {
      //     return data.json();
      //   })
      //   .then((entreprise) => {
      //     console.log(entreprise);
      //     return res.send({
      //       nomStructure: entreprise.etablissement.adresse.l1,
      //     });
      //   })
      //   .catch(() => {
      //     return res
      //       .status(404)
      //       .send(
      //         new NotFound(
      //           `Le numéro de SIRET ( N° ${siret} ) que vous avez demandé n'existe pas !`,
      //         ).toJSON(),
      //       );
      //   });
    } catch (error) {
      console.log(error);
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default verifySiretStructure;
