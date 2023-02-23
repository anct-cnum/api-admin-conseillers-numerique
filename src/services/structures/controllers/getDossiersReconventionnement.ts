import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { GraphQLClient } from 'graphql-request';
import { IDossierDS, IRequest } from '../../../ts/interfaces/global.interfaces';
import validReconventionnement from '../../../schemas/reconventionnement.schemas';
import {
  queryGetDemarcheReconventionnement,
  queryGetDemarcheReconventionnementWithoutAttributDossier,
} from '../repository/reconventionnement.repository';
import TypeDossierReconventionnement from '../../../ts/enum';
import { getNameStructure } from '../repository/structures.repository';

const categoriesCorrespondances = require('../../../../datas/categorieFormCorrespondances.json');

const getDemarcheNumber = (type: string) =>
  categoriesCorrespondances.find((categorie) => categorie.type === type)
    .demarche_number;

const requestGraphQLForGetDemarcheDS = (
  graphQLClient: GraphQLClient,
  limitDossier: number,
  paginationCursor: String,
  type: string,
) =>
  graphQLClient
    .request(queryGetDemarcheReconventionnement(limitDossier), {
      demarcheNumber: getDemarcheNumber(type),
      after: paginationCursor,
    })
    .catch(() => {
      return new Error("La démarche n'existe pas");
    });

const requestGraphQLForTotalDossiers = (
  graphQLClient: GraphQLClient,
  type: string,
) =>
  graphQLClient
    .request(queryGetDemarcheReconventionnementWithoutAttributDossier, {
      demarcheNumber: getDemarcheNumber(type),
    })
    .catch(() => {
      return new Error("La démarche n'existe pas");
    });

const createDossierReconventionnement =
  (app: Application, req: IRequest) => async (demarcheSimplifiee) =>
    Promise.all(
      demarcheSimplifiee.demarche.dossiers.nodes.map(async (dossier) => {
        const { champs, number, datePassageEnConstruction } = dossier;
        const item: IDossierDS = {
          _id: '',
          idPG: 0,
          dateDeCreation: undefined,
          dateFinProchainContrat: undefined,
          nbPostesAttribuees: 0,
          nomStructure: '',
          type: 'Reconventionnement',
        };
        item._id = number;
        item.dateDeCreation = datePassageEnConstruction;
        item.idPG = parseInt(champs[1]?.integerNumber, 10);
        item.nbPostesAttribuees = parseInt(champs[4]?.integerNumber, 10);
        item.dateFinProchainContrat = champs[5]?.date;
        const structure = await getNameStructure(app, req)(item.idPG);
        item.nomStructure = structure?.nom;

        return item;
      }),
    );

const getTotalDossiersReconventionnement = async (
  graphQLClient: GraphQLClient,
) => {
  const demarcheStructurePublique = await requestGraphQLForTotalDossiers(
    graphQLClient,
    TypeDossierReconventionnement.StructurePublique,
  );
  if (demarcheStructurePublique instanceof Error) {
    return demarcheStructurePublique;
  }
  const demarcheEntrepriseEss = await requestGraphQLForTotalDossiers(
    graphQLClient,
    TypeDossierReconventionnement.Entreprise,
  );
  if (demarcheEntrepriseEss instanceof Error) {
    return demarcheEntrepriseEss;
  }
  const demarcheAssociation = await requestGraphQLForTotalDossiers(
    graphQLClient,
    TypeDossierReconventionnement.Association,
  );
  if (demarcheAssociation instanceof Error) {
    return demarcheAssociation;
  }
  return [
    demarcheStructurePublique.demarche.dossiers.nodes.length,
    demarcheEntrepriseEss.demarche.dossiers.nodes.length,
    demarcheAssociation.demarche.dossiers.nodes.length,
  ];
};

const getDossiersReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const demarcheSimplifiee = app.get('demarche_simplifiee');
    const { page } = req.query;
    try {
      const pageValidation = validReconventionnement.validate(page);
      if (pageValidation.error) {
        res.status(400).json({ message: pageValidation.error.message });
        return;
      }
      const graphQLClient = new GraphQLClient(demarcheSimplifiee.endpoint, {
        headers: {
          authorization: `Bearer ${demarcheSimplifiee.token_api}`,
          'content-type': 'application/json',
        },
      });

      const items: {
        total: number;
        data: object;
        limit: number;
        skip: number;
      } = {
        total: 0,
        data: [],
        limit: 0,
        skip: 0,
      };
      let paginationCursor: String = '';
      let limitDossier = 15;
      const totalDossierEachType = await getTotalDossiersReconventionnement(
        graphQLClient,
      );
      if (totalDossierEachType instanceof Error) {
        res.status(404).json({ message: totalDossierEachType.message });
        return;
      }
      if (page > 1) {
        const nbDossier = (page - 1) * limitDossier;
        const nbTypeDossierSuperieurLimit = totalDossierEachType.filter(
          (totalDossier) => totalDossier > nbDossier,
        );
        if (nbTypeDossierSuperieurLimit.length === 1) {
          limitDossier = 45;
        }
        if (nbTypeDossierSuperieurLimit.length === 2) {
          limitDossier = 22;
        }
        paginationCursor = Buffer.from(nbDossier.toString()).toString('base64');
      }

      const demarcheStructurePublique = await requestGraphQLForGetDemarcheDS(
        graphQLClient,
        limitDossier,
        paginationCursor,
        TypeDossierReconventionnement.StructurePublique,
      );
      if (demarcheStructurePublique instanceof Error) {
        res.status(404).json({ message: demarcheStructurePublique.message });
        return;
      }
      const demarcheEntrepriseEss = await requestGraphQLForGetDemarcheDS(
        graphQLClient,
        limitDossier,
        paginationCursor,
        TypeDossierReconventionnement.Entreprise,
      );
      if (demarcheEntrepriseEss instanceof Error) {
        res.status(404).json({ message: demarcheEntrepriseEss.message });
        return;
      }
      const demarcheAssociation = await requestGraphQLForGetDemarcheDS(
        graphQLClient,
        limitDossier,
        paginationCursor,
        TypeDossierReconventionnement.Association,
      );
      if (demarcheAssociation instanceof Error) {
        res.status(404).json({ message: demarcheAssociation.message });
        return;
      }

      const dossierStructurePublique = await createDossierReconventionnement(
        app,
        req,
      )(demarcheStructurePublique);

      const dossierEntrepriseEss = await createDossierReconventionnement(
        app,
        req,
      )(demarcheEntrepriseEss);

      const dossierAssociation = await createDossierReconventionnement(
        app,
        req,
      )(demarcheAssociation);

      const dossiers = dossierStructurePublique.concat(
        dossierEntrepriseEss,
        dossierAssociation,
      );
      items.total = totalDossierEachType.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0,
      );
      items.limit = 45;
      items.skip = page;
      items.data = dossiers;

      res.status(200).json(items);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDossiersReconventionnement;
