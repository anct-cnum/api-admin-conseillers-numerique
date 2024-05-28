import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestStructures } from '../repository/structures.repository';
import { action } from '../../../helpers/accessControl/accessList';
import { getCoselec } from '../../../utils';

const getDetailDemandeConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const checkAccess = checkAccessReadRequestStructures(app, req);
      const structure = await app.service(service.structures).Model.aggregate([
        {
          $match: {
            $and: [checkAccess],
            _id: new ObjectId(idStructure),
          },
        },
        {
          $lookup: {
            from: 'structures',
            localField: 'prefet.idStructureTransfert',
            foreignField: '_id',
            as: 'structureTransfert',
          },
        },
        {
          $project: {
            prefet: { $arrayElemAt: ['$prefet', -1] },
            nombreConseillersSouhaites: 1,
            createdAt: 1,
            demandesCoselec: 1,
            coselec: 1,
            statut: 1,
            idPG: 1,
            nom: 1,
            contact: 1,
            'structureTransfert.nom': 1,
            'structureTransfert.idPG': 1,
          },
        },
      ]);
      if (structure.length === 0) {
        res.status(404).json({
          message: "La structure n'existe pas",
        });
        return;
      }
      structure[0].nombreConseillersCoselec =
        getCoselec(structure[0])?.nombreConseillersCoselec ?? 0;
      if (
        structure[0]?.statut === 'CREEE' ||
        structure[0]?.demandesCoselec?.some(
          (demande) => demande.statut === 'en_cours',
        )
      ) {
        const listeStructure = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .find({
            statut: { $in: ['VALIDATION_COSELEC', 'ABANDON'] },
            _id: { $ne: structure[0]._id },
          })
          .select({ nom: 1, idPG: 1 });
        res.status(200).json({ structure: structure[0], listeStructure });
        return;
      }
      res.status(200).json({ structure: structure[0] });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDetailDemandeConseiller;
