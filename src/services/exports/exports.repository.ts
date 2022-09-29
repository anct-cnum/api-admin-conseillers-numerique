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

const labelsCorrespondance = require('../../../data/themesCorrespondances.json');

const formatDate = (date: Date) => {
  if (date !== undefined) {
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
    'Date candidature;Date prévisionnelle de recrutement;prenom;nom;expérience;téléphone;email;Code Postal;Nom commune;Département;diplômé;palier pix;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Prénom contact SA;Nom contact SA;Téléphone contact SA;Email contact SA;ID conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection\n',
  );
  try {
    await Promise.all(
      misesEnRelations.map(async (miseEnrelation) => {
        const coselec = getCoselec(miseEnrelation.structure);
        res.write(
          `${formatDate(miseEnrelation.conseiller?.createdAt)};${
            miseEnrelation.dateRecrutement === null
              ? 'non renseignée'
              : formatDate(miseEnrelation.dateRecrutement)
          };${miseEnrelation.conseiller?.prenom};${
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
          };${coselec !== null ? coselec?.nombreConseillersCoselec : 0};\n`,
        );
      }),
    );
    res.end();
  } catch (error) {
    res.statusMessage =
      "Une erreur s'est produite au niveau de la création du csv";
    res.status(500).end();
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
    res.statusMessage =
      "Une erreur s'est produite au niveau de la création du csv";
    res.status(500).end();
    throw new Error(error);
  }
};

