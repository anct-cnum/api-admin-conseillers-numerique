import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { GraphQLClient } from 'graphql-request';
import {
  IReconventionnementDS,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestStructures } from '../repository/structures.repository';
import {
  getTypeDossierReconventionnement,
  queryGetDossierReconventionnement,
} from '../repository/reconventionnement.repository';
import TypeDossierReconventionnement from '../../../ts/enum';

const getUrlDossierReconventionnement = (
  idPG: number,
  type: string,
  demarcheSimplifiee: {
    url_association: string;
    url_entreprise: string;
    url_structure_publique: string;
  },
) => {
  switch (type) {
    case TypeDossierReconventionnement.Association:
      return `${demarcheSimplifiee.url_association}${idPG}`;
    case TypeDossierReconventionnement.Entreprise:
      return `${demarcheSimplifiee.url_entreprise}${idPG}`;
    case TypeDossierReconventionnement.StructurePublique:
      return `${demarcheSimplifiee.url_structure_publique}${idPG}`;
    default:
      return '';
  }
};

const getDetailStructureWithConseillers =
  (app: Application, checkAccessStructure) => async (idStructure: number) =>
    app.service(service.structures).Model.aggregate([
      {
        $match: {
          idPG: idStructure,
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
                $expr: { $eq: ['$$idStructure', '$structureId'] },
              },
            },
            {
              $project: {
                nom: 1,
                prenom: 1,
                idPG: 1,
                datePrisePoste: 1,
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
          'insee.entreprise.forme_juridique': 1,
          conseillers: '$conseillers',
        },
      },
    ]);

const getDetailDossierReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const demarcheSimplifiee = app.get('demarche_simplifiee');
    const idDossier = req.params.id;
    try {
      const graphQLClient = new GraphQLClient(demarcheSimplifiee.endpoint, {
        headers: {
          authorization: `Bearer ${demarcheSimplifiee.token_api}`,
          'content-type': 'application/json',
        },
      });

      const dossier: any | Error = await graphQLClient
        .request(queryGetDossierReconventionnement, {
          dossierNumber: parseInt(idDossier, 10),
        })
        .catch(() => {
          return new Error("Le dossier n'existe pas");
        });
      if (dossier instanceof Error) {
        res.status(404).json({
          message: dossier.message,
        });
        return;
      }
      const reconventionnement: IReconventionnementDS = {};
      const checkAccessStructures = await checkAccessReadRequestStructures(
        app,
        req,
      );
      const structure = await getDetailStructureWithConseillers(
        app,
        checkAccessStructures,
      )(parseInt(dossier.dossier.champs[1]?.integerNumber, 10));
      if (structure.length === 0) {
        res.status(404).json({
          message: "La structure n'existe pas",
        });
        return;
      }
      reconventionnement.structure = {
        ...reconventionnement.structure,
        ...structure[0],
      };
      reconventionnement.idDossier = dossier.dossier.id;
      reconventionnement.statut = dossier.dossier.state;
      reconventionnement.numeroDossier = dossier.dossier.number;
      reconventionnement.dateDeCreation =
        dossier.dossier.datePassageEnConstruction;
      reconventionnement.nbPostesAttribuees = parseInt(
        dossier.dossier.champs[4]?.integerNumber,
        10,
      );
      reconventionnement.dateFinProchainContrat =
        dossier.dossier.champs[5]?.date;
      const typeDossierReconventionnement = getTypeDossierReconventionnement(
        reconventionnement.structure.insee.entreprise.forme_juridique,
      );
      if (typeDossierReconventionnement === null) {
        res.status(500).json({
          message:
            "Erreur lors de la récupération de l'url du dossier de reconventionnement",
        });
        return;
      }
      reconventionnement.url = getUrlDossierReconventionnement(
        reconventionnement.structure.idPG,
        typeDossierReconventionnement.type,
        demarcheSimplifiee,
      );

      res.status(200).json(reconventionnement);
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
