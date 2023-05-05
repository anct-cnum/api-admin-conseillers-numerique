import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { getTypeDossierDemarcheSimplifiee } from '../../structures/repository/reconventionnement.repository';
import { StatutConventionnement } from '../../../ts/enum';

const getCandidatById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;
    const { idMiseEnRelation } = req.params;
    try {
      if (!ObjectId.isValid(idConseiller)) {
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
      if (idMiseEnRelation !== undefined) {
        const misesEnRelation = await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.read)
          .find({
            'conseiller.$id': conseiller._id,
            statut: { $in: ['finalisee', 'recrutee'] },
          });
        conseillerFormat.miseEnRelation = misesEnRelation.filter(
          (miseEnRelation) => String(miseEnRelation._id) === idMiseEnRelation,
        );
        if (!conseillerFormat?.miseEnRelation) {
          res.status(404).json({ message: 'Mise en relation non trouvée' });
          return;
        }
        const structure = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .findOne({
            _id: conseillerFormat.miseEnRelation[0]?.structureObj?._id,
          });
        const typeDossierDs = getTypeDossierDemarcheSimplifiee(
          structure?.insee?.entreprise?.forme_juridique,
        );
        if (typeDossierDs === null) {
          res.status(500).json({
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
        conseillerFormat.contrat = conseillerFormat.miseEnRelation;
      } else {
        conseillerFormat.miseEnRelation = await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.read)
          .find({
            'conseiller.$id': conseiller._id,
            statut: 'recrutee',
          });
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

export default getCandidatById;
