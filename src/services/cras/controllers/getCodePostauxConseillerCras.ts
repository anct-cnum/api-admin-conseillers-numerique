import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import {
  getCodesPostauxStatistiquesCras,
  checkAccessRequestCras,
  createArrayForFiltreCodePostaux,
} from '../cras.repository';

const getCodePostauxConseillerCras =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      if (!ObjectId.isValid(req.query.id)) {
        return res.status(400).json({ message: 'Id incorrect' });
      }
      const idConseiller = new ObjectId(req.query.id);
      const checkAccess = checkAccessRequestCras(app, req);
      const listCodePostaux = await getCodesPostauxStatistiquesCras(
        app,
        checkAccess,
      )([idConseiller]);

      const listeDefinitive = createArrayForFiltreCodePostaux(listCodePostaux);

      return res.status(200).json(listeDefinitive);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getCodePostauxConseillerCras;
