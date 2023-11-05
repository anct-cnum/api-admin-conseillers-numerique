import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { getTypeDossierDemarcheSimplifiee } from '../../structures/repository/reconventionnement.repository';
import {
  checkQuotaRecrutementCoordinateur,
  checkStructurePhase2,
} from '../../structures/repository/structures.repository';

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
        structure?.insee?.unite_legale?.forme_juridique?.libelle,
      );
      if (typeDossierDs === null) {
        res.status(404).json({
          message: 'Erreur lors de la récupération du type de la structure',
        });
        return;
      }
      const demandeCoordinateurValider = structure?.demandesCoordinateur
        ?.filter((demande) => demande.statut === 'validee')
        .pop();
      if (demandeCoordinateurValider) {
        if (conseillerFormat.miseEnRelation?.contratCoordinateur) {
          const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
            'demarche_simplifiee',
          );
          conseillerFormat.url = `https://www.demarches-simplifiees.fr/procedures/${demarcheSimplifiee.numero_demarche_recrutement_coordinateur}/dossiers/${demandeCoordinateurValider?.dossier?.numero}/messagerie`;
        } else {
          conseillerFormat.miseEnRelation.quotaCoordinateur =
            await checkQuotaRecrutementCoordinateur(app, structure);
        }
      } else if (
        checkStructurePhase2(structure?.conventionnement?.statut) &&
        !conseillerFormat.url
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
