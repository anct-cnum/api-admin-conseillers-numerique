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
  RECONVENTIONNEMENT_VALIDÉ = 'RECONVENTIONNEMENT_VALIDÉ',
  CONVENTIONNEMENT_VALIDÉ_PHASE_2 = 'CONVENTIONNEMENT_VALIDÉ_PHASE_2',
}

enum PhaseConventionnement {
  PHASE_1 = '1',
  PHASE_2 = '2',
}

export {
  TypeDossierReconventionnement,
  StatutConventionnement,
  PhaseConventionnement,
};
