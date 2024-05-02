/* eslint-disable prettier/prettier */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Response } from 'express';
import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { formatDateGMT, getCoselec } from '../../utils';
import service from '../../helpers/services';
import {
  IMisesEnRelation,
  IConseillers,
  IStructures,
  IUser,
} from '../../ts/interfaces/db.interfaces';
import {
  checkStructurePhase2,
  formatAdresseStructure,
  formatQpv,
} from '../structures/repository/structures.repository';
import { formatStatutMisesEnRelation } from '../conseillers/repository/conseillers.repository';
import {
  PhaseConventionnement,
  AffichagePhaseConventionnement,
} from '../../ts/enum';

dayjs.extend(utc);

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
    return dayjs(formatDateGMT(date)).format('DD/MM/YYYY');
  }
  return 'non renseignée';
};

const formatDateWithoutGetTime = (date: Date) => {
  if (date !== undefined && date !== null) {
    return dayjs.utc(date).format('DD/MM/YYYY');
  }
  return 'non renseignée';
};

const checkIfCcp1 = (statut) =>
  statut === 'RECRUTE' || statut === 'RUPTURE' ? 'oui' : 'non';

const generateCsvCandidat = async (misesEnRelations, res: Response) => {
  res.write(
    'Date candidature;Date de début de contrat;Date de fin de contrat;Type de contrat;Salaire;prenom;nom;Compte activé;expérience;téléphone;email;coordinateur;Code Postal;Nom commune;Département;diplômé;palier pix;Formation CCP1;SIRET structure;ID Structure;ID long Structure;Dénomination;Type;Adresse de la structure;Code postal;Code commune;Code département;Code région;Prénom contact SA;Nom contact SA;Téléphone contact SA;Email contact SA;ID conseiller;ID long conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection;Date d’entrée en formation;Date de sortie de formation;email professionnel;email professionnel secondaire\n',
  );
  try {
    await Promise.all(
      misesEnRelations.map(async (miseEnrelation) => {
        const coselec = getCoselec(miseEnrelation.structure);
        res.write(
          `${
            formatDate(miseEnrelation.conseiller?.createdAt)
          };${
            formatDate(miseEnrelation?.dateDebutDeContrat)
          };${
            formatDate(miseEnrelation?.dateFinDeContrat)
          };${
            miseEnrelation?.typeDeContrat ?? 'Non renseigné'
          };${
            miseEnrelation?.salaire ?? 'Non renseigné'
          };${
            miseEnrelation.conseiller?.prenom
          };${
            miseEnrelation.conseiller?.nom
          };${
            miseEnrelation.conseiller?.emailCN?.address &&
            miseEnrelation.conseiller?.mattermost?.id
              ? 'oui'
              : 'non'
          };${
            miseEnrelation.conseiller?.aUneExperienceMedNum ? 'oui' : 'non'
          };${
            miseEnrelation.conseiller?.telephone
          };${
            miseEnrelation.conseiller?.email
          };${
            miseEnrelation.conseiller?.estCoordinateur ? 'oui' : 'non'
          };${
            miseEnrelation.conseiller?.codePostal
          };${
            miseEnrelation.conseiller?.nomCommune
          };${
            miseEnrelation.conseiller?.codeDepartement
          };${
            miseEnrelation.conseiller.estDiplomeMedNum ? 'oui' : 'non'
          };${
            miseEnrelation.conseiller?.pix
              ? miseEnrelation.conseiller?.pix.palier
              : ''
          };${
            checkIfCcp1(miseEnrelation.conseiller?.statut)
          };${
            miseEnrelation.structure?.siret
          };${
            miseEnrelation.structure?.idPG
          };${
            miseEnrelation.structure?._id
          };${
            miseEnrelation.structure?.nom
          };${
            miseEnrelation.structure?.type
          };${
            formatAdresseStructure(miseEnrelation.structure.insee)
          };${
            miseEnrelation.structure?.codePostal
          };${
            miseEnrelation.structure?.codeCommune
          };${
            miseEnrelation.structure?.codeDepartement
          };${
            miseEnrelation.structure?.codeRegion
          };${
            miseEnrelation.structure?.contact?.prenom
          };${
            miseEnrelation.structure?.contact?.nom
          };${
            miseEnrelation.structure?.contact?.telephone
          };${
            miseEnrelation.structure?.contact?.email
          };${
            miseEnrelation.conseiller?.idPG
          };${
            miseEnrelation.conseiller?._id
          };${
            coselec !== null ? coselec?.numero : ''
          };${
            coselec !== null ? coselec?.nombreConseillersCoselec : 0
          };${
            formatDate(miseEnrelation.conseiller?.datePrisePoste)
          };${
            formatDate(miseEnrelation.conseiller?.dateFinFormation)
          };${
            miseEnrelation.conseiller?.mattermost?.id &&
            miseEnrelation.conseiller?.emailCN?.address
              ? miseEnrelation.conseiller?.emailCN?.address
              : ''
          };${
            miseEnrelation.conseiller?.emailPro ?? ''
          }\n`,
        );
      }),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvCandidatByStructure = async (
  misesEnRelations,
  res: Response,
) => {
  try {
    const fileHeaders = [
      'Nom',
      'Prénom',
      'Email',
      'Code postal',
      'Formation CCP1',
      'Expérience',
      'Test PIX',
      'CV',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...misesEnRelations.map((miseEnrelation) =>
          [
            miseEnrelation.conseillerObj?.nom,
            miseEnrelation.conseillerObj?.prenom,
            miseEnrelation.conseillerObj?.email,
            miseEnrelation.conseillerObj?.codePostal,
            checkIfCcp1(miseEnrelation.conseillerObj?.statut),
            miseEnrelation.conseillerObj?.aUneExperienceMedNum ? 'oui' : 'non',
            miseEnrelation.conseillerObj?.pix === undefined ? 'non' : 'oui',
            miseEnrelation.conseillerObj?.cv === undefined ? 'non' : 'oui',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvCandidaturesCoordinateur = async (
  candidaturesCoordinateurs,
  res: Response,
) => {
  try {
    const fileHeaders = [
      'Id de la structure',
      'Nom de la structure',
      'Code postal',
      'Numéro de dossier',
      'Statut de la demande',
      'Date de candidature',
      'Avis préfet',
      'Date de validation',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...candidaturesCoordinateurs.map((candidature) =>
          [
            candidature.idPG,
            candidature.nomStructure,
            candidature.codePostal,
            candidature.dossier.numero,
            candidature.statut,
            formatDate(candidature.dossier.dateDeCreation),
            candidature?.avisPrefet,
            formatDate(candidature?.emetteurValidation?.date),
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
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
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
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
      "id Conum",
      'Nom',
      'Prénom',
      'Email @conseiller-numerique.fr',
      'Code Postal du conseiller',
      'Code département du conseiller',
      'Numéro de téléphone du conseiller',
      "Date d'envoi du mail M+1",
      "Date d'envoi du mail M+1.5",
      "Groupe CRA",
      'Id de la structure',
      'Siret de la structure',
      'Nom de la structure',
      'Code postal de la structure',
      'Coordonnées de la structure',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...conseillers.map((statCnfsWithoutCRA) =>
          [
            statCnfsWithoutCRA.idPG,
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
            statCnfsWithoutCRA.groupeCRA,
            statCnfsWithoutCRA.structure.idPG,
            statCnfsWithoutCRA.structure.siret,
            statCnfsWithoutCRA.structure.nom,
            statCnfsWithoutCRA.structure.codePostal,
            statCnfsWithoutCRA.structure?.contact?.telephone?.length >= 10
              ? statCnfsWithoutCRA.structure?.contact?.telephone.replace(
                  /[- ]/g,
                  '',
                )
              : 'Non renseigné',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvStructure = async (
  structures: IStructures[],
  res: Response,
  app: Application,
) => {
  res.write(
    'SIRET structure;ID Structure;Dénomination;Type;Statut;Code postal;Code commune;Code département;Code région;Téléphone;Email;Compte créé;Mot de passe choisi;Nombre de mises en relation;Nombre de conseillers souhaités;Validée en COSELEC;Nombre de conseillers validés par le COSELEC;Numéro COSELEC;ZRR;QPV;Nombre de quartiers QPV;Labelisée France Services;Raison sociale;Nom commune INSEE;Code commune INSEE;Adresse postale;Libellé catégorie juridique niv III;Grand Réseau;Nom Grand Réseau;Emails administrateurs\n',
  );
  try {
    await Promise.all(
      structures.map(async (structure) => {
        const countMisesEnRelation: number = await app
          .service(service.misesEnRelation)
          .Model.countDocuments({
            'structure.$id': new ObjectId(structure._id),
          });
        const users: IUser[] = await app
          .service(service.users)
          .Model.find({ 'entity.$id': new ObjectId(structure._id) });
        const userPrincipal = users.find(
          (user) => user.name === structure?.contact?.email,
        );
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
        let adresse = `${structure?.insee?.adresse?.numero_voie ?? ''}
        ${structure?.insee?.adresse?.type_voie ?? ''}
        ${structure?.insee?.adresse?.libelle_voie ?? ''}\n${
          structure?.insee?.adresse?.complement_adresse
            ? `${structure.insee.adresse.complement_adresse}\n`
            : ''
        }${structure?.insee?.adresse?.code_postal ?? ''} ${
          structure?.insee?.adresse?.libelle_commune ?? ''
        }`;

        adresse = adresse.replace(/["',]/g, '');

        res.write(
          `${structure.siret};${structure.idPG};${structure.nom};${
            structure.type === 'PRIVATE' ? 'privée' : 'publique'
          };${structure.statut};${structure.codePostal};${
            structure.codeCommune
          };${structure.codeDepartement};${structure.codeRegion};${structure.contact?.telephone};${structure.contact?.email};${
            structure.userCreated ? 'oui' : 'non'
          };${userPrincipal?.sub ? 'oui' : 'non'};${countMisesEnRelation};${
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
            structure.insee?.unite_legale?.personne_morale_attributs
              ?.raison_sociale
              ? structure.insee?.unite_legale?.personne_morale_attributs
                  ?.raison_sociale
              : ''
          };${
            structure.insee?.adresse?.libelle_commune
              ? structure.insee?.adresse?.libelle_commune
              : ''
          };${
            structure.insee?.adresse?.code_commune
              ? structure.insee?.adresse?.code_commune
              : ''
          };"${adresse}";${
            structure.insee?.unite_legale?.forme_juridique?.libelle ?? ''
          };${structure.reseau ? 'oui' : 'non'};${structure?.reseau ?? ''};"${
            users.length > 0
              ? users
                  .filter(
                    (u) =>
                      u.name?.toLowerCase() !==
                      structure.contact?.email?.toLowerCase(),
                  )
                  .map((u) => u.name?.toLowerCase())
                  .join(',')
              : ''
          }"\n`,
        );
      }),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvDemandesRuptures = async (
  misesEnRelations: IMisesEnRelation[],
  res: Response,
) => {
  const fileHeaders = [
    'Nom',
    'Prénom',
    'Email',
    'Id CNFS',
    'Nom de la structure',
    'Id Structure',
    'Date de début de contrat',
    'Date de fin de contrat',
    'Type de contrat',
    'Date de rupture',
    'Motif de rupture',
  ];
  try {
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...misesEnRelations.map((miseEnrelation) =>
          [
            miseEnrelation.conseillerObj?.nom,
            miseEnrelation.conseillerObj?.prenom,
            miseEnrelation.conseillerObj?.email,
            miseEnrelation.conseillerObj?.idPG,
            miseEnrelation.structureObj?.nom,
            miseEnrelation.structureObj?.idPG,
            formatDate(miseEnrelation?.dateDebutDeContrat),
            formatDate(miseEnrelation?.dateFinDeContrat),
            miseEnrelation?.typeDeContrat ?? 'Non renseigné',
            formatDate(miseEnrelation?.dateRupture),
            miseEnrelation?.motifRupture ?? 'Non renseigné',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvStructureNonInteresserReconventionnement = async (
  structures: IStructures[],
  res: Response,
) => {
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
      'Motif',
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
            structure?.siret,
            structure?.conventionnement?.motif,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvStatistiques = async (
  statistiques,
  dateDebut,
  dateFin,
  type,
  idType,
  codePostal,
  ville,
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
      }\nRedirections vers une autre structure agréée;${
        statistiques.nbReconduction
      }`,
    ];
    const statsThemes = [
      '\nThèmes des accompagnements',
      ...(statistiques.statsThemes?.map(
        (theme) =>
          `\n${
            labelsCorrespondance.find((label) => label.nom === theme.nom)
              ?.correspondance ?? theme.nom
          };${theme.valeur};${theme.percent}%`,
      ) ?? []),
      '',
    ];
    const statsLieux = [
      `\nCanaux d'accompagnements (en %)'`,
      ...['À domicile', 'À distance', 'Lieu de rattachement', 'Autre'].map(
        (statLieux, index) =>
          `\n${statLieux};${statistiques?.statsLieux[index].valeur}`,
      ),
      '',
    ];
    const statsTempsAccompagnement = [
      '\nTemps en accompagnement',
      ...['Total', 'Collectifs', 'Individuels', 'Ponctuels'].map(
        (tempsAccompagnement, index) =>
          `\n${tempsAccompagnement};${statistiques?.statsTempsAccompagnement[index].temps}`,
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
          `\n${statsDuree};${statistiques?.statsDurees[index].valeur}`,
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
          `\n${statsAge};${statistiques?.statsAges[index].valeur}`,
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
          `\n${statsUsager};${statistiques?.statsUsagers[index].valeur}`,
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
      ...(
        Object.keys(statistiques.statsEvolutions)?.map((year) => [
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
        ]) ?? []
      ).flat(),
    ];
    const statsReorientations = [
      '\nUsager.ères réorienté.es',
      ...(statistiques.statsReorientations?.map(
        (statReorientation) =>
          `\n${statReorientation.nom};${statReorientation.valeur}`,
      ) ?? []),
    ];

    const buildExportStatistiquesCsvFileContent = [
      // eslint-disable-next-line prettier/prettier
      `Statistiques ${type} ${nom ?? ''} ${prenom ?? ''} ${codePostal ?? ''} ${ville ?? ''} ${idType ?? ''} ${formatDateWithoutGetTime(dateDebut)}-${formatDateWithoutGetTime(dateFin)}\n`,
      general,
      statsThemes.map((stat) => stat.trim()).join('\n'),
      statsLieux,
      statsTempsAccompagnement.map((stat) => stat.trim()).join('\n'),
      statsDurees,
      statsAges,
      statsUsagers,
      statsEvolutions,
      statsReorientations,
    ].join(csvLineSeparator);

    res.write(buildExportStatistiquesCsvFileContent);
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
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
      'CRA enregistrés',
      'Personnes accompagnées',
      "Nombre d'accompagnement",
      'Dotation de conseillers',
      "Conum activé sur l'espace coop",
      "Conum en attente d'activation",
      "Taux d'activation",
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...statsTerritoires.map((statsTerritoire) =>
          [
            ...codeAndNomTerritoire(territoire, statsTerritoire),
            statsTerritoire.CRAEnregistres,
            statsTerritoire.personnesAccompagnees -
              statsTerritoire.personnesRecurrentes,
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
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvTerritoiresPrefet = async (
  statsTerritoires,
  territoire,
  res: Response,
) => {
  try {
    const fileHeaders = [
      'Code',
      'Nom',
      'Personnes accompagnées',
      'Postes validés',
      'Conseillers recrutés',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...statsTerritoires.map((statsTerritoire) =>
          [
            ...codeAndNomTerritoire(territoire, statsTerritoire),
            statsTerritoire.personnesAccompagnees -
              statsTerritoire.personnesRecurrentes,
            statsTerritoire.nombreConseillersCoselec,
            statsTerritoire.conseillersRecruter,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvConseillers = async (misesEnRelation, res: Response) => {
  try {
    const fileHeaders = [
      'Id conseiller',
      'Id de la structure',
      'Nom de la structure',
      'Code postal de la structure',
      'Adresse postale de la structure',
      'Contact principal de la structure',
      'Nom',
      'Prénom',
      'Email professionnel',
      'Email professionnel secondaire',
      'Compte Coop activé',
      'Téléphone professionnel',
      'Email personnelle',
      'Statut',
      'Date de début de contrat',
      'Date de fin de contrat',
      'Type de contrat',
      'Salaire',
      "Date d'entrée en formation",
      'Date de sortie de formation',
      'Disponibilité',
      'Coordinateur',
      'CRA Saisis',
      'Nom du supérieur hiérarchique',
      'Prénom du supérieur hiérarchique',
      'Email du supérieur hiérarchique',
      'Fonction du supérieur hiérarchique',
      'Téléphone du supérieur hiérarchique',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...misesEnRelation.map((miseEnRelation) =>
          [
            miseEnRelation.conseillerObj.idPG,
            miseEnRelation.structureObj.idPG,
            miseEnRelation.structureObj.nom?.replaceAll(/["',]/g, ' '),
            miseEnRelation.structureObj.codePostal,
            miseEnRelation.structureObj.insee
              ? formatAdresseStructure(miseEnRelation.structureObj.insee)
              : '',
            miseEnRelation.structureObj.contact?.email,
            miseEnRelation.conseillerObj.nom,
            miseEnRelation.conseillerObj.prenom,
            miseEnRelation.conseillerObj?.emailCN?.address ??
              `compte COOP non créé (${formatStatutMisesEnRelation(
                miseEnRelation.statut,
                miseEnRelation?.dossierIncompletRupture,
              )})`,
            miseEnRelation.conseillerObj?.emailPro
              ? miseEnRelation.conseillerObj.emailPro
              : 'Non renseigné',
            miseEnRelation.conseillerObj?.mattermost?.login ? 'Oui' : 'Non',
            miseEnRelation.conseillerObj?.telephonePro,
            miseEnRelation.conseillerObj?.email,
            formatStatutMisesEnRelation(
              miseEnRelation.statut,
              miseEnRelation?.dossierIncompletRupture,
            ),
            formatDate(miseEnRelation?.dateDebutDeContrat),
            formatDate(miseEnRelation?.dateFinDeContrat),
            miseEnRelation?.typeDeContrat ?? 'Non renseigné',
            miseEnRelation?.salaire ?? 'Non renseigné',
            formatDate(miseEnRelation.conseillerObj?.datePrisePoste),
            formatDate(miseEnRelation.conseillerObj?.dateFinFormation),
            miseEnRelation.conseillerObj.disponible ? 'Oui' : 'Non',
            miseEnRelation.conseillerObj.estCoordinateur ? 'Oui' : 'Non',
            miseEnRelation.craCount,
            miseEnRelation.conseillerObj?.supHierarchique?.nom ??
              'Non renseigné',
            miseEnRelation.conseillerObj?.supHierarchique?.prenom ??
              'Non renseigné',
            miseEnRelation.conseillerObj?.supHierarchique?.email ??
              'Non renseigné',
            miseEnRelation.conseillerObj?.supHierarchique?.fonction ??
              'Non renseignée',
            miseEnRelation.conseillerObj?.supHierarchique?.numeroTelephone ??
              'Non renseigné',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};
const generateCsvConseillersCoordonnes = async (conseillers, res: Response) => {
  try {
    const fileHeaders = [
      'Id',
      'Nom',
      'Prénom',
      'Mail personnel',
      'Mail conseiller numérique',
      'Structure',
      'Code postal',
      'Date de début de contrat',
      'Date de fin de formation',
      'Certification',
      'Activé',
      'CRA saisi',
      'Nom supérieur',
      'Prénom supérieur',
      'Fonction supérieur',
      'Mail supérieur',
      'Téléphone supérieur',
    ];
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...conseillers.map((conseiller) =>
          [
            conseiller.idPG,
            conseiller.nom,
            conseiller.prenom,
            conseiller.emailPerso,
            conseiller.emailCN,
            conseiller.nomStructure,
            conseiller.codePostal,
            formatDate(conseiller.dateDebutDeContrat),
            formatDate(conseiller.dateFinDeFormation),
            conseiller.certificationPix ? 'Oui' : 'Non',
            conseiller.compteCoopActif ? 'Oui' : 'Non',
            conseiller.craCount,
            conseiller.nomSuperieurHierarchique,
            conseiller.prenomSuperieurHierarchique,
            conseiller.fonctionSuperieurHierarchique,
            conseiller.emailSuperieurHierarchique,
            conseiller.telephoneSuperieurHierarchique,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
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
      'Candidats recrutés',
      'Conventionnement phase 2',
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
            `${structure.conseillersRecruter}/${structure.posteValiderCoselec}`,
            checkStructurePhase2(structure?.conventionnement?.statut)
              ? 'Oui'
              : 'Non',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvListeGestionnaires = async (gestionnaires, res: Response) => {
  try {
    const compteActif = (gestionnaire) => (gestionnaire?.sub ? 'Oui' : 'Non');

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
            gestionnaire.idStructure,
            `"${gestionnaire.roles.join(',')}"`,
            gestionnaire.name,
            gestionnaire.reseau,
            gestionnaire.nom,
            gestionnaire.prenom,
            gestionnaire.mailSentDate
              ? dayjs(gestionnaire.mailSentDate).format('DD/MM/YYYY')
              : '-',
            compteActif(gestionnaire),
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvHistoriqueDossiersConvention = async (
  structures: any[],
  res: Response,
) => {
  try {
    const fileHeaders = [
      'ID',
      'Siret plateforme',
      'Date COSELEC',
      'Nombre de postes avant COSELEC',
      'Nombre de postes après COSELEC',
      'Variation',
      'Type de la demande',
      'ID structure transfert',
      'N° DS',
      'Code département',
      'Département',
      'Région',
      'Type de conventionnement',
    ];

    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...structures.map((structure) =>
          [
            structure.idPG,
            structure.siret,
            formatDate(structure.dateSorted),
            structure.nbPostesAvantDemande,
            structure.nbPostesApresDemande,
            structure.variation,
            structure.type,
            structure.prefet?.idStructureTransfert,
            structure.numeroDossierDS,
            structure.codeDepartement,
            structure.departement,
            structure.region,
            structure.phaseConventionnement === PhaseConventionnement.PHASE_2
              ? AffichagePhaseConventionnement.PHASE_2
              : AffichagePhaseConventionnement.PHASE_1,
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

const generateCsvHistoriqueContrats = async (
  contrats: any[],
  res: Response,
) => {
  try {
    const fileHeaders = [
      'Id du conseiller',
      'Nom du conseiller',
      'Prénom du conseiller',
      'Email du conseiller',
      'Id de la structure',
      'Nom de la structure',
      'Date de la demande',
      'Type de la demande',
      'Date de début de contrat',
      'Date de fin de contrat',
      'Type de contrat',
      'Motif de rupture',
    ];

    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...contrats.map((contrat) =>
          [
            contrat?.conseillerObj?.idPG,
            contrat?.conseillerObj?.nom,
            contrat?.conseillerObj?.prenom,
            contrat?.conseillerObj?.email,
            contrat?.structureObj?.idPG,
            contrat?.structureObj?.nom,
            formatDate(contrat?.dateDeLaDemande),
            contrat?.statut ?? 'Non renseigné',
            formatDate(contrat?.dateDebutDeContrat),
            formatDate(contrat?.dateFinDeContrat),
            contrat?.typeDeContrat ?? 'Non renseigné',
            contrat?.motifRupture ?? 'Non renseigné',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

export {
  generateCsvCandidat,
  generateCsvCandidatByStructure,
  generateCsvConseillersWithoutCRA,
  generateCsvStructure,
  generateCsvDemandesRuptures,
  generateCsvCandidaturesCoordinateur,
  generateCsvConseillersHub,
  generateCsvStatistiques,
  generateCsvTerritoires,
  generateCsvConseillers,
  generateCsvConseillersCoordonnes,
  generateCsvListeStructures,
  generateCsvListeGestionnaires,
  generateCsvHistoriqueDossiersConvention,
  generateCsvHistoriqueContrats,
  generateCsvTerritoiresPrefet,
  generateCsvStructureNonInteresserReconventionnement,
};
