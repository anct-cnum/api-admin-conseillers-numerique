import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const addRoleCoordinateur =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { conseillerId } = req.body;

    if (!ObjectId.isValid(conseillerId)) {
      res.status(400).json({ message: 'Id incorrect' });
    }
    try {
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(req.user?.entity?.oid),
          statut: 'VALIDATION_COSELEC',
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const countDemandesCoordinateurValider =
        structure?.demandesCoordinateur?.filter(
          (demandeCoordinateur) => demandeCoordinateur.statut === 'validee',
        ).length;

      if (countDemandesCoordinateurValider > 0) {
        const coordinateurs = await app
          .service(service.conseillers)
          .Model.aggregate([
            {
              $match: {
                structureId: new ObjectId(structure._id),
                statut: 'RECRUTE',
                estCoordinateur: true,
              },
            },
          ]);

        const countCoordinateur = coordinateurs.length;

        if (countCoordinateur >= countDemandesCoordinateurValider) {
          res.status(400).json({
            message:
              'Vous avez atteint le nombre maximum de coordinateurs pour votre structure',
          });
          return;
        }
      }

      const conseiller = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: new ObjectId(conseillerId) },
          { $set: { estCoordinateur: true } },
        );

      if (!conseiller) {
        res.status(404).json({ message: 'Le conseiller n’existe pas' });
      }

      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            'conseillerObj._id': new ObjectId(conseillerId),
            statut: 'finalisee',
          },
          { $set: { 'conseillerObj.estCoordinateur': true } },
        );
      if (!miseEnRelation) {
        res.status(404).json({ message: 'La mise en relation n’existe pas' });
      }

      await app
        .service(service.users)
        .Model.findOneAndUpdate(
          { 'entity.$id': new ObjectId(conseillerId) },
          { $set: { roles: ['coordinateur_coop'] } },
        );

      res.status(200).json(conseillerId);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
export default addRoleCoordinateur;
