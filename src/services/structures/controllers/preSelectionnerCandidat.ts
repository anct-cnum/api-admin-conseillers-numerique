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
import {
  PhaseConventionnement,
  StatutConventionnement,
} from '../../../ts/enum';

interface IObjetMiseEnRelation {
  conseiller: DBRef;
  structure: DBRef;
  statut: string;
  type: string;
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
        type: 'MANUEL',
        createdAt: new Date(),
        conseillerCreatedAt: conseiller.createdAt,
        conseillerObj: conseiller,
        structureObj: structure,
      };
      if (
        structure?.conventionnement?.statut ===
        StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
      ) {
        objMiseEnRelation.phaseConventionnement = PhaseConventionnement.PHASE_2;
      }

      await app.service(service.misesEnRelation).create(objMiseEnRelation);

      res.status(201).send({
        message: `vous avez présélectionné le candidat ${conseiller.nom} ${conseiller.prenom}`,
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

export default preSelectionnerCandidat;
