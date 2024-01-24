const Joi = require('joi');

const validStructures = Joi.object({
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
  searchByNom: Joi.string().error(
    new Error('La recherche par nom est invalide'),
  ),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  type: Joi.string().error(new Error('Le filtre type est invalide')),
  statut: Joi.string().error(new Error('Le filtre statut est invalide')),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
});

const validExportStructures = Joi.object({
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
  searchByNom: Joi.string().error(
    new Error('La recherche par nom est invalide'),
  ),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  type: Joi.string().error(new Error('Le filtre type est invalide')),
  statut: Joi.string().error(new Error('Le filtre statut est invalide')),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
});

const updateEmail = Joi.string()
  .email()
  .required()
  .error(new Error("Le format de l'email est invalide"));

const updateContact = Joi.object({
  nom: Joi.string().required().error(new Error('Le nom est invalide')),
  prenom: Joi.string().required().error(new Error('Le prénom est invalide')),
  telephone: Joi.string()
    .required()
    .error(new Error('Le téléphone est invalide')),
  fonction: Joi.string()
    .required()
    .error(new Error('La fonction est invalide')),
});

const validCreationAvenant = Joi.object({
  type: Joi.string()
    .valid('retrait', 'ajout')
    .required()
    .error(new Error('Le type est invalide')),
  nombreDePostes: Joi.number()
    .required()
    .error(new Error('Le nombre de postes est invalide')),
  motif: Joi.string().required().error(new Error('Le motif est invalide')),
});

const avenantAjoutPoste = Joi.object({
  statut: Joi.string().required().error(new Error('Le statut est invalide')),
  nbDePosteAccorder: Joi.number()
    .required()
    .error(new Error('Le nombre de postes accordés est invalide')),
  nbDePosteCoselec: Joi.number()
    .required()
    .error(new Error('Le nombre de postes coselec est invalide')),
});

const avenantRenduPoste = Joi.object({
  nbDePosteRendu: Joi.number()
    .required()
    .error(new Error('Le nombre de postes rendus est invalide')),
  nbDePosteCoselec: Joi.number()
    .required()
    .error(new Error('Le nombre de postes coselec est invalide')),
});

const validExportCandidatsCoordinateurs = Joi.object({
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  statut: Joi.string().error(new Error('Le filtre statut est invalide')),
  search: Joi.string().error(new Error('La recherche par nom est invalide')),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
  avisPrefet: Joi.string().error(
    new Error('Le filtre avis préfet est invalide'),
  ),
});

const validDemandesConseiller = Joi.object({
  page: Joi.number().required().error(new Error('La pagination est invalide')),
  statut: Joi.string().required().error(new Error('Le statut est invalide')),
  ordre: Joi.number().required().error(new Error('Le tri est invalide')),
  nomOrdre: Joi.string()
    .required()
    .error(new Error('Le nom du tri est invalide')),
  search: Joi.string().error(
    new Error('La recherche par structure est invalide'),
  ),
  departement: Joi.string().error(
    new Error('Le filtre département est invalide'),
  ),
  region: Joi.string().error(new Error('Le filtre région est invalide')),
  avisPrefet: Joi.string().error(
    new Error("Le filtre sur l'avis du préfet est invalide"),
  ),
});

const demandeConseillerAvisPrefet = Joi.object({
  avisPrefet: Joi.string()
    .valid('favorable', 'défavorable')
    .required()
    .error(new Error('L avis est invalide')),
  commentaire: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .error(new Error('Le commentaire est invalide')),
});

export {
  validStructures,
  validExportStructures,
  updateEmail,
  validCreationAvenant,
  updateContact,
  avenantAjoutPoste,
  avenantRenduPoste,
  validExportCandidatsCoordinateurs,
  validDemandesConseiller,
  demandeConseillerAvisPrefet,
};
