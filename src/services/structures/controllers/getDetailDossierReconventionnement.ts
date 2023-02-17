import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { GraphQLClient, gql } from 'graphql-request';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestStructures } from '../structures.repository';

interface IReconventionnement {
  idDossier?: string;
  numeroDossier?: number;
  dateDeCreation?: Date;
  dateFinProchainContrat?: Date;
  nbPostesAttribuees?: number;
  statut?: string;
  structure?: object;
}

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
          conseillers: '$conseillers',
        },
      },
    ]);

const getDetailDossierReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const endpoint = 'https://www.demarches-simplifiees.fr/api/v2/graphql';
    const idDossier = req.params.id;
    try {
      const graphQLClient = new GraphQLClient(endpoint, {
        headers: {
          authorization: `Bearer ${app.get('api_demarche_simplifiee')}`,
          'content-type': 'application/json',
        },
      });

      const query = gql`
        query getDossier($dossierNumber: Int!) {
          dossier(number: $dossierNumber) {
            ...DossierFragment
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
          champs {
            ...ChampFragment
          }
        }

        fragment ChampFragment on Champ {
          id
          label
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

      const dossier = await graphQLClient.request(query, {
        dossierNumber: parseInt(idDossier, 10),
      });
      console.log(dossier);
      const reconventionnement: IReconventionnement = {};
      const checkAccessStructures = await checkAccessReadRequestStructures(
        app,
        req,
      );
      const structure = await getDetailStructureWithConseillers(
        app,
        checkAccessStructures,
      )(parseInt(dossier.dossier.champs[1]?.integerNumber, 10));
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
