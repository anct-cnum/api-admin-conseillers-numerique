import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import {
  getConseillersIdsByStructure,
  getCodesPostauxStatistiquesCras,
  checkAccessRequestCras,
  createArrayForFiltreCodePostaux,
} from '../cras.repository';

const getCodePostauxStructureCras =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idStructure = new ObjectId(req.query.id);

      const conseillersIds = await getConseillersIdsByStructure(
        idStructure,
        app,
      );
      const checkAccess = checkAccessRequestCras(app, req);
      const listCodePostaux = await getCodesPostauxStatistiquesCras(
        app,
        checkAccess,
      )(conseillersIds);

      const listeDefinitive = createArrayForFiltreCodePostaux(listCodePostaux);

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

export default getCodePostauxStructureCras;
