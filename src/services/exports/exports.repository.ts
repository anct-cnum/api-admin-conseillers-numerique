import dayjs from 'dayjs';
import { Response } from 'express';
import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { getCoselec } from '../../utils';
import service from '../../helpers/services';
import {
  IMisesEnRelation,
  IConseillers,
  IStructures,
  IUser,
} from '../../ts/interfaces/db.interfaces';
import {
  formatAdresseStructure,
  formatQpv,
} from '../structures/structures.repository';
import { formatStatutMisesEnRelation } from '../conseillers/conseillers.repository';

const labelsCorrespondance = require('../../../datas/themesCorrespondances.json');

const csvCellSeparator = ';';
const csvLineSeparator = '\n';

const codeAndNomTerritoire = (territoire, statTerritoire) => {
  if (territoire === 'codeRegion') {
    return [statTerritoire.codeRegion, statTerritoire.nomRegion];
  }
  if (territoire === 'codeDepartement') {
    return [statTerritoire.codeDepartement, statTerritoire.nomDepartement];
  }
  return ['Non renseignée', 'Non renseignée'];
};

const formatDate = (date: Date) => {
  if (date !== undefined && date !== null) {
    return dayjs(new Date(date.getTime() + 120 * 60000)).format('DD/MM/YYYY');
  }
  return 'non renseignée';
};

const conseillerByMisesEnRelation = async (
  idConseiller: ObjectId,
  app: Application,
) => app.service(service.conseillers).Model.findOne({ _id: idConseiller });

const structureByMisesEnRelation = async (
  idStructure: ObjectId,
  app: Application,
) => app.service(service.structures).Model.findOne({ _id: idStructure });

