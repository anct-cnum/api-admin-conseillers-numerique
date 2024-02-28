import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestStructures,
  formatAdresseStructure,
  formatQpv,
  formatZrr,
  formatType,
  checkStructurePhase2,
  getConseillersByStatus,
} from '../repository/structures.repository';
import {
  checkAccessRequestCras,
  getNombreAccompagnementsByStructureId,
  getNombreCrasByStructureId,
} from '../../cras/cras.repository';
import { getCoselec, getCoselecConventionnement } from '../../../utils';
import {
  IMisesEnRelation,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import { PhaseConventionnement } from '../../../ts/enum';
import {
  getTypeDossierDemarcheSimplifiee,
  getUrlDossierConventionnement,
  getUrlDossierReconventionnement,
} from '../repository/demarchesSimplifiees.repository';

type IConseiller = {
  idPG: number;
  nom: string;
  prenom: string;
  _id: string;
  statut: string;
  phaseConventionnement: string;
  reconventionnement: boolean;
  typeDeContrat: string;
};

const getDetailStructureById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
      'demarche_simplifiee',
    );
    try {
      if (!ObjectId.isValid(idStructure)) {
        return res.status(400).json({ message: 'Id incorrect' });
      }
      const findStructure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idStructure) });

      if (!findStructure) {
        return res.status(404).json({ message: "La structure n'existe pas" });
      }
      const checkAccessStructure = await checkAccessReadRequestStructures(
        app,
        req,
      );
      const structure = await app.service(service.structures).Model.aggregate([
        {
          $match: {
            _id: new ObjectId(idStructure),
            $and: [checkAccessStructure],
          },
        },
        {
          $lookup: {
            from: 'misesEnRelation',
            let: {
              idStructure: '$_id',
            },
            as: 'misesEnRelation',
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: ['$$idStructure', '$structureObj._id'],
                      },
                    },
                    {
                      $expr: {
                        $or: [
                          { $eq: ['finalisee', '$statut'] },
                          { $eq: ['nouvelle_rupture', '$statut'] },
                          { $eq: ['recrutee', '$statut'] },
                          { $eq: ['terminee', '$statut'] },
                          { $eq: ['terminee_naturelle', '$statut'] },
                          { $eq: ['finalisee_rupture', '$statut'] },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                $project: {
                  _id: 0,
                  statut: 1,
                  phaseConventionnement: 1,
                  reconventionnement: 1,
                  typeDeContrat: 1,
                  'conseillerObj.idPG': 1,
                  'conseillerObj.nom': 1,
                  'conseillerObj._id': 1,
                  'conseillerObj.prenom': 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            idPG: 1,
            nom: 1,
            qpvStatut: 1,
            estZRR: 1,
            statut: 1,
            insee: 1,
            type: 1,
            siret: 1,
            codePostal: 1,
            createdAt: 1,
            coselec: 1,
            contact: 1,
            misesEnRelations: '$misesEnRelation',
            conventionnement: 1,
            demandesCoselec: 1,
            lastDemandeCoselec: { $arrayElemAt: ['$demandesCoselec', -1] },
            demandesCoordinateur: 1,
          },
        },
      ]);
      if (structure.length === 0) {
        return res.status(404).json({ message: 'Structure non trouvée' });
      }

      const users = await app.service(service.users).Model.aggregate([
        {
          $match: {
            'entity.$id': new ObjectId(idStructure),
          },
        },
        { $project: { name: 1, roles: 1, sub: 1 } },
      ]);
      users.map((user) => {
        const item = user;
        if (user?.sub) {
          item.sub = 'xxxxxxxx';
        }

        return item;
      });
      const typeStructure = getTypeDossierDemarcheSimplifiee(
        structure[0]?.insee?.unite_legale?.forme_juridique?.libelle,
        demarcheSimplifiee,
      );
      const coselec = getCoselec(structure[0]);
      const coselecConventionnement = getCoselecConventionnement(structure[0]);
      structure[0].posteValiderCoselec = coselec?.nombreConseillersCoselec;
      structure[0].posteValiderCoselecConventionnement =
        coselecConventionnement?.nombreConseillersCoselec;
      structure[0].qpvStatut = formatQpv(structure[0].qpvStatut);
      structure[0].estZRR = formatZrr(structure[0].estZRR);
      structure[0].type = formatType(structure[0].type);
      structure[0].adresseFormat = formatAdresseStructure(structure[0].insee);
      structure[0].users = users;
      structure[0].urlDossierConventionnement = getUrlDossierConventionnement(
        structure[0].idPG,
        typeStructure?.type,
        demarcheSimplifiee,
      );
      if (structure[0]?.conventionnement?.dossierConventionnement?.numero) {
        structure[0].urlDossierConventionnement = `https://www.demarches-simplifiees.fr/dossiers/${structure[0]?.conventionnement?.dossierConventionnement?.numero}`;
      } else {
        structure[0].urlDossierConventionnement = getUrlDossierConventionnement(
          structure[0].idPG,
          typeStructure?.type,
          demarcheSimplifiee,
        );
      }
      if (structure[0]?.conventionnement?.dossierReconventionnement?.numero) {
        structure[0].urlDossierReconventionnement = `https://www.demarches-simplifiees.fr/dossiers/${structure[0]?.conventionnement?.dossierReconventionnement?.numero}`;
      } else {
        structure[0].urlDossierReconventionnement =
          getUrlDossierReconventionnement(
            structure[0].idPG,
            typeStructure?.type,
            demarcheSimplifiee,
          );
      }
      if (checkStructurePhase2(structure[0]?.conventionnement?.statut)) {
        structure[0].urlDossierReconventionnementMessagerie = `https://www.demarches-simplifiees.fr/dossiers/${structure[0]?.conventionnement?.dossierReconventionnement?.numero}/messagerie`;
      }
      const conseillers: IConseiller[] = structure[0].misesEnRelations?.map(
        (miseEnRelation: IMisesEnRelation) => {
          return {
            idPG: miseEnRelation?.conseillerObj?.idPG,
            nom: miseEnRelation?.conseillerObj?.nom,
            prenom: miseEnRelation?.conseillerObj?.prenom,
            _id: miseEnRelation?.conseillerObj?._id,
            statut: miseEnRelation?.statut,
            phaseConventionnement: miseEnRelation?.phaseConventionnement,
            reconventionnement: miseEnRelation?.reconventionnement,
            typeDeContrat: miseEnRelation?.typeDeContrat,
          };
        },
      );
      delete structure[0].misesEnRelations;

      const conseillersValiderConventionnement = getConseillersByStatus(
        conseillers,
        ['recrutee'],
      );

      const conseillersValiderReconventionnement = getConseillersByStatus(
        conseillers,
        ['recrutee'],
        PhaseConventionnement.PHASE_2,
      );

      const conseillersFinaliseeRuptureReconventionnement =
        getConseillersByStatus(
          conseillers,
          ['finalisee_rupture'],
          PhaseConventionnement.PHASE_2,
        );
      const conseillersFinaliseeRuptureConventionnement =
        getConseillersByStatus(conseillers, ['finalisee_rupture']);

      const conseillersNouvelleRuptureReconventionnement =
        getConseillersByStatus(
          conseillers,
          ['nouvelle_rupture'],
          PhaseConventionnement.PHASE_2,
        );
      const conseillersNouvelleRuptureConventionnement = getConseillersByStatus(
        conseillers,
        ['nouvelle_rupture'],
      );

      const conseillersRecruterConventionnement = getConseillersByStatus(
        conseillers,
        ['finalisee', 'terminee'],
      );

      const getConseillersRecruterReconventionnement = getConseillersByStatus(
        conseillers,
        ['finalisee'],
        PhaseConventionnement.PHASE_2,
      );
      const getConseillersReconventionnementCDI = conseillers.filter(
        (conseiller: IConseiller) =>
          conseiller?.typeDeContrat === 'CDI' &&
          conseiller?.reconventionnement &&
          conseiller?.statut === 'finalisee',
      );

      const conseillersRecruterReconventionnement = [
        ...getConseillersReconventionnementCDI,
        ...getConseillersRecruterReconventionnement,
      ];

      Object.assign(structure[0], {
        conseillersValiderConventionnement,
        conseillersValiderReconventionnement,
        conseillersFinaliseeRuptureReconventionnement,
        conseillersFinaliseeRuptureConventionnement,
        conseillersNouvelleRuptureReconventionnement,
        conseillersNouvelleRuptureConventionnement,
        conseillersRecruterConventionnement,
        conseillersRecruterReconventionnement,
      });

      const checkAccessCras = await checkAccessRequestCras(app, req);

      const craCount = await getNombreCrasByStructureId(
        app,
        req,
      )(structure[0]._id);
      const accompagnementsCount = await getNombreAccompagnementsByStructureId(
        app,
        checkAccessCras,
      )(structure[0]._id);
      structure[0].craCount = craCount;
      structure[0].accompagnementCount = accompagnementsCount[0]?.total;

      if (structure.length === 0) {
        return res.status(404).json({ message: 'Structure non trouvée' });
      }
      return res.status(200).json(structure[0]);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDetailStructureById;
