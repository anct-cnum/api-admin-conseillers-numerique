import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { avenantRenduPoste } from '../../../schemas/structures.schemas';

const validationAvenantRenduPoste =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { nbDePosteRendu, nbDePosteCoselec } = req.body;
    const avenantAJoutPosteValidation = avenantRenduPoste.validate({
      nbDePosteRendu,
      nbDePosteCoselec,
    });

    if (avenantAJoutPosteValidation.error) {
      res
        .status(400)
        .json({ message: avenantAJoutPosteValidation.error.message });
      return;
    }
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: idStructure,
            demandesCoselec: {
              $elemMatch: {
                statut: { $eq: 'en_cours' },
                type: { $eq: 'rendu' },
              },
            },
            statut: 'VALIDATION_COSELEC',
          },
          {
            $set: {
              'demandesCoselec.$.statut': 'validee',
            },
            $push: {
              coselec: {
                nombreConseillersCoselec:
                  Number(nbDePosteCoselec) - Number(nbDePosteRendu),
                avisCoselec: 'POSITIF',
                insertedAt: new Date(),
              },
            },
          },
        );
      if (structure.modifiedCount === 0) {
        res.status(400).json({ message: "L'avenant n'a pas pu être validé" });
        return;
      }
      res.status(200).json({
        statutAvenantAjoutPosteUpdated: 'validee',
      });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default validationAvenantRenduPoste;
