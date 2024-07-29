import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

interface IDemandeDeProlongation {
  dateSouhaitee: string;
  dateDeLaDemande: string;
  statut: string;
}

const validationRenouvellementContrat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idMiseEnRelation = req.params.id;

    try {
      const miseEnRelationVerif = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idMiseEnRelation) });
      if (!miseEnRelationVerif) {
        res.status(404).json({ message: 'Contrat non trouvé' });
        return;
      }
      const dateDeFinSouhaitee =
        miseEnRelationVerif.demandesDeProlongation?.find(
          (demande: IDemandeDeProlongation) => demande.statut === 'initiee',
        )?.dateDeFinSouhaitee;
      if (dateDeFinSouhaitee) {
        const miseEnRelationUpdated = await app
          .service(service.misesEnRelation)
          .Model.findOneAndUpdate(
            {
              _id: new ObjectId(idMiseEnRelation),
              'demandesDeProlongation.statut': 'initiee',
            },
            {
              dateFinDeContrat: new Date(dateDeFinSouhaitee),
              $set: { 'demandesDeProlongation.$.statut': 'validee' },
            },
            { returnOriginal: false, new: true },
          );
        if (miseEnRelationUpdated.modifiedCount === 0) {
          res.status(404).json({
            message: "Une erreur s'est produite lors de la validation",
          });
          return;
        }
        res.status(200).json({ miseEnRelationUpdated });
        return;
      }
      if (
        miseEnRelationVerif?.statut !== 'renouvellement_initiee' &&
        !miseEnRelationVerif?.miseEnRelationConventionnement
      ) {
        res.status(404).json({
          message: 'Le renouvellement est impossible pour ce contrat',
        });
        return;
      }
      const miseEnRelationProchainTerminee = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: miseEnRelationVerif.miseEnRelationConventionnement });
      if (
        !['finalisee', 'nouvelle_rupture'].includes(
          miseEnRelationProchainTerminee?.statut,
        ) ||
        !miseEnRelationProchainTerminee
      ) {
        res.status(404).json({
          message: 'Le renouvellement est impossible pour ce contrat.',
        });
        return;
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idMiseEnRelation),
          },
          {
            $set: {
              statut: 'finalisee',
              banniereValidationRenouvellement: true,
              ...(miseEnRelationProchainTerminee?.contratCoordinateur && {
                contratCoordinateur: true,
                banniereAjoutRoleCoordinateur:
                  miseEnRelationProchainTerminee?.banniereAjoutRoleCoordinateur ===
                  true,
              }),
            },
          },
          { returnOriginal: false, includeResultMetadata: true },
        );
      if (miseEnRelationUpdated.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "La mise en relation n'a pas été mise à jour",
        });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: miseEnRelationVerif.miseEnRelationConventionnement,
          },
          {
            $set: {
              statut: 'terminee',
            },
            $unset: {
              emetteurRupture: '',
              dateRupture: '',
              motifRupture: '',
              dossierIncompletRupture: '',
            },
          },
        );
      await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: miseEnRelationVerif.structure.oid,
            demandesCoordinateur: {
              $elemMatch: {
                statut: 'validee',
                miseEnRelationId:
                  miseEnRelationVerif.miseEnRelationConventionnement,
              },
            },
          },
          {
            $set: {
              'demandesCoordinateur.$.miseEnRelationId': new ObjectId(
                idMiseEnRelation,
              ),
            },
          },
        );
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'structure.$id': miseEnRelationVerif.structure.oid,
            'structureObj.demandesCoordinateur': {
              $elemMatch: {
                statut: 'validee',
                miseEnRelationId:
                  miseEnRelationVerif.miseEnRelationConventionnement,
              },
            },
          },
          {
            $set: {
              'structureObj.demandesCoordinateur.$.miseEnRelationId':
                new ObjectId(idMiseEnRelation),
            },
          },
        );
      res
        .status(200)
        .json({ miseEnRelationUpdated: miseEnRelationUpdated.value });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default validationRenouvellementContrat;
