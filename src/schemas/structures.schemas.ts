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
  statutDemande: Joi.string()
    .required()
    .valid('demandePoste', 'posteValider', 'posteRefuser', 'posteRendu')
    .error(new Error('Le statut de la demande est invalide')),
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

const commentaireConseillerAvisPrefet = Joi.object({
  commentaire: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .error(new Error('Le commentaire est invalide')),
});

const validCandidatureStructure = Joi.object({
  type: Joi.string()
    .required()
    .valid(
      'COMMUNE',
      'DEPARTEMENT',
      'REGION',
      'EPCI',
      'COLLECTIVITE',
      'GIP',
      'PRIVATE',
    )
    .error(new Error('Le type est invalide')),
  nom: Joi.string().trim().required().error(new Error('Le nom est requis')),
  siret: Joi.string()
    .trim()
    .replace(/\s/g, '')
    .min(14)
    .max(14)
    .allow(null)
    .required()
    .error(new Error('Le SIRET est requis')),
  ridet: Joi.string()
    .when('siret', {
      is: Joi.valid(null),
      then: Joi.string().trim().replace(/\s/g, '').min(7).max(7).required(),
      otherwise: Joi.valid(null),
    })
    .error(new Error('Le SIRET ou le RIDET est requis')),
  aIdentifieCandidat: Joi.boolean()
    .required()
    .error(new Error('L’identification du candidat est requise')),
  dateDebutMission: Joi.date()
    .min(new Date().toISOString().slice(0, 10))
    .required()
    .messages({
      'date.min': 'La date doit être supérieure ou égale à la date du jour',
      'any.required': 'La date de début de mission est invalide',
    }),
  contact: Joi.object({
    prenom: Joi.string()
      .trim()
      .required()
      .error(new Error('Le prénom est requis')),
    nom: Joi.string().trim().required().error(new Error('Le nom est requis')),
    fonction: Joi.string()
      .trim()
      .required()
      .error(new Error('La fonction est requise')),
    email: Joi.string()
      .trim()
      .email()
      .required()
      .error(new Error('L’adresse e-mail est invalide')),
    telephone: Joi.string()
      .required()
      .trim()
      .pattern(/^(\+\d{11,12}|\d{10})$/)
      .error(new Error('Le numéro de téléphone est invalide')),
  })
    .required()
    .messages({
      'any.required': 'Le contact est requis',
    }),
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
  codeDepartement: Joi.string()
    .required()
    .error(new Error('Le code département est requis')),
  codeRegion: Joi.string()
    .required()
    .error(new Error('Le code région est requis')),
  codeCom: Joi.string()
    .required()
    .allow('', null)
    .error(new Error('Le codeCom est invalide')),
  location: Joi.object({
    coordinates: Joi.array()
      .required()
      .items(Joi.number(), Joi.number())
      .error(new Error('Les coordonées sont invalide')),
    type: Joi.string().required().error(new Error('Le type est invalide')),
  })
    .required()
    .messages({
      'any.required': 'La location est requis',
    }),
  nombreConseillersSouhaites: Joi.number()
    .min(1)
    .required()
    .error(new Error('Le nombre de conseillers souhaités est invalide')),
  motivation: Joi.string().trim().max(2500).required().messages({
    'string.max': 'La motivation ne doit pas dépasser 2500 caractères',
    'any.required': 'La motivation est requise',
  }),
  confirmationEngagement: Joi.boolean()
    .valid(true)
    .required()
    .error(new Error('La confirmation d’engagement est requise')),
  'cf-turnstile-response': Joi.string()
    .required()
    .error(new Error('Le captcha est obligatoire')),
});

const validCandidatureStructureCoordinateur = Joi.object({
  type: Joi.string()
    .required()
    .valid(
      'COMMUNE',
      'DEPARTEMENT',
      'REGION',
      'EPCI',
      'COLLECTIVITE',
      'GIP',
      'PRIVATE',
    )
    .error(new Error('Le type est invalide')),
  nom: Joi.string().trim().required().error(new Error('Le nom est requis')),
  siret: Joi.string()
    .trim()
    .replace(/\s/g, '')
    .min(14)
    .max(14)
    .allow(null)
    .required()
    .error(new Error('Le siret est requis')),
  ridet: Joi.string()
    .when('siret', {
      is: Joi.valid(null),
      then: Joi.string().trim().replace(/\s/g, '').min(7).max(7).required(),
      otherwise: Joi.valid(null),
    })
    .error(new Error('Le SIRET ou le RIDET est requis')),
  dateDebutMission: Joi.date()
    .min(new Date().toISOString().slice(0, 10))
    .required()
    .messages({
      'date.min': 'La date doit être supérieur à la date du jour',
      'any.required': 'La date de début mission est requise',
    }),
  contact: Joi.object({
    prenom: Joi.string()
      .trim()
      .required()
      .error(new Error('Le prénom est requis')),
    nom: Joi.string().trim().required().error(new Error('Le nom est requis')),
    fonction: Joi.string()
      .trim()
      .required()
      .error(new Error('La fonction est requise')),
    email: Joi.string()
      .trim()
      .email()
      .required()
      .error(new Error('L’adresse e-mail est invalide')),
    telephone: Joi.string()
      .trim()
      .required()
      .pattern(/^(\+\d{11,12}|\d{10})$/)
      .error(new Error('Le numéro de téléphone est invalide')),
  })
    .required()
    .messages({
      'any.required': 'Le contact est requis',
    }),
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
  codeDepartement: Joi.string()
    .required()
    .error(new Error('Le code département est requis')),
  codeRegion: Joi.string()
    .required()
    .error(new Error('Le code région est requis')),
  codeCom: Joi.string()
    .required()
    .allow('', null)
    .error(new Error('Le codeCom est invalide')),
  location: Joi.object({
    coordinates: Joi.array()
      .required()
      .items(Joi.number(), Joi.number())
      .error(new Error('Les coordonées sont invalide')),
    type: Joi.string().required().error(new Error('Le type est invalide')),
  })
    .required()
    .messages({
      'any.required': 'La localisation est requise',
    }),
  coordinateurTypeContrat: Joi.string()
    .required()
    .valid('PT', 'FT')
    .error(
      new Error('L’identification de la mission du coordinateur est requise'),
    ),
  aIdentifieCoordinateur: Joi.boolean()
    .required()
    .error(new Error('L’identification du coordinateur est requise')),
  motivation: Joi.string().trim().max(2500).required().messages({
    'string.max': 'La motivation ne doit pas dépasser 2500 caractères',
    'any.required': 'La motivation est requise',
  }),
  confirmationEngagement: Joi.boolean()
    .valid(true)
    .required()
    .error(new Error('La confirmation d’engagement est requise')),
  'cf-turnstile-response': Joi.string()
    .required()
    .error(new Error('Le captcha est obligatoire')),
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
  commentaireConseillerAvisPrefet,
  validCandidatureStructure,
  validCandidatureStructureCoordinateur,
};
