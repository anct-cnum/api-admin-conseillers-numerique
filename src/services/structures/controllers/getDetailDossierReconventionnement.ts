import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestStructures } from '../repository/structures.repository';
import { getTypeDossierReconventionnement } from '../repository/reconventionnement.repository';
import TypeDossierReconventionnement from '../../../ts/enum';
import { checkAccessReadRequestMisesEnRelation } from '../../misesEnRelation/misesEnRelation.repository';
import { getCoselec } from '../../../utils';

const getUrlDossierReconventionnement = (
  idPG: number,
  type: string,
  demarcheSimplifiee: {
    url_association_reconventionnement: string;
    url_entreprise_reconventionnement: string;
    url_structure_publique_reconventionnement: string;
  },
) => {
  switch (type) {
    case TypeDossierReconventionnement.Association:
      return `${demarcheSimplifiee.url_association_reconventionnement}${idPG}`;
    case TypeDossierReconventionnement.Entreprise:
      return `${demarcheSimplifiee.url_entreprise_reconventionnement}${idPG}`;
    case TypeDossierReconventionnement.StructurePublique:
      return `${demarcheSimplifiee.url_structure_publique_reconventionnement}${idPG}`;
    default:
      return '';
  }
};

const getUrlDossierConventionnement = (
  type: string,
  demarcheSimplifiee: {
    url_association_conventionnement: string;
    url_entreprise_conventionnement: string;
    url_structure_publique_conventionnement: string;
  },
) => {
  switch (type) {
    case TypeDossierReconventionnement.Association:
      return demarcheSimplifiee.url_association_conventionnement;
    case TypeDossierReconventionnement.Entreprise:
      return demarcheSimplifiee.url_entreprise_conventionnement;
    case TypeDossierReconventionnement.StructurePublique:
      return demarcheSimplifiee.url_structure_publique_conventionnement;
    default:
      return '';
  }
};

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
                      {
                        $expr: { $eq: ['$$idStructure', '$structureId'] },
                      },
                      {
                        $expr: {
                          $eq: ['RUPTURE', '$statut'],
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
        $project: {
          idPG: 1,
          nom: 1,
          coselec: 1,
          contact: 1,
          dossierDemarcheSimplifiee: 1,
          nombreConseillersSouhaites: 1,
          'insee.entreprise.forme_juridique': 1,
          conseillers: '$conseillers',
        },
      },
    ]);

const miseEnRelationConseillerStructure =
  (app: Application, checkAccessMiseEnRelation) =>
  async (idStructure: string, idConseiller: string[]) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          'structure.$id': new ObjectId(idStructure),
          'conseiller.$id': { $in: idConseiller },
          $and: [checkAccessMiseEnRelation],
        },
      },
      {
        $project: {
          dateRecrutement: 1,
          statut: 1,
          dateRupture: 1,
          'conseillerObj.idPG': 1,
          'conseillerObj.nom': 1,
          'conseillerObj.prenom': 1,
        },
      },
    ]);

const getDetailDossierReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const demarcheSimplifiee = app.get('demarche_simplifiee');
    const idStructure = req.params.id;
    try {
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
      const typeDossierReconventionnement = getTypeDossierReconventionnement(
        structure[0].insee.entreprise.forme_juridique,
      );
      if (typeDossierReconventionnement === null) {
        res.status(500).json({
          message:
            "Erreur lors de la récupération de l'url du dossier de reconventionnement",
        });
        return;
      }

      if (structure[0].conseillers.length > 0) {
        const checkAccessMiseEnRelation =
          await checkAccessReadRequestMisesEnRelation(app, req);
        structure[0].conseillers = await miseEnRelationConseillerStructure(
          app,
          checkAccessMiseEnRelation,
        )(
          idStructure,
          structure[0].conseillers.map((conseiller) => conseiller._id),
        );
        structure[0].type = 'reconventionnement';
        structure[0].nombreConseillersCoselec = getCoselec(
          structure[0],
        ).nombreConseillersCoselec;
        structure[0].url = getUrlDossierReconventionnement(
          structure.idPG,
          typeDossierReconventionnement.type,
          demarcheSimplifiee,
        );
        structure[0].conseillers = await Promise.all(
          structure[0].conseillers.map(async (conseiller) => {
            const item = { ...conseiller };
            item.idPG = item.conseillerObj?.idPG;
            item.nom = item.conseillerObj?.nom;
            item.prenom = item.conseillerObj?.prenom;
            item.statutMiseEnrelation = item.statut;

            return item;
          }),
        );
      } else {
        structure[0].type = 'conventionnement';
        structure[0].url = getUrlDossierConventionnement(
          typeDossierReconventionnement.type,
          demarcheSimplifiee,
        );
      }

      res.status(200).json(structure[0]);
      return;
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDetailDossierReconventionnement;
