import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { GraphQLClient, gql } from 'graphql-request';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

interface IDossier {
  _id: string;
  idPG: number;
  dateDeCreation: Date;
  dateFinProchainContrat: Date;
  nbPostesAttribuees: number;
  nomStructure: string;
}

const getNameStructure =
  (app: Application, req: IRequest) => async (idStructure: number) =>
    app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ idPG: idStructure })
      .select({ nom: 1, _id: 0 });

const getTotalDossiersReconventionnement = async (
  graphQLClient: GraphQLClient,
) => {
  const query = gql`
    query getDemarche($demarcheNumber: Int!, $state: DossierState) {
      demarche(number: $demarcheNumber) {
        id
        dossiers(state: $state) {
          nodes {
            ...DossierFragment
          }
        }
      }
    }

    fragment DossierFragment on Dossier {
      id
    }
  `;
  const demarcheStructurePublique = await graphQLClient.request(query, {
    demarcheNumber: 69665,
  });
  const demarcheEntrepriseEss = await graphQLClient.request(query, {
    demarcheNumber: 69686,
  });
  const demarcheStructure = await graphQLClient.request(query, {
    demarcheNumber: 69687,
  });
  return (
    demarcheStructurePublique.demarche.dossiers.nodes.length +
    demarcheEntrepriseEss.demarche.dossiers.nodes.length +
    demarcheStructure.demarche.dossiers.nodes.length
  );
};

const checkIfLastPagination = (pageInfo: any) => {
  if (pageInfo.hasNextPage === false) {
    return '';
  }
  return pageInfo.endCursor;
};

const getDossiersReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const endpoint = 'https://www.demarches-simplifiees.fr/api/v2/graphql';
    const { skip } = req.body;
    try {
      const graphQLClient = new GraphQLClient(endpoint, {
        headers: {
          authorization: `Bearer ${app.get('api_demarche_simplifiee')}`,
          'content-type': 'application/json',
        },
      });

      const query = gql`
        query getDemarche(
          $demarcheNumber: Int!
          $state: DossierState
          $order: Order
          $after: String
        ) {
          demarche(number: $demarcheNumber) {
            id
            number
            title
            dossiers(state: $state, order: $order, first: 15, after: $after) {
              pageInfo {
                endCursor
                hasNextPage
              }
              nodes {
                ...DossierFragment
              }
            }
          }
        }

        fragment DossierFragment on Dossier {
          id
          number
          archived
          state
          dateDerniereModification
          dateDepot
          datePassageEnConstruction
          datePassageEnInstruction
          dateTraitement
          instructeurs {
            email
          }
          usager {
            email
          }
          champs {
            ...ChampFragment
          }
        }

        fragment ChampFragment on Champ {
          id
          stringValue
          ... on DateChamp {
            date
          }
          ... on DatetimeChamp {
            datetime
          }
          ... on CheckboxChamp {
            checked: value
          }
          ... on DecimalNumberChamp {
            decimalNumber: value
          }
          ... on IntegerNumberChamp {
            integerNumber: value
          }
          ... on CiviliteChamp {
            civilite: value
          }
          ... on LinkedDropDownListChamp {
            primaryValue
            secondaryValue
          }
          ... on MultipleDropDownListChamp {
            values
          }
        }
      `;

      const items: {
        total: number;
        data: object;
        limit: number;
        skip: object;
      } = {
        total: 0,
        data: [],
        limit: 0,
        skip: [],
      };
      const demarcheStructurePublique = await graphQLClient.request(
        query,
        skip[0],
      );
      const demarcheEntrepriseEss = await graphQLClient.request(query, skip[1]);
      const demarcheStructure = await graphQLClient.request(query, skip[2]);

      const dossierStructurePublique = await Promise.all(
        demarcheStructurePublique.demarche.dossiers.nodes.map(
          async (dossier) => {
            const { champs, id, datePassageEnConstruction } = dossier;
            const item: IDossier = {
              _id: '',
              idPG: 0,
              dateDeCreation: undefined,
              dateFinProchainContrat: undefined,
              nbPostesAttribuees: 0,
              nomStructure: '',
            };
            item._id = id;
            item.dateDeCreation = datePassageEnConstruction;
            item.idPG = parseInt(
              champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg1MTgwNA==')
                ?.stringValue,
              10,
            );
            item.nbPostesAttribuees = parseInt(
              champs.find((champ: any) => champ.id === 'Q2hhbXAtMjkwMjkyMw==')
                ?.stringValue,
              10,
            );
            item.dateFinProchainContrat = champs.find(
              (champ: any) => champ.id === 'Q2hhbXAtMjk0MDAwNg==',
            )?.date;
            const structure = await getNameStructure(app, req)(item.idPG);
            item.nomStructure = structure?.nom;

            return item;
          },
        ),
      );

      const dossierEntrepriseEss = await Promise.all(
        demarcheEntrepriseEss.demarche.dossiers.nodes.map(async (dossier) => {
          const { champs, id, datePassageEnConstruction } = dossier;
          const item: IDossier = {
            _id: '',
            idPG: 0,
            dateDeCreation: undefined,
            dateFinProchainContrat: undefined,
            nbPostesAttribuees: 0,
            nomStructure: '',
          };
          item._id = id;
          item.dateDeCreation = datePassageEnConstruction;
          item.idPG = champs.find(
            (champ: any) => champ.id === 'Q2hhbXAtMjg1MjA1OQ==',
          )?.stringValue;
          item.nbPostesAttribuees = champs.find(
            (champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1Mg==',
          )?.stringValue;
          item.dateFinProchainContrat = champs.find(
            (champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1OA==',
          )?.date;
          const structure = await getNameStructure(app, req)(item.idPG);
          item.nomStructure = structure?.nom;

          return item;
        }),
      );

      const dossierStructure = await Promise.all(
        demarcheStructure.demarche.dossiers.nodes.map(async (dossier) => {
          const { champs, id, datePassageEnConstruction } = dossier;
          const item: IDossier = {
            _id: '',
            idPG: 0,
            dateDeCreation: undefined,
            dateFinProchainContrat: undefined,
            nbPostesAttribuees: 0,
            nomStructure: '',
          };
          item._id = id;
          item.dateDeCreation = datePassageEnConstruction;
          item.idPG = champs.find(
            (champ: any) => champ.id === 'Q2hhbXAtMjg0ODE4Ng==',
          )?.stringValue;
          item.nbPostesAttribuees = champs.find(
            (champ: any) => champ.id === 'Q2hhbXAtMjg3MzQ4Mw==',
          )?.stringValue;
          item.dateFinProchainContrat = champs.find(
            (champ: any) => champ.id === 'Q2hhbXAtMjg3NDM2Mw==',
          )?.date;
          const structure = await getNameStructure(app, req)(item.idPG);
          item.nomStructure = structure?.nom;

          return item;
        }),
      );
      const dossiers = dossierStructurePublique.concat(
        dossierEntrepriseEss,
        dossierStructure,
      );
      items.total = await getTotalDossiersReconventionnement(graphQLClient);
      items.limit = 45;
      items.skip[0].after = checkIfLastPagination(
        demarcheStructure.demarche.dossiers.pageInfo,
      );
      items.skip[1].after = checkIfLastPagination(
        demarcheStructurePublique.demarche.dossiers.pageInfo,
      );
      items.skip[2].after = checkIfLastPagination(
        demarcheEntrepriseEss.demarche.dossiers.pageInfo,
      );
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
