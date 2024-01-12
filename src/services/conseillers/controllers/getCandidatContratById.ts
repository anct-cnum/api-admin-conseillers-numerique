import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { ITypeDossierDS } from '../../../ts/interfaces/json.interface';
import {
  getTypeDossierDemarcheSimplifiee,
  getUrlDossierDSAdmin,
} from '../../structures/repository/demarchesSimplifiees.repository';

const getCandidatContratById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { idMiseEnRelation, idConseiller } = req.params;
    try {
      if (
        !ObjectId.isValid(idConseiller) ||
        !ObjectId.isValid(idMiseEnRelation)
      ) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const conseiller = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idConseiller) });

      if (!conseiller) {
        res.status(404).json({ message: 'Conseiller non trouvé' });
        return;
      }

      const possedeCompteCandidat = await app
        .service(service.users)
        .Model.countDocuments({
          'entity.$id': new ObjectId(idConseiller),
          roles: { $in: ['candidat'] },
        });
      const conseillerFormat = conseiller.toObject();
      conseillerFormat.possedeCompteCandidat = possedeCompteCandidat > 0;
      conseillerFormat.miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idMiseEnRelation) });
      if (!conseillerFormat.miseEnRelation) {
        res.status(404).json({ message: 'Mise en relation non trouvée' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: conseillerFormat.miseEnRelation?.structureObj?._id,
        });
      const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
        'demarche_simplifiee',
      );
      const typeDossierDS: ITypeDossierDS | undefined =
        getTypeDossierDemarcheSimplifiee(
          structure?.insee?.unite_legale?.forme_juridique?.libelle,
          demarcheSimplifiee,
        );
      if (typeDossierDS === null) {
        res.status(500).json({
          message: 'Erreur lors de la récupération du type de la structure',
        });
        return;
      }
      conseillerFormat.url = getUrlDossierDSAdmin(
        app,
        structure,
        conseillerFormat.miseEnRelation?.contratCoordinateur,
        conseillerFormat.miseEnRelation?._id?.toString(),
        typeDossierDS,
      );

      res.status(200).json(conseillerFormat);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getCandidatContratById;
