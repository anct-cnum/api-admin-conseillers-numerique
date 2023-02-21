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
  type: string;
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
  return [
    demarcheStructurePublique.demarche.dossiers.nodes.length,
    demarcheEntrepriseEss.demarche.dossiers.nodes.length,
    demarcheStructure.demarche.dossiers.nodes.length,
  ];
};

const getDossiersReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const demarcheSimplifiee = app.get('demarche_simplifiee');
    const { page } = req.query;
    try {
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
      if (page > 1) {
        const nbDossier = page * limitDossier;
        const result = totalDossierEachType.filter(
          (totalDossier) => totalDossier > nbDossier,
        );
        if (result.length === 1) {
          limitDossier = 45;
        }
        if (result.length === 2) {
          limitDossier = 22;
        }
        paginationCursor = Buffer.from(nbDossier.toString()).toString('base64');
      }
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
            dossiers(state: $state, order: $order, first: ${limitDossier}, after: $after) {
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
      const demarcheStructurePublique = await graphQLClient.request(query, {
        demarcheNumber: 69665,
        after: paginationCursor,
      });
      const demarcheEntrepriseEss = await graphQLClient.request(query, {
        demarcheNumber: 69686,
        after: paginationCursor,
      });
      const demarcheStructure = await graphQLClient.request(query, {
        demarcheNumber: 69687,
        after: paginationCursor,
      });

      const dossierStructurePublique = await Promise.all(
        demarcheStructurePublique.demarche.dossiers.nodes.map(
          async (dossier) => {
            const { champs, number, datePassageEnConstruction } = dossier;
            const item: IDossier = {
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
          const { champs, number, datePassageEnConstruction } = dossier;
          const item: IDossier = {
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
          const { champs, number, datePassageEnConstruction } = dossier;
          const item: IDossier = {
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
