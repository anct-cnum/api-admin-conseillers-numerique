import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { updateReconventionnement } from '../../../schemas/reconventionnement.schemas';
import { StatutConventionnement } from '../../../ts/enum';

const updateDossierReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      query: { action, structureId, motif },
      body: { misesEnRelations },
    } = req;
    let statut: string;
    let misesEnRelationObjectIds: [string];

    const updateValidation = updateReconventionnement.validate({
      action,
      structureId,
      motif,
      misesEnRelations,
    });

    if (updateValidation.error) {
      res.status(400).json({ message: updateValidation.error.message });
      return;
    }

    if (!ObjectId.isValid(structureId)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    switch (action.trim()) {
      case 'enregistrer':
        statut = StatutConventionnement.RECONVENTIONNEMENT_INITIÉ;
        break;
      case 'envoyer':
        statut = StatutConventionnement.RECONVENTIONNEMENT_EN_COURS;
        break;
      case 'annuler':
        statut = StatutConventionnement.NON_INTERESSÉ;
        break;
      default:
        res.status(400).json({ message: 'Action non valide' });
        return;
    }

    try {
      // On modifie le statut de la structure en fonction de l'action demandée par l'utilisateur (enregistrer ou envoyer)
      if (
        statut === StatutConventionnement.RECONVENTIONNEMENT_INITIÉ ||
        statut === StatutConventionnement.RECONVENTIONNEMENT_EN_COURS
      ) {
        const objectConventionnement = {
          ...{
            'conventionnement.statut': statut,
            'conventionnement.dossierReconventionnement.dateDerniereModification':
              new Date(),
          },
          ...(statut === StatutConventionnement.RECONVENTIONNEMENT_EN_COURS && {
            'conventionnement.dossierReconventionnement.dateDeCreation':
              new Date(),
          }),
        };
        await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne({
            $set: objectConventionnement,
          });
      } else if (statut === StatutConventionnement.NON_INTERESSÉ) {
        await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne({
            $set: {
              'conventionnement.statut': statut,
              'conventionnement.motif': motif,
              'conventionnement.dossierReconventionnement.dateDerniereModification':
                new Date(),
            },
          });
      }

      misesEnRelationObjectIds = misesEnRelations?.map(
        (miseEnRelation) => new ObjectId(miseEnRelation.miseEnRelationId),
      );

      // On modifie le statut de la mise en relation en fonction de l'action demandée par l'utilisateur (enregistrer ou envoyer)
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            $and: [
              { _id: { $in: misesEnRelationObjectIds } },
              { statut: { $in: ['finalisee'] } },
            ],
          },
          { $set: { reconventionnement: true } },
        );

      // On modifie le statut de la mise en relation en fonction de l'action demandée par l'utilisateur (enregistrer ou envoyer)
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            $and: [
              { _id: { $nin: misesEnRelationObjectIds } },
              { 'structure.$id': new ObjectId(structureId) },
              { statut: { $in: ['finalisee'] } },
            ],
          },
          { $unset: { reconventionnement: '' } },
        );

      res.status(200).json({
        message:
          'La structure ainsi que les conseillers associés ont bien été mis à jour.',
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

export default updateDossierReconventionnement;
