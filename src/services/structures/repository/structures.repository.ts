import { Application } from '@feathersjs/express';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { StatutConventionnement } from '../../../ts/enum';
import { IStructures } from '../../../ts/interfaces/db.interfaces';

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

const checkQuotaRecrutementCoordinateur = async (
  app: Application,
  structure: IStructures,
) => {
  const countDemandesCoordinateurValider =
    structure?.demandesCoordinateur?.filter(
      (demandeCoordinateur) => demandeCoordinateur.statut === 'validee',
    ).length;
  if (countDemandesCoordinateurValider > 0) {
    const countCoordinateursEnRecrutement = await app
      .service(service.misesEnRelation)
      .Model.countDocuments({
        'structure.$id': structure._id,
        statut: 'recrutee',
        contratCoordinateur: true,
      });
    const coordinateurs = await app
      .service(service.conseillers)
      .Model.aggregate([
        {
          $match: {
            structureId: structure._id,
            statut: 'RECRUTE',
            estCoordinateur: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            let: { idConseiller: '$_id' },
            as: 'users',
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: ['$$idConseiller', '$entity.oid'],
                      },
                    },
                    {
                      $expr: { $in: ['coordinateur_coop', '$roles'] },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]);
    const countCoordinateur =
      coordinateurs.length > 0 ? coordinateurs[0].count : 0;
    return (
      countCoordinateur + countCoordinateursEnRecrutement <
      countDemandesCoordinateurValider
    );
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

const getConseillersByStatus = (conseillers, statuts, phase = undefined) => {
  return conseillers.filter(
    (conseiller) =>
      statuts.includes(conseiller.statut) &&
      conseiller.phaseConventionnement === phase,
  );
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

const checkAvisPrefet = (filtreAvisPrefet: string, avisPrefet: string) => {
  if (filtreAvisPrefet === 'sans-avis' && avisPrefet === undefined) {
    return true;
  }
  if (avisPrefet === filtreAvisPrefet || filtreAvisPrefet === undefined) {
    return true;
  }
  return false;
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
  filterStatutAndAvisPrefetDemandesCoordinateur,
  checkStructurePhase2,
  checkAvisPrefet,
  checkQuotaRecrutementCoordinateur,
};
