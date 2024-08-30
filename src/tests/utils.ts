import axios from 'axios';

const viderLesCollections = async (app): Promise<void> => {
  await app.service('conseillers').Model.deleteMany({});
  await app.service('permanences').Model.deleteMany({});
  await app.service('structures').Model.deleteMany({});
  await app.service('misesEnRelation').Model.deleteMany({});
  await app.service('conseillersSupprimes').Model.deleteMany({});
};

const host = 'http://localhost:8181';

const requetePost = async (url, data) =>
  axios({
    method: 'POST',
    url: host + url,
    data,
    validateStatus: (status) => status < 500,
  });

export { viderLesCollections, host, requetePost };
