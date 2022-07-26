import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestStructures,
  formatAdresseStructure,
  formatQpv,
  formatType,
} from '../structures.repository';
import checkAccessReadRequestMisesEnRelation from '../../misesEnRelation/misesEnRelation.repository';
import {
  checkAccessRequestCras,
  getNombreAccompagnementsByArrayConseillerId,
  getNombreCrasByArrayConseillerId,
} from '../../cras/cras.repository';

const getDetailStructureById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    try {
      const checkAccessStructure = await checkAccessReadRequestStructures(
        app,
        req,
      );
      const structure = await app.service(service.structures).Model.aggregate([
        {
          $match: {
            _id: new ObjectId(idStructure),
            $and: [checkAccessStructure],
          },
        },
        {
          $lookup: {
            from: 'conseillers',
            let: { idStructure: '$_id' },
            as: 'conseillers',
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$$idStructure', '$structureId'] },
                },
              },
              {
                $project: {
                  nom: 1,
                  prenom: 1,
                  idPG: 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            idPG: 1,
            nom: 1,
            qpvStatut: 1,
            insee: 1,
            type: 1,
            siret: 1,
            codePostal: 1,
            createdAt: 1,
            contact: 1,
            conseillers: '$conseillers',
          },
        },
      ]);
      const checkAccessMiseEnRelation =
        await checkAccessReadRequestMisesEnRelation(app, req);
      const checkAccessCras = await checkAccessRequestCras(app, req);

      const craCount = await getNombreCrasByArrayConseillerId(
        app,
        req,
      )(structure[0].conseillers?.map((conseiller) => conseiller._id));
      const accompagnementsCount =
        await getNombreAccompagnementsByArrayConseillerId(
          app,
          checkAccessCras,
        )(structure[0].conseillers?.map((conseiller) => conseiller._id));

      const stats = await app.service(service.misesEnRelation).Model.aggregate([
        {
          $match: {
            'structure.$id': new ObjectId(idStructure),
            statut: { $in: ['finalisee', 'recrutee'] },
            $and: [checkAccessMiseEnRelation],
          },
        },
        { $group: { _id: '$statut', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      const users = await app.service(service.users).Model.aggregate([
        {
          $match: {
            'entity.$id': new ObjectId(idStructure),
          },
        },
        { $project: { name: 1, roles: 1, passwordCreated: 1 } },
      ]);
      structure[0].posteValider =
        stats.find((stat) => stat._id === 'recrutee')?.count || 0;
      structure[0].posteRecruter =
        stats.find((stat) => stat._id === 'finalisee')?.count || 0;
      structure[0].craCount = craCount;
      structure[0].accompagnementCount = accompagnementsCount[0]?.total;
      structure[0].qpvStatut = formatQpv(structure[0].qpvStatut);
      structure[0].type = formatType(structure[0].type);
      structure[0].adresseFormat = formatAdresseStructure(structure[0].insee);
      structure[0].users = users;

      if (structure.length === 0) {
        return res.status(404).json({ message: 'Structure non trouvée' });
      }

      return res.status(200).json(structure[0]);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDetailStructureById;
