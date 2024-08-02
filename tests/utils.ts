async function viderLesCollections(app): Promise<void> {
  await app.service('conseillers').Model.deleteMany({});
  await app.service('permanences').Model.deleteMany({});
  await app.service('structures').Model.deleteMany({});
  await app.service('misesEnRelation').Model.deleteMany({});
  await app.service('conseillersSupprimes').Model.deleteMany({});
}

export default viderLesCollections;
