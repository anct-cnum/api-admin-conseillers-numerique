import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import {
  getConseillersIdsRecruterByStructure,
  getCodesPostauxStatistiquesCras,
  checkAccessRequestCras,
  createArrayForFiltreCodePostaux,
  getConseillersIdsRuptureByStructure,
} from '../cras.repository';

const getCodePostauxStructureCras =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idStructure = new ObjectId(req.query.id);

      const conseillersIdsRecruter = await getConseillersIdsRecruterByStructure(
        app,
        req,
        idStructure,
      );
      const conseillersIdsRupture = await getConseillersIdsRuptureByStructure(
        app,
        req,
        idStructure,
      );
      const conseillersIds = conseillersIdsRecruter.concat(
        conseillersIdsRupture,
      );
      const checkAccess = checkAccessRequestCras(app, req);
      const listCodePostaux = await getCodesPostauxStatistiquesCras(
        app,
        checkAccess,
      )(conseillersIds);

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

export default getCodePostauxStructureCras;
