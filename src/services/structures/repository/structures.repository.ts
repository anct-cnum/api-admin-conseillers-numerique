import { Application } from '@feathersjs/express';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { StatutConventionnement } from '../../../ts/enum';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
// eslint-disable-next-line import/no-cycle
import { sortArrayConventionnement } from './reconventionnement.repository';

type IConseiller = {
  idPG: number;
  nom: string;
  prenom: string;
  _id: string;
  statut: string;
  phaseConventionnement: string;
  reconventionnement: boolean;
  typeDeContrat: string;
};

const countStructures = async (ability, read, app) =>
  app
    .service(service.structures)
    .Model.accessibleBy(ability, read)
    .countDocuments({
      statut: 'VALIDATION_COSELEC',
    });

const getStructuresIds = async (page, limit, ability, read, app) =>
  app
    .service(service.structures)
    .Model.accessibleBy(ability, read)
    .find({
      statut: 'VALIDATION_COSELEC',
    })
    .skip(page)
    .limit(limit);

const checkAccessReadRequestStructures = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const filterSearchBar = (input: string) => {
  const inputSearchBar = input?.trim();
  if (inputSearchBar) {
    return {
      $or: [
        { nom: { $regex: `(?'name'${inputSearchBar}.*$)`, $options: 'i' } },
        { siret: { $regex: `(?'name'${inputSearchBar}.*$)`, $options: 'i' } },
        { idPGStr: { $regex: `(?'name'${inputSearchBar}.*$)`, $options: 'i' } },
        {
          'contact.email': {
            $regex: `(?'name'${inputSearchBar}.*$)`,
            $options: 'i',
          },
        },
      ],
    };
  }
  return {};
};

const checkStructurePhase2 = (statut: string) => {
  if (statut === StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ) {
    return true;
  }
  if (statut === StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2) {
    return true;
  }
  return false;
};
// Dans le cas où on voudrait vérifier si la structure peut être ou est déjà Primo phase 2
const checkIfStructurePrimoPhase2 = (structure: IStructures) =>
  structure?.conventionnement?.statut ===
    StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2 ||
  structure.statut === 'CREEE';

const filterRegion = (region: string) => (region ? { codeRegion: region } : {});

const filterDepartement = (departement: string) => {
  if (departement === '978') {
    return { codeCom: departement };
  }
  if (departement) {
    return { codeDepartement: departement };
  }
  return {};
};

const filterType = (type: string) => {
  if (type === 'PRIVATE') {
    return { type: { $eq: 'PRIVATE' } };
  }
  if (type === 'PUBLIC') {
    return { type: { $ne: 'PRIVATE' } };
  }

  return {};
};

const filterStatut = (statut: string) => (statut ? { statut } : {});

const formatAdresseStructure = (insee) => {
  const adresse = `${insee?.adresse?.numero_voie ?? ''} ${
    insee?.adresse?.type_voie ?? ''
  } ${insee?.adresse?.libelle_voie ?? ''} ${
    insee?.adresse?.complement_adresse
      ? `${insee.adresse.complement_adresse} `
      : ' '
  }${insee?.adresse?.code_postal ?? ''} ${
    insee?.adresse?.libelle_commune ?? ''
  }`;

  return adresse.replace(/["',]/g, '');
};

const filterSortColonne = (nomOrdre: string, ordre: number) => {
  if (nomOrdre === 'idPG') {
    return JSON.parse(`{"${nomOrdre}":${ordre}}`);
  }
  // Pour éviter le problème de pagination sur une colonne qui peut contenir des valeurs communes
  return JSON.parse(`{"${nomOrdre}":${ordre}, "idPG": 1}`);
};

const formatQpv = (qpv: string) => (qpv === 'Oui' ? 'Oui' : 'Non');

const formatZrr = (estZRR: boolean) => (estZRR === true ? 'Oui' : 'Non');

const formatType = (type: string) => (type === 'PRIVATE' ? 'Privée' : 'Public');

const getNameStructure =
  (app: Application, req: IRequest) => async (idStructure: number) =>
    app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ idPG: idStructure })
      .select({ nom: 1, _id: 0 });

const getConseillersByStatus = (
  conseillers: IConseiller[],
  statuts: string[],
  phase = undefined,
) => {
  return conseillers.filter(
    (conseiller) =>
      statuts.includes(conseiller.statut) &&
      conseiller.phaseConventionnement === phase,
  );
};

const filterAvisAdmin = (avisAdmin: string | undefined) => {
  if (avisAdmin) {
    return { statut: avisAdmin };
  }
  return {
    statut: { $in: ['VALIDATION_COSELEC', 'REFUS_COSELEC'] },
  };
};

