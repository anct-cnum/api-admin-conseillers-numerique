import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { avenantRenduPoste } from '../../../schemas/structures.schemas';

const updateAvenantRenduPoste =
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
      const nbMiseEnRelationRecruter = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({
          statut: { $in: ['recrutee', 'finalisee', 'nouvelle_rupture'] },
          'structure.$id': new ObjectId(idStructure),
        });
      const nbDePosteLibre =
        Number(nbDePosteCoselec) - Number(nbMiseEnRelationRecruter);
      if (nbDePosteLibre < Number(nbDePosteRendu)) {
        res.status(400).json({
          message:
            'Le nombre de poste rendu ne peut pas être supérieur ou égal aux nombre de conseillers en postes',
        });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: new ObjectId(idStructure),
            demandesCoselec: {
              $elemMatch: {
                statut: { $eq: 'en_cours' },
                type: { $eq: 'retrait' },
              },
            },
            statut: 'VALIDATION_COSELEC',
          },
          {
            $set: {
              'demandesCoselec.$.statut': 'validee',
              'demandesCoselec.$.banniereValidationAvenant': true,
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
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'structure.$id': new ObjectId(idStructure),
            'structureObj.demandesCoselec': {
              $elemMatch: {
                statut: { $eq: 'en_cours' },
                type: { $eq: 'retrait' },
              },
            },
            'structureObj.statut': 'VALIDATION_COSELEC',
          },
          {
            $set: {
              'structureObj.demandesCoselec.$.statut': 'validee',
              'structureObj.demandesCoselec.$.banniereValidationAvenant': true,
            },
            $push: {
              'structureObj.coselec': {
                nombreConseillersCoselec:
                  Number(nbDePosteCoselec) - Number(nbDePosteRendu),
                avisCoselec: 'POSITIF',
                insertedAt: new Date(),
              },
            },
          },
        );
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

export default updateAvenantRenduPoste;
