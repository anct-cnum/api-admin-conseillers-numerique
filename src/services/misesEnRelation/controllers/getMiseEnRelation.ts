import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { getCoselec } from '../../../utils';
import {
  getTypeDossierDemarcheSimplifiee,
  getUrlDossierConventionnement,
  getUrlDossierReconventionnement,
} from '../../structures/repository/reconventionnement.repository';
import {
  IDemandesCoordinateur,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import {
  checkQuotaRecrutementCoordinateur,
  checkStructurePhase2,
} from '../../structures/repository/structures.repository';

interface IStructuresCoordinateur extends IStructures {
  posteCoordinateur: IDemandesCoordinateur | undefined;
}

const getUrlDossierDepotPiece = (
  structure: IStructuresCoordinateur,
  demarcheSimplifiee: IConfigurationDemarcheSimplifiee,
) => {
  const typeStructure = getTypeDossierDemarcheSimplifiee(
    structure?.insee?.unite_legale?.forme_juridique?.libelle,
  );
  if (structure?.posteCoordinateur) {
    return `https://www.demarches-simplifiees.fr/dossiers/${structure.posteCoordinateur?.dossier?.numero}/messagerie`;
  }
  if (checkStructurePhase2(structure?.conventionnement?.statut)) {
    return structure?.conventionnement?.dossierReconventionnement?.numero
      ? `https://www.demarches-simplifiees.fr/dossiers/${structure?.conventionnement?.dossierReconventionnement?.numero}/messagerie`
      : getUrlDossierReconventionnement(
          structure.idPG,
          typeStructure?.type,
          demarcheSimplifiee,
        );
  }
  return structure?.conventionnement?.dossierConventionnement?.numero
    ? `https://www.demarches-simplifiees.fr/dossiers/${structure?.conventionnement?.dossierConventionnement?.numero}/messagerie`
    : getUrlDossierConventionnement(
        structure.idPG,
        typeStructure?.type,
        demarcheSimplifiee,
      );
};

const getMiseEnRelation =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idMiseEnRelation = req.params.id;
    const demarcheSimplifiee = app.get('demarche_simplifiee');
    let quotaCoordinateur = false;
    try {
      if (!ObjectId.isValid(idMiseEnRelation)) {
        return res.status(400).json({ message: 'Id incorrect' });
      }
      const structure: IStructuresCoordinateur = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();

      if (!structure) {
        return res.status(404).json({ message: "La structure n'existe pas" });
      }
      // Attention : pas d'access control car tout le monde peut voir tous les candidats
      const candidat = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              _id: new ObjectId(idMiseEnRelation),
              'structure.$id': structure._id,
            },
          },
          {
            $lookup: {
              localField: 'conseillerObj._id',
              from: 'conseillers',
              foreignField: '_id',
              as: 'conseiller',
            },
          },
          { $unwind: '$conseiller' },
          {
            $project: {
              statut: 1,
              dateRupture: 1,
              motifRupture: 1,
              dateDebutDeContrat: 1,
              dateFinDeContrat: 1,
              salaire: 1,
              typeDeContrat: 1,
              contratCoordinateur: 1,
              estDiplomeMedNum: '$conseiller.estDiplomeMedNum',
              prenom: '$conseiller.prenom',
              nom: '$conseiller.nom',
              sexe: '$conseiller.sexe',
              dateDeNaissance: '$conseiller.dateDeNaissance',
              email: '$conseiller.email',
              telephone: '$conseiller.telephone',
              nomCommune: '$conseiller.nomCommune',
              estEnEmploi: '$conseiller.estEnEmploi',
              dateDisponibilite: '$conseiller.dateDisponibilite',
              distanceMax: '$conseiller.distanceMax',
              codePostal: '$conseiller.codePostal',
              nomDiplomeMedNum: '$conseiller.nomDiplomeMedNum',
              aUneExperienceMedNum: '$conseiller.aUneExperienceMedNum',
              statutCandidat: '$conseiller.statut',
              pix: '$conseiller.pix',
              cv: '$conseiller.cv',
              idConseiller: '$conseiller._id',
              idPG: '$conseiller.idPG',
            },
          },
        ]);

      if (candidat.length === 0) {
        return res.status(404).json({ message: 'Candidat non trouvé' });
      }
      const posteCoordinateur = structure?.demandesCoordinateur
        ?.filter((demande) => demande.statut === 'validee')
        .pop();
      if (posteCoordinateur) {
        if (candidat[0]?.contratCoordinateur) {
          Object.assign(structure, {
            posteCoordinateur,
          });
          quotaCoordinateur = true;
        } else {
          quotaCoordinateur = await checkQuotaRecrutementCoordinateur(
            app,
            structure,
          );
        }
      }
      const candidatFormat = {
        ...candidat[0],
        miseEnRelation: {
          _id: candidat[0]._id,
          statut: candidat[0].statut,
          dateRupture: candidat[0].dateRupture,
          motifRupture: candidat[0].motifRupture,
          dateDebutDeContrat: candidat[0]?.dateDebutDeContrat,
          dateFinDeContrat: candidat[0]?.dateFinDeContrat,
          salaire: candidat[0]?.salaire,
          typeDeContrat: candidat[0]?.typeDeContrat,
          contratCoordinateur: candidat[0]?.contratCoordinateur,
          quotaCoordinateur,
        },
        _id: candidat[0].idConseiller,
        coselec: getCoselec(structure),
        urlDossierDS: getUrlDossierDepotPiece(structure, demarcheSimplifiee),
      };
      delete candidatFormat.idConseiller;
      delete candidatFormat.statut;
      delete candidatFormat.dateRupture;
      delete candidatFormat.motifRupture;
      delete candidatFormat.dateDebutDeContrat;
      delete candidatFormat.dateFinDeContrat;
      delete candidatFormat.salaire;
      delete candidatFormat.typeDeContrat;
      delete candidatFormat.contratCoordinateur;
      return res.status(200).json(candidatFormat);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getMiseEnRelation;
