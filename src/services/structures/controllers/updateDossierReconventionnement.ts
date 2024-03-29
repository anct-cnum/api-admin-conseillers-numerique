import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { updateReconventionnement } from '../../../schemas/reconventionnement.schemas';
import { StatutConventionnement } from '../../../ts/enum';
import {
  IMisesEnRelation,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';

interface IMisesEnRelationExtended extends IMisesEnRelation {
  miseEnRelationId: ObjectId;
}

interface RequestQuery {
  etat: string;
  structureId: ObjectId;
  motif: string;
}

interface RequestBody {
  misesEnRelations: IMisesEnRelationExtended[];
}

const updateDossierReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { etat, structureId, motif }: RequestQuery = req.query;
    const { misesEnRelations }: RequestBody = req.body;
    let statut: string;

    const updateValidation = updateReconventionnement.validate({
      etat,
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
    const structure: IStructures = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne();
    if (!structure) {
      res.status(404).json({ message: "La structure n'existe pas" });
      return;
    }
    if (
      etat.trim() === 'valider' &&
      !structure?.conventionnement?.dossierReconventionnement?.numero
    ) {
      res
        .status(404)
        .json({ message: 'Le numéro de dossier DS est obligatoire' });
      return;
    }

    switch (etat.trim()) {
      case 'enregistrer':
        statut = StatutConventionnement.RECONVENTIONNEMENT_INITIÉ;
        break;
      case 'valider':
        statut = StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ;
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
        statut === StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
      ) {
        const objectConventionnement = {
          ...{
            'conventionnement.statut': statut,
            'conventionnement.dossierReconventionnement.dateDerniereModification':
              new Date(),
          },
          ...(statut === StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ && {
            'conventionnement.dossierReconventionnement.banniereValidation':
              true,
          }),
        };
        const objectConventionnementMiseEnRelation = {
          ...{
            'structureObj.conventionnement.statut': statut,
            'structureObj.conventionnement.dossierReconventionnement.dateDerniereModification':
              new Date(),
          },
          ...(statut === StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ && {
            'structureObj.conventionnement.dossierReconventionnement.banniereValidation':
              true,
          }),
        };
        const structureUpdated = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne({
            $set: objectConventionnement,
          });
        if (structureUpdated.modifiedCount === 0) {
          res.status(404).json({
            message: "La structure n'a pas été mise à jour",
          });
          return;
        }
        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany({
            $set: objectConventionnementMiseEnRelation,
          });
      } else if (statut === StatutConventionnement.NON_INTERESSÉ) {
        const structureUpdated = await app
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
        if (structureUpdated.modifiedCount === 0) {
          res.status(404).json({
            message: "La structure n'a pas été mise à jour",
          });
          return;
        }
        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany({
            $set: {
              'structureObj.conventionnement.statut': statut,
              'structureObj.conventionnement.motif': motif,
              'structureObj.conventionnement.dossierReconventionnement.dateDerniereModification':
                new Date(),
            },
          });
      }

      const misesEnRelationObjectIds = misesEnRelations?.map(
        (miseEnRelation) => miseEnRelation.miseEnRelationId,
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
              { 'structure.$id': structureId },
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
