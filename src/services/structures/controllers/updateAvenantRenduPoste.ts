import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { avenantRenduPoste } from '../../../schemas/structures.schemas';
import { PhaseConventionnement } from '../../../ts/enum';
import { checkStructurePhase2 } from '../repository/structures.repository';
import { IUser } from '../../../ts/interfaces/db.interfaces';

interface ICoselecObject {
  nombreConseillersCoselec: number;
  avisCoselec: string;
  insertedAt: Date;
  phaseConventionnement?: string;
}

const updateAvenantRenduPoste =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { nbDePosteRendu, nbDePosteCoselec } = req.body;
    const dateValidation = new Date();
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
        .Model.accessibleBy(req.ability, action.read)
        .findOne(
          {
            _id: new ObjectId(idStructure),
          },
          { _id: 0, conventionnement: 1 },
        );
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
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
            'Le nombre de postes rendus ne peut pas être supérieur ou égal au nombre de conseillers en poste',
        });
        return;
      }
      const coselecObject: ICoselecObject = {
        nombreConseillersCoselec:
          Number(nbDePosteCoselec) - Number(nbDePosteRendu),
        avisCoselec: 'POSITIF',
        insertedAt: dateValidation,
      };
      const structureObject = {
        'demandesCoselec.$.statut': 'validee',
        'demandesCoselec.$.banniereValidationAvenant': true,
        'demandesCoselec.$.validateurAvenant': {
          email: req.user?.name,
          date: dateValidation,
        },
      };
      const structureObjectMiseEnRelation = {
        'structureObj.demandesCoselec.$.statut': 'validee',
        'structureObj.demandesCoselec.$.banniereValidationAvenant': true,
        'structureObj.demandesCoselec.$.validateurAvenant': {
          email: req.user?.name,
          date: dateValidation,
        },
      };
      if (checkStructurePhase2(structure?.conventionnement?.statut)) {
        coselecObject.phaseConventionnement = PhaseConventionnement.PHASE_2;
      }
      if (coselecObject.nombreConseillersCoselec === 0) {
        Object.assign(structureObject, {
          statut: 'ABANDON',
          userCreated: false,
        });
        Object.assign(structureObjectMiseEnRelation, {
          'structureObj.statut': 'ABANDON',
          'structureObj.userCreated': false,
        });
        const userIds: IUser[] = await app
          .service(service.users)
          .Model.find({
            'entity.$id': structure._id,
            $and: [
              { roles: { $elemMatch: { $eq: 'structure' } } },
              { roles: { $elemMatch: { $eq: 'grandReseau' } } },
            ],
          })
          .select({ _id: 1 });
        if (userIds.length > 0) {
          await app.service(service.users).Model.updateMany(
            {
              _id: { $in: userIds },
            },
            {
              $unset: {
                entity: '',
              },
              $pull: {
                roles: { $in: ['structure', 'structure_coop'] },
              },
            },
          );
        }
        await app.service(service.users).Model.deleteMany({
          _id: { $nin: userIds },
          'entity.$id': structure._id,
          roles: { $in: ['structure'] },
        });
      }
      const structureUpdated = await app
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
            $set: structureObject,
            $push: {
              coselec: coselecObject,
            },
          },
        );
      if (structureUpdated.modifiedCount === 0) {
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
            $set: structureObjectMiseEnRelation,
            $push: {
              'structureObj.coselec': coselecObject,
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
