import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import {
  getCodesPostauxStatistiquesCras,
  checkAccessRequestCras,
  createArrayForFiltreCodePostaux,
} from '../cras.repository';
import service from '../../../helpers/services';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { checkAccessReadRequestMisesEnRelation } from '../../misesEnRelation/misesEnRelation.repository';

const getFiltresConseillerCras =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      if (!ObjectId.isValid(req.query.id)) {
        return res.status(400).json({ message: 'Id incorrect' });
      }
      const idConseiller = new ObjectId(req.query.id);
      const checkAccess = checkAccessRequestCras(app, req);
      const checkAccessMiseEnRelation = checkAccessReadRequestMisesEnRelation(
        app,
        req,
      );
      const listCodePostaux = await getCodesPostauxStatistiquesCras(
        app,
        checkAccess,
      )([idConseiller]);
      const listeStructures: IMisesEnRelation[] = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              $and: [checkAccessMiseEnRelation],
              'conseiller.$id': idConseiller,
              statut: {
                $in: [
                  'finalisee',
                  'finalisee_rupture',
                  'terminee_naturelle',
                  'nouvelle_rupture',
                ],
              },
            },
          },
          {
            $group: {
              _id: '$structureObj._id',
              structureId: { $addToSet: '$structureObj._id' },
              nom: { $first: '$structureObj.nom' },
              codePostal: { $first: '$structureObj.codePostal' },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ]);
      const listeCodesPostaux =
        createArrayForFiltreCodePostaux(listCodePostaux);

      return res.status(200).json({ listeCodesPostaux, listeStructures });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getFiltresConseillerCras;
