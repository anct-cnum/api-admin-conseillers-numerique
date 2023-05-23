import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';

interface ICandidat extends IConseillers {
  possedeCompteCandidat: boolean;
  miseEnRelation: object;
}

interface ICandidatMongoose extends IConseillers {
  toObject: () => ICandidat;
}

const getCandidatById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    let conseiller: ICandidatMongoose | null = null;
    try {
      if (!ObjectId.isValid(idConseiller)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      if (req.query.role === 'structure') {
        const findStructure = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .findOne();

        if (!findStructure) {
          res.status(404).json({ message: "La structure n'existe pas" });
          return;
        }
        conseiller = await app
          .service(service.conseillers)
          .Model.findOne({ _id: new ObjectId(idConseiller) });
      } else {
        conseiller = await app
          .service(service.conseillers)
          .Model.accessibleBy(req.ability, action.read)
          .findOne({ _id: new ObjectId(idConseiller) });
      }

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
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          'conseiller.$id': conseiller._id,
          statut: 'recrutee',
        });
      const conseillerFormat = conseiller.toObject();
      conseillerFormat.possedeCompteCandidat = possedeCompteCandidat > 0;
      conseillerFormat.miseEnRelation = miseEnRelation;

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