const formatAdresseStructure = (insee) => {
  const adresse = `${insee?.etablissement?.adresse?.numero_voie ?? ''} ${
    insee?.etablissement?.adresse?.type_voie ?? ''
  } ${insee?.etablissement?.adresse?.nom_voie ?? ''} ${
    insee?.etablissement?.adresse?.complement_adresse
      ? `${insee.etablissement.adresse.complement_adresse} `
      : ' '
  }${insee?.etablissement?.adresse?.code_postal ?? ''} ${
    insee?.etablissement?.adresse?.localite ?? ''
  }`;

  return adresse.replace(/["',]/g, '');
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
    res.statusMessage =
      "Une erreur s'est produite au niveau de la création du csv";
    res.status(500).end();
    throw new Error(error);
  }
};

const getFormatHistoriqueGroupeCRA = (nbSlice, groupeCRAHistorique) =>
  groupeCRAHistorique.slice(nbSlice);

const generateCsvConseillersWithoutCRA = async (
  conseillers: IConseillers[] | IStructures[],
  res: Response,
) => {
  const csvCellSeparator = ';';
  const csvLineSeparator = '\n';

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
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...conseillers.map((statCnfsWithoutCRA) =>
          [
            statCnfsWithoutCRA.nom,
            statCnfsWithoutCRA.prenom,
            statCnfsWithoutCRA.emailCN.address,
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
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.statusMessage =
      "Une erreur s'est produite au niveau de la création du csv";
    res.status(500).end();
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
    res.statusMessage =
      "Une erreur s'est produite au niveau de la création du csv";
    res.status(500).end();
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
    res.statusMessage =
      "Une erreur s'est produite au niveau de la création du csv";
    res.status(500).end();
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
  res: Response,
) => {
  const general = [
    'Général',
    `Personnes totales accompagnées durant cette période;${
      statistiques.nbTotalParticipant +
      statistiques.nbAccompagnementPerso +
      statistiques.nbDemandePonctuel -
      statistiques.nbParticipantsRecurrents
    }`,
    `Accompagnements total enregistrés (dont récurrent);${
      statistiques.nbTotalParticipant +
      statistiques.nbAccompagnementPerso +
      statistiques.nbDemandePonctuel
    }`,
    `Ateliers réalisés;${statistiques.nbAteliers}`,
    `Total des participants aux ateliers;${statistiques.nbTotalParticipant}`,
    `Accompagnements individuels;${statistiques.nbAccompagnementPerso}`,
    `Demandes ponctuelles;${statistiques.nbDemandePonctuel}`,
    `Accompagnements avec suivi;${statistiques.nbUsagersBeneficiantSuivi}`,
    `Pourcentage du total des usagers accompagnés sur cette période;${statistiques.tauxTotalUsagersAccompagnes}`,
    `Accompagnements individuels;${statistiques.nbUsagersAccompagnementIndividuel}`,
    `Accompagnements en atelier collectif;${statistiques.nbUsagersAtelierCollectif}`,
    `Redirections vers une autre structure agréée;${statistiques.nbReconduction}\n`,
  ];
  const statsThemes = [
    'Thèmes des accompagnements',
    ...statistiques.statsThemes.map(
      (theme) =>
        `${
          labelsCorrespondance.find((label) => label.nom === theme.nom)
            ?.correspondance ?? theme.nom
        };${theme.valeur}`,
    ),
    '',
  ];
  const statsLieux = [
    `Lieux des accompagnements (en %)'`,
    ...['À domicile', 'À distance', 'Lieu de rattachement', 'Autre'].map(
      (statLieux, index) =>
        `${statLieux};${statistiques.statsLieux[index].valeur}`,
    ),
    '',
  ];
  const statsDurees = [
    'Durée des accompagnements',
    ...[
      'Moins de 30 minutes',
      '30-60 minutes',
      '60-120 minutes',
      'Plus de 120 minutes',
    ].map(
      (statsDuree, index) =>
        `${statsDuree};${statistiques.statsDurees[index].valeur}`,
    ),
    '',
  ];
  const statsAges = [
    'Tranches d’âge des usagers (en %)',
    ...[
      'Moins de 12 ans',
      '12-18 ans',
      '18-35 ans',
      '35-60 ans',
      'Plus de 60 ans',
    ].map(
      (statsAge, index) =>
        `${statsAge};${statistiques.statsAges[index].valeur}`,
    ),
    '',
  ];
  const statsUsagers = [
    'Statut des usagers (en %)',
    ...[
      'Scolarisé(e)',
      'Sans emploi',
      'En emploi',
      'Retraité',
      'Non renseigné',
    ].map(
      (statsUsager, index) =>
        `${statsUsager};${statistiques.statsUsagers[index].valeur}`,
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
    `"Évolution·des·comptes·rendus·d'activité"`,
    ...Object.keys(statistiques.statsEvolutions)
      .map((year) => [
        year,
        ...statistiques.statsEvolutions[year]
          .sort(
            (statEvolutionA, statEvolutionB) =>
              statEvolutionA.mois - statEvolutionB.mois,
          )
          .map(
            (orderedStatEvolution) =>
              `${mois[orderedStatEvolution.mois]};
              ${orderedStatEvolution.totalCras}`,
          ),
        '',
      ])
      .flat(),
  ];
  const statsReorientations = [
    'Usager.ères réorienté.es',
    ...statistiques.statsReorientations.map(
      (statReorientation) =>
        `${statReorientation.nom};${statReorientation.valeur}`,
    ),
  ];

  const buildExportStatistiquesCsvFileContent = [
    `Statistiques ${type} ${codePostal ?? ''} ${idType ?? ''} ${formatDate(
      dateDebut,
    ).toLocaleString()}-${formatDate(dateFin).toLocaleString()}\n`,
    general,
    statsThemes,
    statsLieux,
    statsDurees,
    statsAges,
    statsUsagers,
    statsEvolutions,
    statsReorientations,
  ].join('\n');

  res.write(buildExportStatistiquesCsvFileContent);
  res.end();
};

export {
  generateCsvCandidat,
  generateCsvCandidatByStructure,
  generateCsvConseillersWithoutCRA,
  generateCsvStructure,
  generateCsvRupture,
  generateCsvConseillersHub,
  generateCsvSatistiques,
};
