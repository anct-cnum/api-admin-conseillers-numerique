import { Application } from '@feathersjs/express';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  StatutConventionnement,
  PhaseConventionnement,
} from '../../../ts/enum';

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

  return adresse.replace(/["']/g, '');
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

const getConseillersValider = (conseillers) => {
  const conseillersValiderReconventionnement = conseillers?.filter(
    (conseiller) =>
      conseiller.statut === 'recrutee' &&
      conseiller.phaseConventionnement === PhaseConventionnement.PHASE_2,
  );
  const conseillersValiderConventionnement = conseillers?.filter(
    (conseiller) =>
      conseiller.statut === 'recrutee' &&
      conseiller?.phaseConventionnement === undefined,
  );
  return {
    conseillersValiderReconventionnement,
    conseillersValiderConventionnement,
  };
};

const getConseillersRecruter = (conseillers) => {
  const conseillersRecruterConventionnement = conseillers?.filter(
    (conseiller) =>
      conseiller?.phaseConventionnement === undefined &&
      (conseiller.statut === 'finalisee' ||
        conseiller.statut === 'nouvelle_rupture' ||
        conseiller.statut === 'terminee'),
  );
  const conseillersRecruterReconventionnement = conseillers?.filter(
    (conseiller) =>
      conseiller.phaseConventionnement === PhaseConventionnement.PHASE_2 &&
      (conseiller.statut === 'finalisee' ||
        conseiller.statut === 'nouvelle_rupture'),
  );
  return {
    conseillersRecruterConventionnement,
    conseillersRecruterReconventionnement,
  };
};

const filterAvisPrefet = (avisPrefet) => {
  if (avisPrefet === undefined) {
    return {};
  }
  if (avisPrefet === 'sans-avis') {
    return { avisPrefet: { $exists: false } };
  }
  return { avisPrefet: { $eq: avisPrefet } };
};

const filterStatutAndAvisPrefetDemandesCoordinateur = (
  statutDemande: string,
  avisPrefet: string,
) => {
  if (statutDemande !== 'toutes') {
    return {
      demandesCoordinateur: {
        $elemMatch: {
          statut: { $eq: statutDemande },
          ...filterAvisPrefet(avisPrefet),
        },
      },
    };
  }
  return {
    demandesCoordinateur: {
      $elemMatch: {
        statut: { $in: ['en_cours', 'refusee', 'validee'] },
        ...filterAvisPrefet(avisPrefet),
      },
    },
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
  getConseillersValider,
  getConseillersRecruter,
  filterStatutAndAvisPrefetDemandesCoordinateur,
  checkStructurePhase2,
};
