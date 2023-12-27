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

interface IObjetMiseEnRelation {
  conseiller: DBRef;
  structure: DBRef;
  statut: string;
  createdAt: Date;
  conseillerCreatedAt: Date;
  conseillerObj: IConseillers;
  structureObj: IStructures;
  phaseConventionnement?: string;
}

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
      const objMiseEnRelation: IObjetMiseEnRelation = {
        conseiller: new DBRef('conseillers', conseiller._id, database),
        structure: new DBRef('structures', structure._id, database),
        statut: 'interessee',
        createdAt: new Date(),
        conseillerCreatedAt: conseiller.createdAt,
        conseillerObj: conseiller,
        structureObj: structure,
      };
      if (checkStructurePhase2(structure?.conventionnement?.statut)) {
        objMiseEnRelation.phaseConventionnement = PhaseConventionnement.PHASE_2;
      }

      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .create(objMiseEnRelation);
      const { quotaCoordinateurDisponible } =
        await checkQuotaRecrutementCoordinateur(
          app,
          req,
          structure,
          miseEnRelation._id,
        );
      miseEnRelation.quotaCoordinateur = quotaCoordinateurDisponible > 0;
      res.status(200).json(miseEnRelation);
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
