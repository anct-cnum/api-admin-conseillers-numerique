enum TypeDossierReconventionnement {
  StructurePublique = 'structure_publique',
  Association = 'association',
  Entreprise = 'entreprise',
}
enum StatutConventionnement {
  ENREGISTRÉ = 'ENREGISTRÉ',
  NON_INTERESSÉ = 'NON_INTERESSÉ',
  CONVENTIONNEMENT_EN_COURS = 'CONVENTIONNEMENT_EN_COURS',
  CONVENTIONNEMENT_VALIDÉ = 'CONVENTIONNEMENT_VALIDÉ',
  RECONVENTIONNEMENT_EN_COURS = 'RECONVENTIONNEMENT_EN_COURS',
  RECONVENTIONNEMENT_VALIDÉ = 'RECONVENTIONNEMENT_VALIDÉ',
}

export { TypeDossierReconventionnement, StatutConventionnement };
