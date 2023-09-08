import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const closeBannerAvisPrefet =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idDemandeCoordinateur = req.params.id;
    try {
      if (!ObjectId.isValid(idDemandeCoordinateur)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            demandesCoordinateur: {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
            statut: 'VALIDATION_COSELEC',
          },
          {
            $set: {
              'demandesCoordinateur.$.banniereValidationAvisPrefet': false,
            },
          },
        );
      if (structure.modifiedCount === 0) {
        res.status(400).json({ message: "La bannière n'a pas pu être fermée" });
        return;
      }
      // await app
      //   .service(service.misesEnRelation)
      //   .Model.accessibleBy(req.ability, action.update)
      //   .updateMany(
      //     {
      //       'structure.$id': new ObjectId(idStructure),
      //       'structureObj.statut': 'VALIDATION_COSELEC',
      //       'structureObj.demandesCoordinateur': {
      //         $elemMatch: {
      //           id: { $eq: new ObjectId(idDemandeCoordinateur) },
      //         },
      //       },
      //     },
      //     {
      //       $set: {
      //         'structureObj.demandesCoordinateur.$.avisPrefet': avisPrefet,
      //         'structureObj.demandesCoordinateur.$.banniereValidationAvisPrefet':
      //           true,
      //         'structureObj.demandesCoordinateur.$.commentaire': commentaire,
      //       },
      //     },
      //   );
      res.status(200).json({ idDemandeCoordinateur });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default closeBannerAvisPrefet;
