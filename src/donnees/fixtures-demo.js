/**
 * Jeu de données de démonstration — ENTIÈREMENT FICTIF.
 *
 * Noms, codes de locaux, références de documents, numéros GMAO et acteurs sont
 * inventés. Aucun export HEL-ISE, PRISME ou GMAO ; aucune URL interne (seuls des
 * domaines réservés `.invalid`). Chaque appel renvoie une copie neuve, ce qui
 * permet de réinitialiser l'adaptateur en mémoire.
 *
 * Repères : tous les identifiants commencent par « demo- », le site s'appelle
 * « SITE-DEMO » et les codes de discipline sont des exemples non validés.
 */

/** Acteurs fictifs. Les rôles sont déclaratifs : ce n'est pas une authentification. */
export const ACTEURS_DEMO = Object.freeze([
  Object.freeze({ id: "demo-acteur-agent", nom: "Agent Démo", roles: Object.freeze(["AGENT_MAINTENANCE"]) }),
  Object.freeze({ id: "demo-acteur-cdp", nom: "Chef de projet Démo", roles: Object.freeze(["CHEF_PROJET"]) }),
  Object.freeze({ id: "demo-acteur-rm", nom: "Responsable maintenance Démo", roles: Object.freeze(["RESPONSABLE_MAINTENANCE"]) }),
  Object.freeze({ id: "demo-acteur-rt", nom: "Responsable technique Démo", roles: Object.freeze(["RESPONSABLE_TECHNIQUE"]) }),
  Object.freeze({ id: "demo-acteur-bim", nom: "Référent BIM Démo", roles: Object.freeze([]) }),
]);