const filterAvisPrefetPrimoEntrante = (avisPrefet: string | undefined) => {
  if (avisPrefet === 'sans-avis') {
    return { 'lastPrefet.avisPrefet': { $nin: ['NÉGATIF', 'POSITIF'] } };
  }
  if (avisPrefet === 'favorable') {
    return { 'lastPrefet.avisPrefet': { $eq: 'POSITIF' } };
  }
  if (avisPrefet === 'défavorable') {
    return { 'lastPrefet.avisPrefet': { $eq: 'NÉGATIF' } };
  }
  return {};
};

const filterStatutDemandeConseiller = (statut: string) => {
  if (statut === 'NOUVELLE') {
    return { statut: { $in: ['CREEE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'] } };
  }
  if (statut !== 'toutes' && statut !== 'NOUVELLE') {
    return { statut: { $eq: statut } };
  }
  return {
    statut: {
      $in: [
        'CREEE',
        'EXAMEN_COMPLEMENTAIRE_COSELEC',
        'VALIDATION_COSELEC',
        'REFUS_COSELEC',
      ],
    },
  };
};

const filterAvisPrefet = (avisPrefet: string | undefined) => {
  if (avisPrefet === undefined) {
    return {};
  }
  if (avisPrefet === 'sans-avis') {
    return { avisPrefet: { $exists: false } };
  }
  return { avisPrefet: { $eq: avisPrefet } };
};

const filterStatutDemandeDePostes = (type: string, avisPrefet: string) => {
  if (type === 'posteValider') {
    return {
      $or: [
        {
          statut: { $eq: 'VALIDATION_COSELEC' },
          coordinateurCandidature: false,
          ...filterAvisPrefetPrimoEntrante(avisPrefet),
        },
        {
          demandesCoselec: {
            $elemMatch: {
              statut: { $eq: 'validee' },
              type: { $eq: 'ajout' },
              ...filterAvisPrefet(avisPrefet),
            },
          },
        },
      ],
    };
  }
  if (type === 'posteRefuser') {
    return {
      $or: [
        {
          statut: { $eq: 'REFUS_COSELEC' },
          coordinateurCandidature: false,
          ...filterAvisPrefetPrimoEntrante(avisPrefet),
        },
        {
          demandesCoselec: {
            $elemMatch: {
              statut: { $eq: 'refuser' },
              type: { $eq: 'ajout' },
              ...filterAvisPrefet(avisPrefet),
            },
          },
        },
      ],
    };
  }
  if (type === 'posteRendu') {
    return {
      demandesCoselec: {
        $elemMatch: {
          statut: { $eq: 'en_cours' },
          type: { $eq: 'retrait' },
        },
      },
    };
  }

  return {
    $or: [
      {
        statut: { $in: ['CREEE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'] },
        coordinateurCandidature: false,
        ...filterAvisPrefetPrimoEntrante(avisPrefet),
      },
      {
        demandesCoselec: {
          $elemMatch: {
            statut: { $eq: 'en_cours' },
            type: { $eq: 'ajout' },
            ...filterAvisPrefet(avisPrefet),
          },
        },
      },
    ],
  };
};

const formatAvenantForDemandeConseiller = (
  structures,
  statut: string,
  type: string,
) =>
  structures
    .filter((structure) => structure?.demandesCoselec?.length > 0)
    .map((structure) => {
      const avenantEnCours = structure.demandesCoselec.find(
        (demande) => demande.statut === statut && demande.type === type,
      );
      if (!avenantEnCours) {
        return {};
      }
      avenantEnCours.dateSorted = avenantEnCours.emetteurAvenant.date;
      avenantEnCours.typeConvention =
        avenantEnCours.type === 'retrait'
          ? 'avenantRenduPoste'
          : 'avenantAjoutPoste';
      avenantEnCours.idPG = structure.idPG;
      avenantEnCours.nom = structure.nom;
      avenantEnCours.idStructure = structure._id;
      avenantEnCours.codePostal = structure.codePostal;

      return avenantEnCours;
    });

const formatStructureForDemandeConseiller = (
  structures: IStructures[],
  status: string[],
) =>
  structures
    .filter(
      (structure: IStructures) =>
        status.includes(structure?.statut) &&
        !structure.coordinateurCandidature,
    )
    .map((structure: IStructures) => {
      return {
        ...structure,
        dateSorted: structure.createdAt,
        typeConvention: 'structure',
      };
    });

