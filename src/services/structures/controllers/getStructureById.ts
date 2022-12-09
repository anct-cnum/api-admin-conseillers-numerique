import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';

const getStructureById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    try {
      // Attention : pas d'access control car tout le monde peut voir tous les candidats
      const structure: IStructures = await app
        .service(service.structures)
        .Model.findOne({ _id: new ObjectId(idStructure) });

      res.status(200).json(structure);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStructureById;
