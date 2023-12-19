import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { checkQuotaRecrutementCoordinateur } from '../../conseillers/repository/coordinateurs.repository';

const annulationRecrutementContrat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idMiseEnRelation = req.params.id;
    const { banniereRefusRecrutement } = req.body;
    try {
      if (!ObjectId.isValid(idMiseEnRelation)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      if (typeof banniereRefusRecrutement !== 'boolean') {
        res.status(400).json({ message: 'banniereRefusRecrutement manquant' });
        return;
      }
      const miseEnRelation: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(idMiseEnRelation),
          statut: 'recrutee',
        });
      if (!miseEnRelation) {
        res.status(404).json({ message: "La mise en relation n'existe pas" });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: miseEnRelation.structure.oid,
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      if (miseEnRelation?.contratCoordinateur) {
        const structureUpdated = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            {
              _id: miseEnRelation.structure.oid,
              demandesCoordinateur: {
                $elemMatch: {
                  miseEnRelationId: miseEnRelation._id,
                },
              },
            },
            {
              $unset: {
                'demandesCoordinateur.$.miseEnRelationId': '',
              },
            },
          );
        if (structureUpdated.modifiedCount === 0) {
          res.status(404).json({
            message: "la structure n'a pas pu être mise à jour",
          });
          return;
        }
        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany(
            {
              'structure.$id': miseEnRelation.structure.oid,
              'structureObj.demandesCoordinateur': {
                $elemMatch: {
                  miseEnRelationId: miseEnRelation._id,
                },
              },
            },
            {
              $unset: {
                'structureObj.demandesCoordinateur.$.miseEnRelationId': '',
              },
            },
          );
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idMiseEnRelation),
            statut: 'recrutee',
          },
          {
            $set: {
              statut: 'interessee',
              ...(banniereRefusRecrutement === true && {
                banniereRefusRecrutement,
              }),
            },
            $unset: {
              dateDebutDeContrat: '',
              dateFinDeContrat: '',
              typeDeContrat: '',
              salaire: '',
              contratCoordinateur: '',
              emetteurRecrutement: '',
              dateRecrutement: '',
            },
          },
          {
            returnOriginal: false,
            rawResult: true,
          },
        );
      if (miseEnRelationUpdated.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "La mise en relation n'a pas été mise à jour",
        });
        return;
      }
      const miseEnRelationFormat = miseEnRelationUpdated.value.toObject();
      const { quotaCoordinateurDisponible } =
        await checkQuotaRecrutementCoordinateur(
          app,
          req,
          structure,
          miseEnRelation._id,
        );
      miseEnRelationFormat.quotaCoordinateur = quotaCoordinateurDisponible > 0;
      res.status(200).json({ miseEnRelation: miseEnRelationFormat });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default annulationRecrutementContrat;
