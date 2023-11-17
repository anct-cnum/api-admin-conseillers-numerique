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
        .findOne();

      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const countDemandesCoordinateurValider =
        structure?.demandesCoordinateur?.filter(
          (demandeCoordinateur) => demandeCoordinateur.statut === 'validee',
        ).length;

      if (countDemandesCoordinateurValider === 0) {
        res.status(400).json({
          message:
            "Aucune demande coordinateur n'a encore été validée pour votre structure",
        });
        return;
      }

      const countCoordinateur = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({
          structureId: new ObjectId(structure._id),
          statut: 'RECRUTE',
          estCoordinateur: true,
        });

      if (countCoordinateur >= countDemandesCoordinateurValider) {
        res.status(409).json({
          message:
            'Vous avez atteint le nombre maximum de coordinateurs pour votre structure',
        });
        return;
      }

      const conseiller = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: new ObjectId(conseillerId),
          },
          { $set: { estCoordinateur: true } },
        );

      if (conseiller.modifiedCount === 0) {
        res
          .status(404)
          .json({ message: "Le conseiller n'a pas été mise à jour" });
      }

      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'conseiller.$id': new ObjectId(conseillerId),
          },
          { $set: { 'conseillerObj.estCoordinateur': true } },
        );
      if (miseEnRelation.modifiedCount === 0) {
        res.status(404).json({
          message: "Les mises en relation n'ont pas été mise à jour",
        });
      }

      const user = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            'entity.$id': new ObjectId(conseillerId),
            roles: { $in: ['conseiller'] },
          },
          { $push: { roles: ['coordinateur_coop'] } },
        );

      if (user.modifiedCount === 0) {
        res
          .status(404)
          .json({ message: "L'utilisateur n'a pas été mis à jour" });
      }

      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            'conseiller.$id': new ObjectId(conseillerId),
            statut: 'finalisee',
          },
          { $set: { 'conseillerObj.banniereAjoutRoleCoordinateur': true } },
        );

      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: new ObjectId(conseillerId),
            role: { $in: ['conseiller'] },
          },
          { $set: { banniereAjoutRoleCoordinateur: true } },
        );

      res.status(200).json(conseillerId);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
export default addRoleCoordinateur;