const sortGestionDemandesConseiller = (
  type: string,
  ordre: number,
  structures: any,
) => {
  let avenantSort: any = [];
  let structurePrimoEntrante: any = [];
  if (type === 'demandePoste') {
    avenantSort = formatAvenantForDemandeConseiller(
      structures,
      'en_cours',
      'ajout',
    );
    structurePrimoEntrante = formatStructureForDemandeConseiller(structures, [
      'CREEE',
      'EXAMEN_COMPLEMENTAIRE_COSELEC',
    ]);
  }
  if (type === 'posteValider') {
    avenantSort = formatAvenantForDemandeConseiller(
      structures,
      'validee',
      'ajout',
    );
    structurePrimoEntrante = formatStructureForDemandeConseiller(structures, [
      'VALIDATION_COSELEC',
    ]);
  }
  if (type === 'posteRefuser') {
    avenantSort = formatAvenantForDemandeConseiller(
      structures,
      'refusee',
      'ajout',
    );
    structurePrimoEntrante = formatStructureForDemandeConseiller(structures, [
      'REFUS_COSELEC',
    ]);
  }
  if (type === 'posteRendu') {
    avenantSort = formatAvenantForDemandeConseiller(
      structures,
      'en_cours',
      'retrait',
    );
  }
  const structureFormat = avenantSort.concat(structurePrimoEntrante);

  return sortArrayConventionnement(structureFormat, ordre);
};

const totalParDemandesConseiller = async (app: Application, req: IRequest) => {
  const checkAccess = await checkAccessReadRequestStructures(app, req);
  const structurePrimoEntrante = await app
    .service(service.structures)
    .Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          statut: {
            $in: [
              'CREEE',
              'EXAMEN_COMPLEMENTAIRE_COSELEC',
              'VALIDATION_COSELEC',
              'REFUS_COSELEC',
            ],
          },
          coordinateurCandidature: false,
        },
      },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 },
        },
      },
    ]);
  const countAvenant = await app.service(service.structures).Model.aggregate([
    {
      $match: {
        $and: [checkAccess],
      },
    },
    { $unwind: '$demandesCoselec' },
    {
      $group: {
        _id: {
          statut: '$demandesCoselec.statut',
          type: '$demandesCoselec.type',
        },
        count: { $sum: 1 },
      },
    },
  ]);
  const totalAvenantAjoutPosteEnCours =
    countAvenant.find(
      (element) =>
        element._id.type === 'ajout' && element._id.statut === 'en_cours',
    )?.count ?? 0;
  const totalAvenantAjoutPosteValider =
    countAvenant.find(
      (element) =>
        element._id.type === 'ajout' && element._id.statut === 'validee',
    )?.count ?? 0;
  const totalAvenantAjoutPosteRefuser =
    countAvenant.find(
      (element) =>
        element._id.type === 'ajout' && element._id.statut === 'refusee',
    )?.count ?? 0;
  const totalPosteRenduEnCours =
    countAvenant.find(
      (element) =>
        element._id.type === 'retrait' && element._id.statut === 'en_cours',
    )?.count ?? 0;
  const totalStructureDemandePoste =
    structurePrimoEntrante.find(
      (element) => element._id === 'CREEE' || 'EXAMEN_COMPLEMENTAIRE_COSELEC',
    )?.count ?? 0;
  const totalStructurePosteValider =
    structurePrimoEntrante.find(
      (element) => element._id === 'VALIDATION_COSELEC',
    )?.count ?? 0;
  const totalStructurePosteRefuser =
    structurePrimoEntrante.find((element) => element._id === 'REFUS_COSELEC')
      ?.count ?? 0;
  const totalDemandePoste =
    totalAvenantAjoutPosteEnCours + totalStructureDemandePoste;
  const totalPosteValider =
    totalAvenantAjoutPosteValider + totalStructurePosteValider;
  const totalPosteRefuser =
    totalAvenantAjoutPosteRefuser + totalStructurePosteRefuser;

  return {
    totalDemandePoste,
    totalPosteValider,
    totalPosteRefuser,
    totalPosteRenduEnCours,
  };
};

export {
  checkAccessReadRequestStructures,
  filterDepartement,
  filterSearchBar,
  filterType,
  filterRegion,
  filterStatut,
  countStructures,
  getStructuresIds,
  formatAdresseStructure,
  formatQpv,
  formatZrr,
  formatType,
  filterSortColonne,
  getNameStructure,
  getConseillersByStatus,
  checkStructurePhase2,
  checkIfStructurePrimoPhase2,
  filterAvisAdmin,
  filterAvisPrefet,
  filterAvisPrefetPrimoEntrante,
  filterStatutDemandeConseiller,
  filterStatutDemandeDePostes,
  sortGestionDemandesConseiller,
  totalParDemandesConseiller,
};
