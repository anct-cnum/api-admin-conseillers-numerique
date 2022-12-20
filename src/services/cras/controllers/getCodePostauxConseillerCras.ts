import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import {
  getCodesPostauxStatistiquesCras,
  checkAccessRequestCras,
} from '../cras.repository';

const getCodePostauxConseillerCras =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idConseiller = new ObjectId(String(req.query.id));

      const checkAccess = checkAccessRequestCras(app, req);
      const listCodePostaux = await getCodesPostauxStatistiquesCras(
        app,
        checkAccess,
      )([idConseiller]);

      const listeDefinitive = [];
      listCodePostaux.forEach((paire) => {
        if (
          listeDefinitive.findIndex(
            (item) => item.id === paire._id.codePostal,
          ) > -1
        ) {
          listeDefinitive
            .find((item) => item.id === paire._id.codePostal)
            .codePostal.push(`${paire._id.codePostal} - ${paire._id.ville}`);
        } else {
          listeDefinitive.push({
            id: paire._id.codePostal,
            codePostal: [`${paire._id.codePostal} - ${paire._id.ville}`],
          });
        }
      });

      listeDefinitive.sort((a, b) => a.id - b.id);

      res.status(200).json(listeDefinitive);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getCodePostauxConseillerCras;
