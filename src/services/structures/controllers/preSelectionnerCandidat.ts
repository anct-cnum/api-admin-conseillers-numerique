import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { DBRef, ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import {
  IConseillers,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import { PhaseConventionnement } from '../../../ts/enum';
import { checkStructurePhase2 } from '../repository/structures.repository';
import { checkQuotaRecrutementCoordinateur } from '../../conseillers/repository/coordinateurs.repository';

const preSelectionnerCandidat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const conseiller: IConseillers = await app
        .service(service.conseillers)
        .Model.findOne({ _id: new ObjectId(idConseiller) });
      if (!conseiller) {
        res.status(404).json({ message: "Le conseiller n'existe pas" });
        return;
      }
      const miseEnRelationExist = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          'conseiller.$id': conseiller._id,
          'structure.$id': structure._id,
          statut: 'nouvelle',
        });
      const objMiseEnRelation = {
        statut: 'interessee',
      };
      if (checkStructurePhase2(structure?.conventionnement?.statut)) {
        Object.assign(objMiseEnRelation, {
          phaseConventionnement: PhaseConventionnement.PHASE_2,
        });
      }
      if (!miseEnRelationExist) {
        const canCreate = req.ability.can(
          action.create,
          ressource.misesEnRelation,
        );
        if (!canCreate) {
          res.status(403).json({
            message: `Accès refusé, vous n'êtes pas autorisé à présélectionner un candidat`,
          });
          return;
        }
        const connect = app.get('mongodb');
        const database = connect.substr(connect.lastIndexOf('/') + 1);
        Object.assign(objMiseEnRelation, {
          conseiller: new DBRef('conseillers', conseiller._id, database),
          structure: new DBRef('structures', structure._id, database),
          createdAt: new Date(),
          conseillerCreatedAt: conseiller.createdAt,
          conseillerObj: conseiller,
          structureObj: structure,
          type: 'MANUEL',
        });

        await app.service(service.misesEnRelation).create(objMiseEnRelation);
        res.status(200).json({
          success: true,
        });
        return;
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: miseEnRelationExist._id,
            statut: 'nouvelle',
          },
          {
            $set: objMiseEnRelation,
          },
          {
            returnOriginal: false,
            includeResultMetadata: true,
          },
        );
      if (miseEnRelationUpdated.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "La mise en relation n'a pas été mise à jour",
        });
        return;
      }
      const { quotaCoordinateurDisponible } =
        await checkQuotaRecrutementCoordinateur(
          app,
          req,
          structure,
          miseEnRelationUpdated.value._id,
        );
      const miseEnRelation = miseEnRelationUpdated.value.toObject();
      miseEnRelation.quotaCoordinateur = quotaCoordinateurDisponible > 0;
      res.status(200).json({ miseEnRelation });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default preSelectionnerCandidat;
