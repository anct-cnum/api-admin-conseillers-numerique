import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';

const updateDossierReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      query: { action, structureId, nombreDePostes, motif },
      body: { conseillers },
    } = req;
    let statut: string;
    let misesEnRelationObjectIds: [string];

    switch (action.trim()) {
      case 'enregistrer':
        statut = 'ENREGISTRÉ';
        break;
      case 'envoyer':
        statut = 'RECONVENTIONNEMENT_EN_COURS';
        break;
      case 'annuler':
        statut = 'NON_INTERESSÉ';
        break;
      default:
        res.status(400).json({ message: 'Action non valide' });
        return;
    }

    try {
      if (!ObjectId.isValid(structureId)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      // On modifie le statut de la structure en fonction de l'action demandée par l'utilisateur (enregistrer ou envoyer)
      if (statut === 'ENREGISTRÉ' || statut === 'RECONVENTIONNEMENT_EN_COURS') {
        await app.service(service.structures).Model.findOneAndUpdate(
          { _id: new ObjectId(structureId) },
          {
            $set: {
              'conventionnement.statut': statut,
              'conventionnement.derniereModification': new Date(),
              'conventionnement.dossierReconventionnement.nbPostesAttribues':
                nombreDePostes,
            },
          },
        );
      } else if (statut === 'NON_INTERESSE') {
        await app.service(service.structures).Model.findOneAndUpdate(
          { _id: new ObjectId(structureId) },
          {
            $set: {
              'conventionnement.statut': statut,
              'conventionnement.motif': motif,
              'conventionnement.derniereModification': new Date(),
            },
          },
        );
      }

      misesEnRelationObjectIds = conseillers?.map(
        (conseiller) => new ObjectId(conseiller.miseEnRelationId),
      );

      await app.service(service.misesEnRelation).Model.updateMany(
        {
          $and: [
            { _id: { $in: misesEnRelationObjectIds } },
            { 'structure.$id': new ObjectId(structureId) },
          ],
        },
        { $set: { reconventionnement: statut } },
        { multi: true },
      );
      await app.service(service.misesEnRelation).Model.updateMany(
        {
          $and: [
            { _id: { $nin: misesEnRelationObjectIds } },
            { 'structure.$id': new ObjectId(structureId) },
          ],
        },
        { $unset: { reconventionnement: '' } },
        { multi: true },
      );

      await app.service(service.misesEnRelation).Model.aggregate([
        {
          $match: {
            'structure.$id': new ObjectId(structureId),
            statut: {
              $in: ['recrutee', 'finalisee_rupture', 'nouvelle_rupture'],
            },
          },
        },
        {
          $project: {
            conseillerObj: 1,
            statut: 1,
            reconventionnement: 1,
          },
        },
      ]);
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
