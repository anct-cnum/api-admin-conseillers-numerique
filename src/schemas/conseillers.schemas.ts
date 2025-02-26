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
  prenom: Joi.string()
    .trim()
    .required()
    .error(new Error('Le prénom est requis')),
  nom: Joi.string().trim().required().error(new Error('Le nom est requis')),
  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .required()
    .error(new Error('L’adresse e-mail est invalide')),
  telephone: Joi.string()
    .optional()
    .trim()
    .allow('', null)
    .pattern(/^(\+\d{11,12}|\d{10})$/)
    .error(new Error('Le numéro de téléphone est invalide')),
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
  location: Joi.object({
    coordinates: Joi.array()
      .required()
      .items(Joi.number(), Joi.number())
      .error(new Error('Les coordonées sont invalides')),
    type: Joi.string().required().error(new Error('Le type est invalide')),
  })
    .required()
    .messages({
      'any.required': 'La localisation est requise',
    }),
  codeDepartement: Joi.string()
    .required()
    .error(new Error('Le code département est requis')),
  codeRegion: Joi.string()
    .required()
    .error(new Error('Le code région est requis')),
  codeCom: Joi.string()
    .required()
    .allow(null)
    .error(new Error('Le codeCom est invalide')),
  estDemandeurEmploi: Joi.boolean().required(),
  estEnEmploi: Joi.boolean().required(),
  estEnFormation: Joi.boolean().required(),
  estDiplomeMedNum: Joi.boolean().required(),
  nomDiplomeMedNum: Joi.string()
    .when('estDiplomeMedNum', {
      is: Joi.boolean().valid(true),
      then: Joi.string().required(),
      otherwise: Joi.valid(''),
    })
    .error(new Error('Le nom du diplôme est requis')),
  aUneExperienceMedNum: Joi.boolean().required(),
  dateDisponibilite: Joi.date()
    .min(new Date().toISOString().slice(0, 10))
    .required()
    .messages({
      'date.min': 'La date doit être supérieure ou égale à la date du jour',
      'any.required': 'La date est requise',
    }),
  distanceMax: Joi.number()
    .required()
    .valid(5, 10, 15, 20, 40, 100, 2000)
    .error(new Error('La distance est invalide')),
  motivation: Joi.string().trim().max(2500).required().messages({
    'string.max': 'La motivation ne doit pas dépasser 2500 caractères',
    'any.required': 'La motivation est requise',
  }),
  'cf-turnstile-response': Joi.string()
    .required()
    .error(new Error('Le captcha est obligatoire')),
}).when(
  Joi.object({
    estDemandeurEmploi: Joi.valid(false),
    estEnEmploi: Joi.valid(false),
    estEnFormation: Joi.valid(false),
    estDiplomeMedNum: Joi.valid(false),
    aUneExperienceMedNum: Joi.valid(false),
  }).unknown(),
  {
    then: Joi.object({
      estDemandeurEmploi: Joi.boolean()
        .invalid(false)
        .error(new Error('L’experience médiateur numérique est requise')),
    }),
  },
);

export {
  validConseillers,
  validExportConseillers,
  validCandidats,
  validCandidatsStructure,
  validConseillersCoordonnes,
  validCandidatureConseiller,
};
