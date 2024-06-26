import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestStructures } from '../repository/structures.repository';
import { checkAccessReadRequestMisesEnRelation } from '../../misesEnRelation/misesEnRelation.repository';
import { getCoselec, getCoselecConventionnement } from '../../../utils';
import { getTypeDossierDemarcheSimplifiee } from '../repository/demarchesSimplifiees.repository';
import { ITypeDossierDS } from '../../../ts/interfaces/json.interface';
import { action } from '../../../helpers/accessControl/accessList';

const getDetailStructureWithConseillers =
  (app: Application, checkAccessStructure) => async (idStructure: string) =>
    app.service(service.structures).Model.aggregate([
      {
        $match: {
          _id: new ObjectId(idStructure),
          $and: [checkAccessStructure],
        },
      },
      {
        $lookup: {
          from: 'conseillers',
          let: { idStructure: '$_id' },
          as: 'conseillers',
          pipeline: [
            {
              $match: {
                $or: [
                  {
                    $and: [
                      {
                        $expr: { $eq: ['$$idStructure', '$structureId'] },
                      },
                      {
                        $expr: {
                          $eq: ['RECRUTE', '$statut'],
                        },
                      },
                    ],
                  },
                  {
                    $and: [
                      { ruptures: { $exists: true } },
                      {
                        $expr: {
                          $in: ['$$idStructure', '$ruptures.structureId'],
                        },
                      },
                    ],
                  },
                ],
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'structures',
          localField: 'demandesCoselec.prefet.idStructureTransfert',
          foreignField: '_id',
          as: 'structureTransfert',
        },
      },
      {
        $unwind: {
          path: '$structureTransfert',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          idPG: 1,
          nom: 1,
          coselec: 1,
          statut: 1,
          contact: 1,
          conventionnement: 1,
          demandesCoselec: 1,
          nombreConseillersSouhaites: 1,
          insee: 1,
          conseillers: '$conseillers',
          createdAt: 1,
          'structureTransfert.idPG': 1,
          'structureTransfert.nom': 1,
          prefet: { $arrayElemAt: ['$prefet', -1] },
        },
      },
    ]);

const miseEnRelationConseillerStructure =
  (app: Application, checkAccessMiseEnRelation) =>
  async (idStructure: string, idsConseiller: ObjectId[]) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          'structure.$id': new ObjectId(idStructure),
          'conseiller.$id': { $in: idsConseiller },
          $and: [checkAccessMiseEnRelation],
        },
      },
      {
        $sort: { dateDebutDeContrat: -1 },
      },
      {
        $project: {
          dateRecrutement: 1,
          statut: 1,
          dateRupture: 1,
          'conseillerObj.idPG': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.prenom': 1,
          'conseillerObj._id': 1,
          reconventionnement: 1,
          phaseConventionnement: 1,
          dateFinDeContrat: 1,
          dateDebutDeContrat: 1,
          typeDeContrat: 1,
          miseEnRelationConventionnement: 1,
          miseEnRelationReconventionnement: 1,
        },
      },
    ]);

const getDetailDossierConvention =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const checkAccessStructures = await checkAccessReadRequestStructures(
        app,
        req,
      );
      const structure = await getDetailStructureWithConseillers(
        app,
        checkAccessStructures,
      )(idStructure as string);
      if (structure.length === 0) {
        res.status(404).json({
          message: "La structure n'existe pas",
        });
        return;
      }
      if (structure[0]?.prefet?.idStructureTransfert) {
        const structureTransfert = await app
          .service(service.structures)
          .Model.accessibleBy(req.ability, action.read)
          .findOne({
            _id: structure[0]?.prefet?.idStructureTransfert,
          });
        if (!structureTransfert) {
          throw new Error(
            `La structure ${structure[0]?.prefet?.idStructureTransfert} n'existe pas lié à la structure ${idStructure}`,
          );
        }
        structure[0].prefet.structureTransfert = structureTransfert;
      }
      if (structure[0]?.insee?.unite_legale?.forme_juridique?.libelle) {
        const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
          'demarche_simplifiee',
        );
        const typeDossierDs: ITypeDossierDS = getTypeDossierDemarcheSimplifiee(
          structure[0]?.insee?.unite_legale?.forme_juridique?.libelle,
          demarcheSimplifiee,
        );
        if (typeDossierDs === null) {
          res.status(500).json({
            message: 'Erreur lors de la récupération du type de la structure',
          });
          return;
        }

        if (structure[0]?.conventionnement?.dossierReconventionnement?.numero) {
          const checkAccessMiseEnRelation =
            await checkAccessReadRequestMisesEnRelation(app, req);
          structure[0].conseillers = await miseEnRelationConseillerStructure(
            app,
            checkAccessMiseEnRelation,
          )(
            idStructure,
            structure[0]?.conseillers?.map((conseiller) => conseiller._id),
          );
          structure[0].url = `https://www.demarches-simplifiees.fr/procedures/${typeDossierDs?.numero_demarche_reconventionnement}/dossiers/${structure[0]?.conventionnement?.dossierReconventionnement?.numero}`;
          structure[0].conseillers = await Promise.all(
            structure[0].conseillers?.map(async (conseiller) => {
              const item = conseiller;
              item.idPG = item.conseillerObj?.idPG;
              item.nom = item.conseillerObj?.nom;
              item.prenom = item.conseillerObj?.prenom;
              item._id = item.conseillerObj?._id;
              item.statutMiseEnrelation = item.statut;

              return item;
            }),
          );
          structure[0].conseillersRecruterConventionnement =
            structure[0]?.conseillers?.filter(
              (conseiller) =>
                !conseiller?.phaseConventionnement &&
                (conseiller.statut === 'finalisee' ||
                  conseiller.statut === 'nouvelle_rupture' ||
                  conseiller.statut === 'terminee'),
            );
          structure[0].conseillersRenouveller = structure[0]?.conseillers
            ?.filter(
              (conseiller) =>
                conseiller.reconventionnement === true ||
                conseiller.miseEnRelationConventionnement ||
                conseiller.miseEnRelationReconventionnement,
            )
            .filter(
              (conseiller, index, conseillers) =>
                index ===
                conseillers.findIndex(
                  (element) => element.idPG === conseiller.idPG,
                ),
            );
        } else if (
          structure[0]?.conventionnement?.dossierConventionnement?.numero
        ) {
          structure[0].url = `https://www.demarches-simplifiees.fr/procedures/${typeDossierDs?.numero_demarche_conventionnement}/dossiers/${structure[0]?.conventionnement?.dossierConventionnement?.numero}`;
        }
      }
      structure[0].nombreConseillersCoselec =
        getCoselec(structure[0])?.nombreConseillersCoselec ?? 0;
      structure[0].nombreConseillersCoselecConventionnement =
        getCoselecConventionnement(structure[0])?.nombreConseillersCoselec ?? 0;
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

export default getDetailDossierConvention;
