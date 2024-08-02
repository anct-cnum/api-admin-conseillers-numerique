const Joi = require('joi');

const validConseillers = Joi.object({
  skip: Joi.number().required().error(new Error('La pagination est invalide')),
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  searchByConseiller: Joi.string().error(
    new Error('La recherche par conseiller est invalide'),
  ),
  searchByStructure: Joi.string().error(
    new Error('La recherche par structure est invalide'),
  ),
  coordinateur: Joi.string().error(
    new Error('Le filtre coordinateur est invalide'),
  ),
  rupture: Joi.string().error(new Error('Le filtre rupture est invalide')),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  piecesManquantes: Joi.string().error(
    new Error('Le filtre pièces manquantes est invalide'),
  ),
});
const validConseillersCoordonnes = Joi.object({
  skip: Joi.number().required().error(new Error('La pagination est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  searchByConseiller: Joi.string().error(
    new Error('La recherche par conseiller est invalide'),
  ),
  searchByStructure: Joi.string().error(
    new Error('La recherche par structure est invalide'),
  ),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
});

const validExportConseillers = Joi.object({
  dateDebut: Joi.date()
    .required()
    .error(new Error('La date de début est invalide')),
  dateFin: Joi.date()
    .required()
    .error(new Error('La date de fin est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Nom du sort est invalide')),
  searchByConseiller: Joi.string().error(
    new Error('La recherche par conseiller est invalide'),
  ),
  searchByStructure: Joi.string().error(
    new Error('La recherche par structure est invalide'),
  ),
  coordinateur: Joi.string().error(
    new Error('Le filtre coordinateur est invalide'),
  ),
  rupture: Joi.string().error(new Error('Le filtre rupture est invalide')),
  region: Joi.string()
    .allow(null, '')
    .error(new Error('Le filtre région est invalide')),
  departement: Joi.string()
    .allow(null, '')
    .error(new Error('Le filtre département est invalide')),
  piecesManquantes: Joi.string().error(
    new Error('Le filtre pièces manquantes est invalide'),
  ),
});

const validCandidats = Joi.object({
  skip: Joi.number().required().error(new Error('La pagination est invalide')),
  search: Joi.string().error(
    new Error('La recherche par nom du candidat est invalide'),
  ),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
});

const validCandidatsStructure = Joi.object({
  skip: Joi.number().required().error(new Error('La pagination est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  search: Joi.string().error(
    new Error('La recherche par nom du candidat est invalide'),
  ),
  pix: Joi.string().error(new Error('Le filtre pix est invalide')),
  cv: Joi.string().error(new Error('Le filtre cv est invalide')),
  ccp1: Joi.string().error(new Error('Le filtre CCP1 est invalide')),
  diplome: Joi.string().error(new Error('Le filtre diplôme est invalide')),
});

const validCandidatureConseiller = Joi.object({
  prenom: Joi.string().required().error(new Error('Le prénom est requis')),
  nom: Joi.string().required().error(new Error('Le nom est requis')),
  email: Joi.string()
    .required()
    .error(new Error('L’adresse e-mail est requis')),
  telephone: Joi.string(),
  nomCommune: Joi.string().required().error(new Error('La ville est requise')),
  codePostal: Joi.string()
    .required()
    .min(5)
    .max(5)
    .error(new Error('Le code postal est invalide')),
  codeCommune: Joi.string()
    .required()
    .min(4)
    .max(5)
    .error(new Error('Le code commune est invalide')),
  location: Joi.object()
    .required()
    .error(new Error('La localisation est requise')),
  codeDepartement: Joi.string(),
  codeRegion: Joi.string(),
  codeCom: Joi.string(),
  // TODO : ajouter une validation pour qu'au moins un des champs soient à true
  estDemandeurEmploi: Joi.boolean(),
  estEnEmploi: Joi.boolean(),
  estEnFormation: Joi.boolean(),
  estDiplomeMedNum: Joi.boolean(),
  nomDiplomeMedNum: Joi.string(),
  aUneExperienceMedNum: Joi.boolean()
    .required()
    .error(new Error('L’experience médiateur numérique est requise')),
  dateDisponibilite: Joi.date().required(),
  distanceMax: Joi.number()
    .required()
    .allow(5, 10, 15, 20, 40, 100, 2000)
    .error(new Error('La distance est invalide')),
  motivation: Joi.string()
    .required()
    .error(new Error('La motivation est requise')),
});

export {
  validConseillers,
  validExportConseillers,
  validCandidats,
  validCandidatsStructure,
  validConseillersCoordonnes,
  validCandidatureConseiller,
};
