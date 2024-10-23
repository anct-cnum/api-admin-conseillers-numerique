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
import { checkQuotaRecrutementCoordinateur } from '../../conseillers/repository/coordinateurs.repository';
import { getUrlDossierDepotPieceDS } from '../../structures/repository/demarchesSimplifiees.repository';

const getMiseEnRelationConseiller =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idMiseEnRelation = req.params.id;
    const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
      'demarche_simplifiee',
    );
    try {
      if (!ObjectId.isValid(idMiseEnRelation)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();

      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
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
              dateDebutDeContrat: 1,
              dateFinDeContrat: 1,
              salaire: 1,
              typeDeContrat: 1,
              dateRupture: 1,
              motifRupture: 1,
              contratCoordinateur: 1,
              estDiplomeMedNum: '$conseiller.estDiplomeMedNum',
              prenom: '$conseiller.prenom',
              nom: '$conseiller.nom',
              email: '$conseiller.email',
              sexe: '$conseiller.sexe',
              dateDeNaissance: '$conseiller.dateDeNaissance',
              telephone: '$conseiller.telephone',
              nomCommune: '$conseiller.nomCommune',
              estEnEmploi: '$conseiller.estEnEmploi',
              telephonePro: '$conseiller.telephonePro',
              emailPro: '$conseiller.emailPro',
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
        res.status(404).json({ message: 'Candidat non trouvé' });
        return;
      }
      const { demandeCoordinateurValider, quotaCoordinateurDisponible } =
        await checkQuotaRecrutementCoordinateur(
          app,
          req,
          structure,
          candidat[0]._id,
        );
      const candidatFormat = {
        ...candidat[0],
        miseEnRelation: {
          _id: candidat[0]._id,
          statut: candidat[0].statut,
          dateRupture: candidat[0].dateRupture,
          motifRupture: candidat[0].motifRupture,
          dateDebutDeContrat: candidat[0].dateDebutDeContrat,
          dateFinDeContrat: candidat[0].dateFinDeContrat,
          salaire: candidat[0].salaire,
          typeDeContrat: candidat[0].typeDeContrat,
          contratCoordinateur: candidat[0]?.contratCoordinateur,
          quotaCoordinateur: quotaCoordinateurDisponible > 0,
        },
        _id: candidat[0].idConseiller,
        coselec: getCoselec(structure),
        urlDossierDS: getUrlDossierDepotPieceDS(
          demandeCoordinateurValider,
          candidat[0]?.contratCoordinateur,
          structure,
          demarcheSimplifiee,
        ),
      };
      delete candidatFormat.idConseiller;
      delete candidatFormat.statut;
      delete candidatFormat.dateRupture;
      delete candidatFormat.motifRupture;
      delete candidatFormat.dateDebutDeContrat;
      delete candidatFormat.dateFinDeContrat;
      delete candidatFormat.salaire;
      delete candidatFormat.typeDeContrat;

      candidatFormat.misesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.find({
          'conseiller.$id': candidatFormat._id,
          statut: {
            $in: ['finalisee', 'nouvelle_rupture', 'finalisee_rupture'],
          },
        });
      res.status(200).json(candidatFormat);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getMiseEnRelationConseiller;
