import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { NotFound, Forbidden } from '@feathersjs/errors';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';

const getStructuresMisesEnRelationsStats =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      // verify user role
      const userId = req.user._id;
      const user = await app
        .service(service.users)
        .Model.findOne({ _id: new ObjectId(userId) });
      const rolesUserAllowed = user?.roles.filter((role: string) =>
        ['admin', 'structure', 'prefet'].includes(role),
      );
      if (rolesUserAllowed.length < 1) {
        res.status(403).send(
          new Forbidden('User not authorized', {
            userId: user,
          }).toJSON(),
        );
        return;
      }

      let structureId = null;
      try {
        structureId = new ObjectId(req.params.id);
      } catch (e) {
        res.status(404).send(
          new NotFound('Structure not found', {
            id: req.params.id,
          }).toJSON(),
        );
        return;
      }

      const stats = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          { $match: { 'structure.$id': structureId } },
          { $group: { _id: '$statut', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]);

      const statsDisponibles = stats.filter((item: any) => {
        return item._id !== 'non_disponible';
      });

      /* ajout des candidats dont le recrutement est finalisé dans détails structure */
      const misesEnRelationFinalise = await app
        .service(service.misesEnRelation)
        .Model.find({ statut: 'finalisee', 'structure.$id': structureId });
      const candidatsFinalise = misesEnRelationFinalise.map((item: any) => {
        return item.conseillerObj;
      });

      /* ajout des candidats dont le recrutement est validé dans détails structure */
      const misesEnRelationValide = await app
        .service(service.misesEnRelation)
        .Model.find({ statut: 'recrutee', 'structure.$id': structureId });
      const candidatsValide = misesEnRelationValide.map((item: any) => {
        return item.conseillerObj;
      });
      /* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["item"] }] */
      res.send(
        statsDisponibles.map((item: any) => {
          item.statut = item._id;
          if (item.statut === 'recrutee') {
            item.candidats = candidatsValide;
          }
          if (item.statut === 'finalisee') {
            item.candidats = candidatsFinalise;
          }
          delete item._id;
          return item;
        }),
      );
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
    }
  };

export default getStructuresMisesEnRelationsStats;
