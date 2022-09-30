import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import {
  getConseillersIdsByStructure,
  getCodesPostauxStatistiquesCrasStructure,
} from '../cras.repository';
import { action } from '../../../helpers/accessControl/accessList';

const getCodePostauxStructureCras =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idStructure = new ObjectId(String(req.query.id));

      const conseillersIds = await getConseillersIdsByStructure(
        idStructure,
        req.ability,
        action.read,
        app,
      );

      const listCodePostaux = await getCodesPostauxStatistiquesCrasStructure(
        conseillersIds,
        req.ability,
        action.read,
        app,
      );

      res.status(200).json(listCodePostaux);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getCodePostauxStructureCras;
