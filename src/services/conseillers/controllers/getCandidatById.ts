import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const getCandidatById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    try {
      if (!ObjectId.isValid(idConseiller)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const conseiller = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idConseiller) });

      if (!conseiller) {
        res.status(404).json({ message: 'Conseiller non trouvé' });
        return;
      }

      const possedeCompteCandidat = await app
        .service(service.users)
        .Model.countDocuments({
          'entity.$id': new ObjectId(idConseiller),
          roles: { $in: ['candidat'] },
        });
      const conseillerFormat = conseiller.toObject();
      conseillerFormat.possedeCompteCandidat = possedeCompteCandidat > 0;
      conseillerFormat.miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          'conseiller.$id': conseiller._id,
          statut: 'recrutee',
        });

      res.status(200).json(conseillerFormat);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getCandidatById;
