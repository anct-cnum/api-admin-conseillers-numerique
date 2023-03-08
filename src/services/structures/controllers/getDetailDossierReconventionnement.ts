import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestStructures } from '../repository/structures.repository';
import { getTypeDossierDemarcheSimplifiee } from '../repository/reconventionnement.repository';
import { checkAccessReadRequestMisesEnRelation } from '../../misesEnRelation/misesEnRelation.repository';
import { getCoselec } from '../../../utils';

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
          dossierReconventionnement: 1,
          dossierConventionnement: 1,
          statutConventionnement: 1,
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

      const typeDossierDs = getTypeDossierDemarcheSimplifiee(
        structure[0].insee.entreprise.forme_juridique,
      );
      if (typeDossierDs === null) {
        res.status(500).json({
          message: 'Erreur lors de la récupération du numéro de la démarche',
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
        structure[0].url = `https://www.demarches-simplifiees.fr/procedures/${typeDossierDs.numero_demarche_reconventionnement}/dossiers/${structure[0].dossierReconventionnement.numero}`;
        structure[0].nombreConseillersCoselec = getCoselec(
          structure[0],
        ).nombreConseillersCoselec;
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
        structure[0].url = `https://www.demarches-simplifiees.fr/procedures/${typeDossierDs.numero_demarche_conventionnement}/dossiers/${structure[0].dossierConventionnement.numero}`;
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
