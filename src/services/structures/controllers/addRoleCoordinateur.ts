import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { envoiEmailInvit } from '../../../utils/email';
import mailer from '../../../mailer';
import { deleteRoleUser } from '../../../utils';

const addRoleCoordinateur =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { conseillerId } = req.body;
    let errorSmtpMail: Error | null = null;

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
      const demandesCoordinateurValider =
        structure?.demandesCoordinateur?.filter(
          (demandeCoordinateur) => demandeCoordinateur.statut === 'validee',
        );

      if (demandesCoordinateurValider.length === 0) {
        res.status(400).json({
          message:
            "Aucune demande coordinateur n'a encore été validée pour votre structure",
        });
        return;
      }
      const miseEnRelation: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          'conseiller.$id': new ObjectId(conseillerId),
          'structure.$id': structure._id,
          statut: 'finalisee',
        });
      if (!miseEnRelation) {
        res.status(404).json({
          message: "La mise en relation n'existe pas",
        });
        return;
      }
      // vérifie que le conseiller est lié à une demande ou qu'une demande soit lié à aucun conseiller
      const checkLiaisonDemandesCoordo = demandesCoordinateurValider.some(
        (demandeCoordinateur) =>
          !demandeCoordinateur?.miseEnRelationId ||
          demandeCoordinateur?.miseEnRelationId?.toString() ===
            miseEnRelation._id.toString(),
      );
      if (!checkLiaisonDemandesCoordo) {
        res.status(409).json({
          message:
            "Le conseiller sélectionné n'est pas celui que vous avez recruté pour devenir Conseiller numérique coordinateur",
        });
        return;
      }

      const countCoordinateur = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({
          structureId: structure._id,
          statut: 'RECRUTE',
          estCoordinateur: true,
        });

      if (countCoordinateur >= demandesCoordinateurValider.length) {
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
            statut: 'RECRUTE',
            structureId: new ObjectId(structure._id),
          },
          { $set: { estCoordinateur: true } },
        );

      if (!conseiller?.passwordCreated) {
        res.status(409).json({
          message: 'Le compte du conseiller est inactif',
        });
        return;
      }

      if (conseiller.modifiedCount === 0) {
        res
          .status(404)
          .json({ message: "Le conseiller n'a pas été mise à jour" });
      }

      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'conseiller.$id': new ObjectId(conseillerId),
          },
          { $set: { 'conseillerObj.estCoordinateur': true } },
        );
      if (miseEnRelationUpdated.modifiedCount === 0) {
        res.status(404).json({
          message: "Les mises en relation n'ont pas été mises à jour",
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
          {
            $push: { roles: ['coordinateur'] },
            $set: {
              token: uuidv4(),
              tokenCreatedAt: new Date(),
              mailSentDate: null,
              migrationDashboard: true,
            },
          },
        );

      if (user.modifiedCount === 0) {
        res
          .status(404)
          .json({ message: "L'utilisateur n'a pas été mis à jour" });
      }
      if (!user.sub) {
        errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
      }
      if (errorSmtpMail instanceof Error) {
        await deleteRoleUser(app, req, user.name, {
          $pull: {
            roles: 'coordinateur',
          },
        });
        res.status(503).json({
          message:
            "Une erreur est survenue lors de l'envoi, veuillez réessayer dans quelques minutes",
        });
        return;
      }
      if (
        demandesCoordinateurValider.some(
          (demande) => !demande?.miseEnRelationId,
        )
      ) {
        const structureUpdated = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            {
              _id: structure._id,
              demandesCoordinateur: {
                $elemMatch: {
                  statut: 'validee',
                  miseEnRelationId: { $exists: false },
                },
              },
            },
            {
              $set: {
                'demandesCoordinateur.$.miseEnRelationId': miseEnRelation._id,
              },
            },
          );
        if (structureUpdated.modifiedCount === 0) {
          res.status(404).json({
            message: "La structure n'a pas été mise à jour",
          });
          return;
        }

        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany(
            {
              'structure.$id': structure._id,
              'structureObj.demandesCoordinateur': {
                $elemMatch: {
                  statut: 'validee',
                  miseEnRelationId: { $exists: false },
                },
              },
            },
            {
              $set: {
                'structureObj.demandesCoordinateur.$.miseEnRelationId':
                  miseEnRelation._id,
              },
            },
          );
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: miseEnRelation._id,
          },
          { $set: { banniereAjoutRoleCoordinateur: true } },
        );

      res.status(200).json(conseillerId);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
export default addRoleCoordinateur;