const generateCsvCandidat = async (misesEnRelations, res: Response) => {
  res.write(
    'Date candidature;Date prévisionnelle de recrutement;prenom;nom;expérience;téléphone;email;Code Postal;Nom commune;Département;diplômé;palier pix;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Prénom contact SA;Nom contact SA;Téléphone contact SA;Email contact SA;ID conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection;Date d’entrée en formation;Date de sortie de formation;email professionnel\n',
  );
  try {
    await Promise.all(
      misesEnRelations.map(async (miseEnrelation) => {
        const coselec = getCoselec(miseEnrelation.structure);
        res.write(
          `${formatDate(miseEnrelation.conseiller?.createdAt)};${formatDate(
            miseEnrelation?.dateRecrutement,
          )};${miseEnrelation.conseiller?.prenom};${
            miseEnrelation.conseiller?.nom
          };${
            miseEnrelation.conseiller?.aUneExperienceMedNum ? 'oui' : 'non'
          };${miseEnrelation.conseiller?.telephone};${
            miseEnrelation.conseiller?.email
          };${miseEnrelation.conseiller?.codePostal};${
            miseEnrelation.conseiller?.nomCommune
          };${miseEnrelation.conseiller?.codeDepartement};${
            miseEnrelation.conseiller.estDiplomeMedNum ? 'oui' : 'non'
          };${
            miseEnrelation.conseiller?.pix
              ? miseEnrelation.conseiller?.pix.palier
              : ''
          };${miseEnrelation.structure?.siret};${
            miseEnrelation.structure?.idPG
          };${miseEnrelation.structure?.nom};${
            miseEnrelation.structure?.type
          };${miseEnrelation.structure?.codePostal};${
            miseEnrelation.structure?.codeCommune
          };${miseEnrelation.structure?.codeDepartement};${
            miseEnrelation.structure?.codeRegion
          };${miseEnrelation.structure?.contact?.prenom};${
            miseEnrelation.structure?.contact?.nom
          };${miseEnrelation.structure?.contact?.telephone};${
            miseEnrelation.structure?.contact?.email
          };${miseEnrelation.conseiller?.idPG};${
            coselec !== null ? coselec?.numero : ''
          };${
            coselec !== null ? coselec?.nombreConseillersCoselec : 0
          };${formatDate(
            miseEnrelation.conseiller?.datePrisePoste,
          )};${formatDate(miseEnrelation.conseiller?.dateFinFormation)};${
            miseEnrelation.conseiller?.emailCN
              ? miseEnrelation.conseiller?.emailCN?.address
              : ''
          };\n`,
        );
      }),
    );
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvCandidatByStructure = async (
  misesEnRelations: IMisesEnRelation[],
  res: Response,
  app: Application,
) => {
  const promises = [];
  res.write('Nom;Prénom;Email;Code postal;Expérience;Test PIX;CV\n');
  try {
    for (const miseEnrelation of misesEnRelations) {
      promises.push(
        new Promise<void>((resolve) => {
          conseillerByMisesEnRelation(miseEnrelation.conseiller.oid, app).then(
            (conseiller) => {
              res.write(
                `${conseiller.nom};${conseiller.prenom};${conseiller.email};${
                  conseiller.codePostal
                };${conseiller.aUneExperienceMedNum ? 'oui' : 'non'};${
                  conseiller.pix === undefined ? 'non' : 'oui'
                };${conseiller.cv === undefined ? 'non' : 'oui'}\n`,
              );
              resolve();
            },
          );
        }),
      );
    }
    await Promise.all(promises);
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvConseillersHub = async (exportsHub: any, res: Response) => {
  res.write(
    'Nom;Prénom;Email @conseiller-numerique.fr;Nom de la Structure;Email de la structure;Adresse de la structure;Code région de la structure\n',
  );
  try {
    for (const exportHub of exportsHub) {
      res.write(
        `${exportHub.conseiller.nom};${exportHub.conseiller.prenom};${
          exportHub.conseiller?.mattermost?.id
            ? exportHub.conseiller?.emailCN?.address
            : 'compte COOP non créé'
        };${exportHub.nom};${exportHub.contact?.email};${formatAdresseStructure(
          exportHub.insee,
        )};${exportHub.codeRegion};\n`,
      );
    }
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const getFormatHistoriqueGroupeCRA = (nbSlice, groupeCRAHistorique) =>
  groupeCRAHistorique.slice(nbSlice);

const generateCsvConseillersWithoutCRA = async (
  conseillers: IConseillers[] | IStructures[],
  res: Response,
) => {
  try {
    const fileHeaders = [
      'Nom',
      'Prénom',
      'Email @conseiller-numerique.fr',
      'Code Postal du conseiller',
      'Code département du conseiller',
      'Numéro de téléphone du conseiller',
      "Date d'envoi du mail M+1",
      "Date d'envoi du mail M+1,5",
      'Id de la structure',
      'Siret de la structure',
      'Nom de la structure',
      'Code postal de la structure',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...conseillers.map((statCnfsWithoutCRA) =>
          [
            statCnfsWithoutCRA.nom,
            statCnfsWithoutCRA.prenom,
            statCnfsWithoutCRA.emailCN?.address,
            statCnfsWithoutCRA.codePostal,
            statCnfsWithoutCRA.codeDepartement,
            statCnfsWithoutCRA.telephone,
            formatDate(
              getFormatHistoriqueGroupeCRA(
                -1,
                statCnfsWithoutCRA.groupeCRAHistorique,
              )[0]['dateMailSendConseillerM+1'],
            ),
            formatDate(
              getFormatHistoriqueGroupeCRA(
                -1,
                statCnfsWithoutCRA.groupeCRAHistorique,
              )[0]['dateMailSendConseillerM+1,5'],
            ),
            statCnfsWithoutCRA.structure.idPG,
            statCnfsWithoutCRA.structure.siret,
            statCnfsWithoutCRA.structure.nom,
            statCnfsWithoutCRA.structure.codePostal,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvStructure = async (
  structures: IStructures[],
  res: Response,
  app: Application,
) => {
  res.write(
    'SIRET structure;ID Structure;Dénomination;Type;Statut;Code postal;Code commune;Code département;Code région;Téléphone;Email;Compte créé;Mot de passe choisi;Nombre de mises en relation;Nombre de conseillers souhaités;Validée en COSELEC;Nombre de conseillers validés par le COSELEC;Numéro COSELEC;ZRR;QPV;Nombre de quartiers QPV;Labelisée France Services;Raison sociale;Nom commune INSEE;Code commune INSEE;Adresse postale;Libellé catégorie juridique niv III;Grand Réseau;Nom Grand Réseau\n',
  );
  try {
    await Promise.all(
      structures.map(async (structure) => {
        const countMisesEnRelation: number = await app
          .service(service.misesEnRelation)
          .Model.countDocuments({
            'structure.$id': new ObjectId(structure._id),
          });
        const user: IUser = await app
          .service(service.users)
          .Model.findOne({ 'entity.$id': new ObjectId(structure._id) });
        const coselec = getCoselec(structure);
        let label = 'non renseigné';
        if (
          structure?.estLabelliseFranceServices &&
          structure.estLabelliseFranceServices === 'OUI'
        ) {
          label = 'oui';
        } else if (
          structure?.estLabelliseFranceServices &&
          structure.estLabelliseFranceServices === 'NON'
        ) {
          label = 'non';
        }
        let adresse = `${
          structure?.insee?.etablissement?.adresse?.numero_voie ?? ''
        } ${structure?.insee?.etablissement?.adresse?.type_voie ?? ''} ${
          structure?.insee?.etablissement?.adresse?.nom_voie ?? ''
        }\n${
          structure?.insee?.etablissement?.adresse?.complement_adresse
            ? `${structure.insee.etablissement.adresse.complement_adresse}\n`
            : ''
        }${structure?.insee?.etablissement?.adresse?.code_postal ?? ''} ${
          structure?.insee?.etablissement?.adresse?.localite ?? ''
        }`;

        adresse = adresse.replace(/["',]/g, '');
        res.write(
          `${structure.siret};${structure.idPG};${structure.nom};${
            structure.type === 'PRIVATE' ? 'privée' : 'publique'
          };${structure.statut};${structure.codePostal};${
            structure.codeCommune
          };${structure.codeDepartement};${structure.codeRegion};${
            structure.contact?.telephone
          };${structure.contact?.email};${
            structure.userCreated ? 'oui' : 'non'
          };${
            user !== null && user.passwordCreated ? 'oui' : 'non'
          };${countMisesEnRelation};${
            structure.nombreConseillersSouhaites ?? 0
          };${structure.statut === 'VALIDATION_COSELEC' ? 'oui' : 'non'};${
            structure.statut === 'VALIDATION_COSELEC'
              ? coselec?.nombreConseillersCoselec
              : 0
          };${
            structure.statut === 'VALIDATION_COSELEC' ? coselec?.numero : ''
          };${structure.estZRR ? 'oui' : 'non'};${
            structure.qpvStatut ?? 'Non défini'
          };${structure?.qpvListe ? structure.qpvListe.length : 0};${label};${
            structure.insee?.entreprise?.raison_sociale
              ? structure.insee?.entreprise?.raison_sociale
              : ''
          };${
            structure.insee?.etablissement?.commune_implantation?.value
              ? structure.insee?.etablissement?.commune_implantation?.value
              : ''
          };${
            structure.insee?.etablissement?.commune_implantation?.code
              ? structure.insee?.etablissement?.commune_implantation?.code
              : ''
          };"${adresse}";${
            structure.insee?.entreprise?.forme_juridique ?? ''
          };${structure.reseau ? 'oui' : 'non'};${structure?.reseau ?? ''}\n`,
        );
      }),
    );
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvRupture = async (
  misesEnRelations: IMisesEnRelation[],
  res: Response,
  app: Application,
) => {
  res.write(
    'Prénom;Nom;Email;Id CNFS;Nom Structure;Id Structure;Date rupture;Motif de rupture\n',
  );
  try {
    await Promise.all(
      misesEnRelations.map(async (miseEnrelation) => {
        const conseiller: IConseillers = await conseillerByMisesEnRelation(
          miseEnrelation.conseiller.oid,
          app,
        );
        const structure: IStructures = await structureByMisesEnRelation(
          miseEnrelation.structure.oid,
          app,
        );
        res.write(
          `${conseiller.prenom};${conseiller.nom};${conseiller.email};${
            conseiller.idPG
          };${structure.nom};${structure.idPG};${formatDate(
            miseEnrelation.dateRupture,
          )};${miseEnrelation.motifRupture}\n`,
        );
      }),
    );
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvSatistiques = async (
  statistiques,
  dateDebut,
  dateFin,
  type,
  idType,
  codePostal,
  nom,
  prenom,
  res: Response,
) => {
  try {
    const general = [
      `Général\nPersonnes totales accompagnées durant cette période;${
        statistiques.nbTotalParticipant +
        statistiques.nbAccompagnementPerso +
        statistiques.nbDemandePonctuel -
        statistiques.nbParticipantsRecurrents
      }\nAccompagnements totaux enregistrés (dont récurrent);${
        statistiques.nbTotalParticipant +
        statistiques.nbAccompagnementPerso +
        statistiques.nbDemandePonctuel
      }\nAteliers réalisés;${
        statistiques.nbAteliers
      }\nTotal des participants aux ateliers;${
        statistiques.nbTotalParticipant
      }\nAccompagnements individuels;${
        statistiques.nbAccompagnementPerso
      }\nDemandes ponctuelles;${
        statistiques.nbDemandePonctuel
      }\nAccompagnements avec suivi;${
        statistiques.nbUsagersBeneficiantSuivi
      }\nPourcentage du total des usagers accompagnés sur cette période;${
        statistiques.tauxTotalUsagersAccompagnes
      }\nAccompagnements individuels;${
        statistiques.nbUsagersAccompagnementIndividuel
      }\nAccompagnements en atelier collectif;${
        statistiques.nbUsagersAtelierCollectif
      }\nRedirections vers une autre structure agréée${
        statistiques.nbReconduction
      }`,
    ];
    const statsThemes = [
      '\nThèmes des accompagnements',
      ...statistiques.statsThemes.map(
        (theme) =>
          `\n${
            labelsCorrespondance.find((label) => label.nom === theme.nom)
              ?.correspondance ?? theme.nom
          };${theme.valeur}`,
      ),
      '',
    ];
    const statsLieux = [
      `\nCanaux d'accompagnements (en %)'`,
      ...['À domicile', 'À distance', 'Lieu de rattachement', 'Autre'].map(
        (statLieux, index) =>
          `\n${statLieux};${statistiques.statsLieux[index].valeur}`,
      ),
      '',
    ];
    const statsDurees = [
      '\nDurée des accompagnements',
      ...[
        'Moins de 30 minutes',
        '30-60 minutes',
        '60-120 minutes',
        'Plus de 120 minutes',
      ].map(
        (statsDuree, index) =>
          `\n${statsDuree};${statistiques.statsDurees[index].valeur}`,
      ),
      '',
    ];
    const statsAges = [
      '\nTranches d’âge des usagers (en %)',
      ...[
        'Moins de 12 ans',
        '12-18 ans',
        '18-35 ans',
        '35-60 ans',
        'Plus de 60 ans',
      ].map(
        (statsAge, index) =>
          `\n${statsAge};${statistiques.statsAges[index].valeur}`,
      ),
      '',
    ];
    const statsUsagers = [
      '\nStatut des usagers (en %)',
      ...[
        'Scolarisé(e)',
        'Sans emploi',
        'En emploi',
        'Retraité',
        'Non renseigné',
      ].map(
        (statsUsager, index) =>
          `\n${statsUsager};${statistiques.statsUsagers[index].valeur}`,
      ),
      '',
    ];
    const mois = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];
    const statsEvolutions = [
      `\nÉvolution·des·comptes·rendus·d'activité`,
      ...Object.keys(statistiques.statsEvolutions)
        .map((year) => [
          `\n${year}`,
          ...statistiques.statsEvolutions[year]
            .sort(
              (statEvolutionA, statEvolutionB) =>
                statEvolutionA.mois - statEvolutionB.mois,
            )
            .map(
              (orderedStatEvolution) =>
                `\n${mois[orderedStatEvolution.mois]};${
                  orderedStatEvolution.totalCras
                }`,
            ),
          '',
        ])
        .flat(),
    ];
    const statsReorientations = [
      '\nUsager.ères réorienté.es',
      ...statistiques.statsReorientations.map(
        (statReorientation) =>
          `\n${statReorientation.nom};${statReorientation.valeur}`,
      ),
    ];

    const buildExportStatistiquesCsvFileContent = [
      // eslint-disable-next-line prettier/prettier
      `Statistiques ${type} ${nom ?? ''} ${prenom ?? ''} ${codePostal ?? ''} ${idType ?? ''} ${formatDate(dateDebut).toLocaleString()}-${formatDate(dateFin).toLocaleString()}\n`,
      general,
      statsThemes,
      statsLieux,
      statsDurees,
      statsAges,
      statsUsagers,
      statsEvolutions,
      statsReorientations,
    ].join(csvLineSeparator);

    res.write(buildExportStatistiquesCsvFileContent);
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvTerritoires = async (
  statsTerritoires,
  territoire,
  res: Response,
) => {
  try {
    const fileHeaders = [
      'Code',
      'Nom',
      'Personnes accompagnées',
      'Dotation de conseillers',
      "CnFS activé sur l'espace coop",
      "CnFS en attente d'activation",
      "Taux d'activation",
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...statsTerritoires.map((statsTerritoire) =>
          [
            ...codeAndNomTerritoire(territoire, statsTerritoire),
            statsTerritoire.personnesAccompagnees,
            statsTerritoire.nombreConseillersCoselec,
            statsTerritoire.cnfsActives,
            statsTerritoire.cnfsInactives,
            statsTerritoire.tauxActivation,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvConseillers = async (misesEnRelation, res: Response) => {
  try {
    const fileHeaders = [
      'Id conseiller',
      'Id long de la structure',
      'Id de la structure',
      'Nom de la structure',
      'Code postal de la structure',
      'Nom',
      'Prénom',
      'Email Professionnelle',
      'Téléphone professionnel',
      'Email personnelle',
      'Statut',
      'Date de recrutement',
      "Date d'entrée en formation",
      'Date de sortie de formation',
      'Disponibilité',
      'Coordinateur',
      'CRA Saisis',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...misesEnRelation.map((miseEnRelation) =>
          [
            miseEnRelation.conseillerObj.idPG,
            miseEnRelation.structureObj._id,
            miseEnRelation.structureObj.idPG,
            miseEnRelation.structureObj.nom,
            miseEnRelation.structureObj.codePostal,
            miseEnRelation.conseillerObj.nom,
            miseEnRelation.conseillerObj.prenom,
            miseEnRelation.conseillerObj?.emailCN?.address ??
              'compte COOP non créé',
            miseEnRelation.conseillerObj?.telephonePro,
            miseEnRelation.conseillerObj?.email,
            formatStatutMisesEnRelation(
              miseEnRelation.statut,
              miseEnRelation?.dossierIncompletRupture,
            ),
            formatDate(miseEnRelation?.dateRecrutement),
            formatDate(miseEnRelation.conseillerObj?.datePrisePoste),
            formatDate(miseEnRelation.conseillerObj?.dateFinFormation),
            miseEnRelation.conseillerObj.disponible ? 'Oui' : 'Non',
            miseEnRelation.conseillerObj.estCoordinateur ? 'Oui' : 'Non',
            miseEnRelation.craCount,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvListeStructures = async (structures, res: Response) => {
  try {
    const fileHeaders = [
      'Id de la structure',
      'Nom de la structure',
      'Nom',
      'Prénom',
      'Fonction',
      'Email',
      'Téléphone',
      'Siret',
      "Date d'inscription",
      'Adresse',
      'Code postal',
      'Type',
      'Zone rurale',
      'Nombre de CRA total cumulés',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...structures.map((structure) =>
          [
            structure.idPG,
            structure.nom,
            structure.contact?.nom,
            structure.contact?.prenom,
            structure.contact?.fonction,
            structure.contact?.email,
            structure.contact?.telephone,
            structure.siret,
            formatDate(structure?.createdAt),
            structure?.insee ? formatAdresseStructure(structure.insee) : '',
            structure.codePostal,
            structure.type,
            formatQpv(structure?.qpvStatut),
            structure.craCount,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

const generateCsvListeGestionnaires = async (gestionnaires, res: Response) => {
  try {
    const fileHeaders = [
      'Id du gestionnaire',
      'Rôle du gestionnaire',
      'Email du gestionnaire',
      'Réseau',
      'Nom',
      'Prénom',
      "Date d'invitation",
      'Actif',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...gestionnaires.map((gestionnaire) =>
          [
            gestionnaire._id,
            `"${gestionnaire.roles.join(',')}"`,
            gestionnaire.name,
            gestionnaire.reseau,
            gestionnaire.nom,
            gestionnaire.prenom,
            gestionnaires?.tokenCreatedAt
              ? dayjs(gestionnaire.tokenCreatedAt).format('DD/MM/YYYY')
              : '-',
            gestionnaire?.passwordCreated ? 'Oui' : 'Non' || '-',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({message: "Une erreur s'est produite au niveau de la création du csv"});
    throw new Error(error);
  }
};

export {
  generateCsvCandidat,
  generateCsvCandidatByStructure,
  generateCsvConseillersWithoutCRA,
  generateCsvStructure,
  generateCsvRupture,
  generateCsvConseillersHub,
  generateCsvSatistiques,
  generateCsvTerritoires,
  generateCsvConseillers,
  generateCsvListeStructures,
  generateCsvListeGestionnaires,
};
