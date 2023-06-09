import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { avenantAjoutPoste } from '../../../schemas/structures.schemas';

const updateAvenantAjoutPoste =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { statut, nbDePosteAccorder, nbDePosteCoselec } = req.body;
    const paramsUpdate = {
      $set: {},
      $push: {},
    };
    const avenantAJoutPosteValidation = avenantAjoutPoste.validate({
      statut,
      nbDePosteAccorder,
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
      if (statut === 'POSITIF') {
        paramsUpdate.$set = {
          'demandesCoselec.$.statut': 'validee',
          'demandesCoselec.$.nombreDePostesAccordes': Number(nbDePosteAccorder),
        };
        paramsUpdate.$push = {
          coselec: {
            type: 'avenant',
            nombreConseillersCoselec:
              Number(nbDePosteAccorder) + Number(nbDePosteCoselec),
            avisCoselec: 'POSITIF',
            insertedAt: new Date(),
          },
        };
      }
      if (statut === 'NÉGATIF') {
        paramsUpdate.$set = {
          'demandesCoselec.$.statut': 'refusee',
        };
        paramsUpdate.$push = {
          coselec: {
            nombreConseillersCoselec: 0,
            avisCoselec: 'NÉGATIF',
            insertedAt: new Date(),
          },
        };
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
                type: { $eq: 'ajout' },
              },
            },
            statut: 'VALIDATION_COSELEC',
          },
          paramsUpdate,
        );
      if (structure.modifiedCount === 0) {
        res.status(400).json({ message: "L'avenant n'a pas pu être modifié" });
        return;
      }
      res.status(200).json({
        statutAvenantAjoutPosteUpdated:
          statut === 'POSITIF' ? 'validee' : 'refusee',
        nbDePosteAccorderUpdated: nbDePosteAccorder,
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

export default updateAvenantAjoutPoste;
