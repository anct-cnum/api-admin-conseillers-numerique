import axios from 'axios';
import { CandidatureConseillerInput } from '../services/conseillers/controllers/creerCandidatureConseiller';

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

export {
  viderLesCollections,
  host,
  requetePost,
  requetePatch,
  champsObligatoiresFormConseiller,
  InitialisationDate,
};
