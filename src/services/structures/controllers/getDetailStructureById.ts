import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestStructures,
  formatAdresseStructure,
  formatQpv,
  formatZrr,
  formatType,
  getConseillersRecruter,
  getConseillersValider,
} from '../repository/structures.repository';
import {
  checkAccessRequestCras,
  getNombreAccompagnementsByArrayConseillerId,
  getNombreCrasByArrayConseillerId,
} from '../../cras/cras.repository';
import {
  getUrlDossierConventionnement,
  getUrlDossierReconventionnement,
  getTypeDossierDemarcheSimplifiee,
} from '../repository/reconventionnement.repository';
import { getCoselec, getCoselecConventionnement } from '../../../utils';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import { StatutConventionnement } from '../../../ts/enum';

const getDetailStructureById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const demarcheSimplifiee = app.get('demarche_simplifiee');
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const findStructure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idStructure) });

      if (!findStructure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
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
            conseillers: '$misesEnRelation',
            conventionnement: 1,
            demandesCoselec: 1,
            lastDemandeCoselec: { $arrayElemAt: ['$demandesCoselec', -1] },
          },
        },
      ]);
      if (structure.length === 0) {
        res.status(404).json({ message: 'Structure non trouvée' });
        return;
      }

      const users = await app.service(service.users).Model.aggregate([
        {
          $match: {
            'entity.$id': new ObjectId(idStructure),
          },
        },
        { $project: { name: 1, roles: 1, passwordCreated: 1 } },
      ]);
      const typeStructure = getTypeDossierDemarcheSimplifiee(
        structure[0]?.insee?.unite_legale?.forme_juridique?.libelle,
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
      structure[0].urlDossierReconventionnement =
        getUrlDossierReconventionnement(
          structure[0].idPG,
          typeStructure?.type,
          demarcheSimplifiee,
        );
      if (
        structure[0]?.conventionnement?.statut ===
        StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
      ) {
        structure[0].urlDossierReconventionnementMessagerie = `https://www.demarches-simplifiees.fr/dossiers/${structure[0]?.conventionnement?.dossierReconventionnement?.numero}/messagerie`;
      }
      structure[0].conseillers = structure[0].conseillers?.map((conseiller) => {
        return {
          idPG: conseiller?.conseillerObj?.idPG,
          nom: conseiller?.conseillerObj?.nom,
          prenom: conseiller?.conseillerObj?.prenom,
          _id: conseiller?.conseillerObj?._id,
          statut: conseiller?.statut,
          phaseConventionnement: conseiller?.phaseConventionnement,
        };
      });
      Object.assign(
        structure[0],
        getConseillersValider(structure[0].conseillers),
        getConseillersRecruter(structure[0].conseillers),
      );
      const checkAccessCras = await checkAccessRequestCras(app, req);

      const craCount = await getNombreCrasByArrayConseillerId(
        app,
        req,
      )(structure[0].conseillers?.map((conseiller) => conseiller._id));
      const accompagnementsCount =
        await getNombreAccompagnementsByArrayConseillerId(
          app,
          checkAccessCras,
        )(structure[0].conseillers?.map((conseiller) => conseiller._id));
      structure[0].craCount = craCount;
      structure[0].accompagnementCount = accompagnementsCount[0]?.total;
      delete structure[0].conseillers;

      if (structure.length === 0) {
        res.status(404).json({ message: 'Structure non trouvée' });
        return;
      }
      res.status(200).json(structure[0]);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDetailStructureById;
