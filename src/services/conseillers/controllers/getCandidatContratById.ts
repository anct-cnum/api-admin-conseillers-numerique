import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { getTypeDossierDemarcheSimplifiee } from '../../structures/repository/reconventionnement.repository';
import { StatutConventionnement } from '../../../ts/enum';

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
      const typeDossierDs = getTypeDossierDemarcheSimplifiee(
        structure?.insee?.entreprise?.forme_juridique,
      );
      if (typeDossierDs === null) {
        res.status(404).json({
          message: 'Erreur lors de la récupération du type de la structure',
        });
        return;
      }
      if (
        structure?.conventionnement?.statut ===
        StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
      ) {
        conseillerFormat.url = `https://www.demarches-simplifiees.fr/procedures/${typeDossierDs?.numero_demarche_reconventionnement}/dossiers/${structure?.conventionnement?.dossierReconventionnement?.numero}/messagerie`;
      } else {
        conseillerFormat.url = `https://www.demarches-simplifiees.fr/procedures/${typeDossierDs?.numero_demarche_conventionnement}/dossiers/${structure?.conventionnement?.dossierConventionnement?.numero}/messagerie`;
      }
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