export function creerFixturesDemo() {
  return {
    operations: [
      {
        id: "demo-op-1",
        reference: "OP-2026-0001",
        origine: "CHANTIER",
        titre: "Réaménagement fictif de l'aile A",
        description: "Opération de démonstration regroupant plusieurs disciplines.",
        dateCreation: "2026-09-01T09:00:00+02:00",
        dateDebutPrevue: "2026-09-15T08:00:00+02:00",
        responsableId: "demo-acteur-cdp",
        referenceProjet: "PROJ-DEMO-01",
      },
      {
        id: "demo-op-2",
        reference: "OP-2026-0002",
        origine: "MAINTENANCE",
        titre: "Remplacement fictif d'un luminaire",
        dateCreation: "2026-10-05T14:30:00+02:00",
        gmaoSysteme: "GMAO-DEMO",
        gmaoNumeroOT: "OT-DEMO-0001",
        gmaoUrl: "https://gmao.demo.invalid/ot/OT-DEMO-0001",
      },
    ],
    modifications: [
      {
        id: "demo-mod-1",
        operationId: "demo-op-1",
        reference: "MOD-2026-0001",
        titre: "Déplacement fictif d'un tableau électrique",
        disciplineCode: "ELEC",
        declareParId: "demo-acteur-cdp",
        dateDeclaration: "2026-09-01T09:10:00+02:00",
        statutPhysique: "PLANIFIEE",
        impactDocumentaire: "MISE_A_JOUR_REQUISE",
        dateDecisionImpact: "2026-09-02T10:00:00+02:00",
      },
      {
        id: "demo-mod-2",
        operationId: "demo-op-1",
        reference: "MOD-2026-0002",
        titre: "Création fictive d'une gaine de ventilation",
        disciplineCode: "CVC",
        declareParId: "demo-acteur-cdp",
        dateDeclaration: "2026-09-01T09:20:00+02:00",
        statutPhysique: "PLANIFIEE",
        impactDocumentaire: "MISE_A_JOUR_REQUISE",
        dateDecisionImpact: "2026-09-02T10:05:00+02:00",
      },
      {
        id: "demo-mod-3",
        operationId: "demo-op-1",
        reference: "MOD-2026-0003",
        titre: "Remplacement fictif d'un lavabo",
        disciplineCode: "PLOMBERIE",
        declareParId: "demo-acteur-cdp",
        dateDeclaration: "2026-09-01T09:30:00+02:00",
        statutPhysique: "PLANIFIEE",
        impactDocumentaire: "A_QUALIFIER",
      },
      {
        id: "demo-mod-4",
        operationId: "demo-op-2",
        reference: "MOD-2026-0004",
        titre: "Luminaire fictif remplacé à l'identique",
        disciplineCode: "ELEC",
        declareParId: "demo-acteur-agent",
        dateDeclaration: "2026-10-05T14:30:00+02:00",
        dateExecution: "2026-10-04T11:00:00+02:00",
        statutPhysique: "REALISEE",
        impactDocumentaire: "A_QUALIFIER",
      },
    ],
    localisations: [
      { id: "demo-loc-1", type: "LOCAL", site: "SITE-DEMO", bloc: "A", etage: "N00", codeLocal: "001", referenceHelIse: "DEMO/A/N00/001" },
      { id: "demo-loc-2", type: "LOCAL", site: "SITE-DEMO", bloc: "A", etage: "N00", codeLocal: "002", referenceHelIse: "DEMO/A/N00/002" },
      { id: "demo-loc-3", type: "LOCAL", site: "SITE-DEMO", bloc: "A", etage: "N01", codeLocal: "101", referenceHelIse: "DEMO/A/N01/101" },
      { id: "demo-loc-4", type: "ZONE", site: "SITE-DEMO", bloc: "A", descriptionZone: "Gaine technique fictive, aile A" },
      { id: "demo-loc-5", type: "LOCAL", site: "SITE-DEMO-B", bloc: "B", etage: "N02", codeLocal: "201", referenceHelIse: "DEMO-B/B/N02/201" },
    ],
    liensLocalisation: [
      { modificationId: "demo-mod-1", localisationId: "demo-loc-1", modeIdentification: "RECHERCHE" },
      { modificationId: "demo-mod-2", localisationId: "demo-loc-1", modeIdentification: "RECHERCHE" },
      { modificationId: "demo-mod-2", localisationId: "demo-loc-2", modeIdentification: "RECHERCHE" },
      { modificationId: "demo-mod-2", localisationId: "demo-loc-3", modeIdentification: "RECHERCHE" },
      { modificationId: "demo-mod-2", localisationId: "demo-loc-4", modeIdentification: "ZONE" },
      { modificationId: "demo-mod-3", localisationId: "demo-loc-2", modeIdentification: "RECHERCHE" },
      { modificationId: "demo-mod-4", localisationId: "demo-loc-5", modeIdentification: "QR_SIMULE" },
    ],
    documents: [
      {
        id: "demo-doc-1",
        referenceStable: "DEMO-A-N00-PLAN-TECH",
        type: "DWG",
        origine: "PRISME_SIMULE",
        indiceConnu: "B",
        titre: "Plan technique fictif, aile A, niveau 0",
        uriExterne: "https://documents.demo.invalid/DEMO-A-N00-PLAN-TECH",
      },
      {
        id: "demo-doc-2",
        referenceStable: "DEMO-A-MAQUETTE",
        type: "RVT",
        origine: "MANUEL",
        titre: "Maquette fictive, aile A",
      },
    ],
    traitements: [
      {
        id: "demo-tr-1",
        documentId: "demo-doc-1",
        indiceDepart: "B",
        indiceCible: "C",
        assigneAId: "demo-acteur-bim",
        statut: "A_PREPARER",
        dateDemande: "2026-09-03T09:00:00+02:00",
      },
    ],
    // Une seule révision couvre deux modifications du même chantier.
    liensTraitement: [
      { modificationId: "demo-mod-1", traitementId: "demo-tr-1" },
      { modificationId: "demo-mod-2", traitementId: "demo-tr-1" },
    ],
    justificatifs: [
      {
        id: "demo-just-1",
        cibleType: "MODIFICATION",
        cibleId: "demo-mod-4",
        categorie: "PHOTO",
        libelle: "Photo fictive du luminaire posé",
        referenceFichierDemo: "photo-demo-luminaire.jpg",
        deposeParId: "demo-acteur-agent",
        dateDepot: "2026-10-05T14:31:00+02:00",
      },
    ],
    validations: [],
    evenements: [],
  };
}
