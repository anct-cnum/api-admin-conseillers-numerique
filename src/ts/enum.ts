enum TypeDossierReconventionnement {
  StructurePublique = 'structure_publique',
  Association = 'association',
  Entreprise = 'entreprise',
}

enum StatutConventionnement {
  NON_INTERESSÉ = 'NON_INTERESSÉ',
  CONVENTIONNEMENT_EN_COURS = 'CONVENTIONNEMENT_EN_COURS',
  CONVENTIONNEMENT_VALIDÉ = 'CONVENTIONNEMENT_VALIDÉ',
  RECONVENTIONNEMENT_INITIÉ = 'RECONVENTIONNEMENT_INITIÉ',
  RECONVENTIONNEMENT_EN_COURS = 'RECONVENTIONNEMENT_EN_COURS',
  RECONVENTIONNEMENT_VALIDÉ = 'RECONVENTIONNEMENT_VALIDÉ',
  RECONVENTIONNEMENT_REFUSÉ = 'RECONVENTIONNEMENT_REFUSÉ',
}

enum PhaseConventionnement {
  PHASE_2 = '2',
}

export {
  TypeDossierReconventionnement,
  StatutConventionnement,
  PhaseConventionnement,
};
