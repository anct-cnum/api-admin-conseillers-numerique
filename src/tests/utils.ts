const viderLesCollections = async (app): Promise<void> => {
  await app.service('conseillers').Model.deleteMany({});
  await app.service('permanences').Model.deleteMany({});
  await app.service('structures').Model.deleteMany({});
  await app.service('misesEnRelation').Model.deleteMany({});
  await app.service('conseillersSupprimes').Model.deleteMany({});
};

const host = 'http://localhost:8181';

const convertionDateIsoHoraire = (date) => {
  const dateOriginale = new Date(date);
  const dateMaintenant = new Date();
  const dateChanger = dateMaintenant.setTime(dateOriginale.getTime());
  const formatDate = new Date(dateChanger).toISOString();
  return formatDate.toString();
};

export { viderLesCollections, host, convertionDateIsoHoraire };
