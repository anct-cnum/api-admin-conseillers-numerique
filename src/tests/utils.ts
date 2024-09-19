import axios from 'axios';
import { CandidatureConseillerInput } from '../services/conseillers/controllers/creerCandidatureConseiller';
import { CandidatureStructureInput } from '../services/structures/controllers/creerCandidatureStructure';
import { CandidatureStructureCoordinateurInput } from '../services/structures/controllers/creerCandidatureStructureCoordinateur';

const viderLesCollections = async (app): Promise<void> => {
  await app.service('conseillers').Model.deleteMany({});
  await app.service('permanences').Model.deleteMany({});
  await app.service('structures').Model.deleteMany({});
  await app.service('misesEnRelation').Model.deleteMany({});
  await app.service('conseillersSupprimes').Model.deleteMany({});
};

const host = 'http://localhost:8181';

class InitialisationDate extends Date {
  constructor() {
    super('2024-09-01T11:00:00.000Z');
  }
}

const requetePost = async (url, data) =>
  axios({
    method: 'POST',
    url: host + url,
    data,
    validateStatus: (status) => status < 500,
  });

const requetePatch = async (url) =>
  axios({
    method: 'PATCH',
    url: host + url,
    validateStatus: (status) => status < 500,
  });

const champsObligatoiresFormConseiller: CandidatureConseillerInput = {
  prenom: 'Jean',
  nom: 'Martin',
  email: 'jean.martin@example.com',
  nomCommune: 'Paris',
  codePostal: '75001',
  codeCommune: '75000',
  codeDepartement: '75',
  codeRegion: '75',
  codeCom: null,
  location: {
    type: 'Point',
    coordinates: [0, 0],
  },
  aUneExperienceMedNum: false,
  dateDisponibilite: new Date(3024, 8, 1, 13),
  distanceMax: 5,
  motivation: 'Ma motivation',
  telephone: '',
  estDemandeurEmploi: true,
  estEnEmploi: false,
  estEnFormation: false,
  estDiplomeMedNum: false,
  nomDiplomeMedNum: '',
  'h-captcha-response': 'captcha',
};

const champsObligatoireStructure: CandidatureStructureInput = {
  type: 'PRIVATE',
  nom: 'MAIRIE',
  siret: '12345678910',
  ridet: null,
  aIdentifieCandidat: false,
  dateDebutMission: new Date(),
  contact: {
    prenom: 'camélien',
    nom: 'rousseau',
    fonction: 'PRESIDENTE',
    email: 'camlien_rousseau74@example.net',
    telephone: '+33751756469',
  },
  nomCommune: 'Paris',
  codePostal: '75001',
  codeCommune: '75000',
  codeDepartement: '75',
  codeRegion: '75',
  codeCom: '',
  location: {
    type: 'Point',
    coordinates: [0, 0],
  },
  nombreConseillersSouhaites: 1,
  motivation: 'Je suis motivé.',
  confirmationEngagement: true,
};

const champsObligatoireStructureCoordinateur: CandidatureStructureCoordinateurInput =
  {
    type: 'PRIVATE',
    nom: 'MAIRIE',
    siret: '12345678910',
    ridet: null,
    contact: {
      prenom: 'camélien',
      nom: 'rousseau',
      fonction: 'PRESIDENTE',
      email: 'camlien_rousseau74@example.net',
      telephone: '+33751756469',
    },
    nomCommune: 'Paris',
    codePostal: '75001',
    codeCommune: '75000',
    codeDepartement: '75',
    codeRegion: '75',
    codeCom: '',
    location: {
      type: 'Point',
      coordinates: [0, 0],
    },
    dateDebutMission: new Date(3024, 8, 1, 13),
    aIdentifieCoordinateur: true,
    coordinateurTypeContrat: 'PT',
    motivation: 'Je suis motivé.',
    confirmationEngagement: true,
    'h-captcha-response': 'captcha',
  };

export {
  viderLesCollections,
  host,
  requetePost,
  requetePatch,
  champsObligatoiresFormConseiller,
  InitialisationDate,
  champsObligatoireStructure,
  champsObligatoireStructureCoordinateur,
};
