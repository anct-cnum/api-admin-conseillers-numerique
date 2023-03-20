import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const getMisesEnRelationStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;

    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();

      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }

      const misesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              'structure.$id': new ObjectId(idStructure),
              statut: {
                $in: ['recrutee', 'finalisee_rupture', 'nouvelle_rupture'],
              },
            },
          },
          {
            $project: {
              conseillerObj: 1,
              statut: 1,
              reconventionnement: 1,
            },
          },
        ]);
      res.status(200).json(misesEnRelation);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getMisesEnRelationStructure;
