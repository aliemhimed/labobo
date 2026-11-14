/* Puts pictures from the lecture slides into the study guides.

     node study-guides/figures.cjs <unpacked-decks-folder> [--images-only]

   Each deck (.pptx) is unpacked into <unpacked-decks-folder>/<deck key>.
   PICKS below says, for each guide section, which slide picture to use
   (the deck key and the picture's number in slide-pictures.json, the
   list made by slide-sheets.cjs) and its caption. This script
     1. copies each picture to study-guides/img/slides/<part>/<guide>/,
        shrunk to at most 1400 px wide (PowerShell, System.Drawing);
     2. writes a <figure> block at the top of each section, right under its
        heading. Blocks it wrote before (marked data-auto="slides") are
        removed first, so it can be run again after changing PICKS.
   Images are referenced as /guides/img/..., which the site will serve from
   public/guides/img/ once the guides go live. */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const DECKS = process.argv[2];
if (!DECKS || !fs.existsSync(path.join(DECKS, '..', 'slide-pictures.json'))) {
  console.error('usage: node study-guides/figures.cjs <unpacked-decks-folder>  (slide-pictures.json must sit next to it)');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(DECKS, '..', 'slide-pictures.json'), 'utf8'));

const D = {
  EP: 'his_epithelium', OR: 'his_organelles_1_', H3: 'his_histology_lecture_3_', H4: 'his_histology_lecture_4',
  H7: 'his_histology_lecture_7', H89: 'his_histology_lecture_8_9_2_', H10: 'his_histology_lecture_10_1_',
  H13: 'his_histology_lecture_13', H14: 'his_histology_lecture_14',
  M1: 'mol_gen_1_molecular_biology_lecture_1_2024_spring_', M2: 'mol_gen_1_molecular_biology_lecture_2_2025',
  M3: 'mol_gen_1_molecular_biology_lecture_3_2025', M4: 'mol_gct_1_molecular_biology_lecture_4_2025_fall_1_',
  M6: 'mol_gen_1_molecular_biology_lecture_6_2025_fall', M7: 'mol_gen_1_molecular_biology_lecture_7_2025_fall',
  M8: 'mol_molecular_biology_lecture_8_2026_spring', M9: 'mol_gen_1_molecular_biology_lecture_9_2024',
  M10: 'mol_gen_1_molecular_biology_lecture_10_2024', M11: 'mol_gen_1_molecular_biology_lecture_11_endocytosis_2024_1_',
  M14: 'mol_gen_1_molecular_biology_lecture_14_final_2025_1_',
  G1: 'med_medical_genetics_week_1', G2: 'med_medical_genetics_week_2', G3: 'med_medical_genetics_week_3',
  G4: 'med_medical_genetics_week_4', G5: 'med_medical_genetics_week_5', G6: 'med_medical_genetics_week_6',
  G7: 'med_medical_genetics_week_7', G10: 'med_medical_genetics_week_10', G11: 'med_medical_genetics_week_11_1_',
  G12: 'med_medical_genetics_week_12', G13: 'med_medical_genetics_week_13', G14: 'med_medical_genetics_week_14',
  G15: 'med_medical_genetics_week_15', G16: 'med_medical_genetics_week_16', G17: 'med_medical_genetics_week_17',
  B1: 'bio_week_1_water_and_ph_new_version_1_', B2: 'bio_week_2_major_compounds_6_', B3: 'bio_week_3_amino_acids_',
  B4: 'bio_week_4_proteins_', B5: 'bio_week_5_phospholipid_', B6: 'bio_week_6_ecm_fibrous_proteins_',
  B7: 'bio_week_7_globular_proteins_1_', B10: 'bio_week_10_11_enzymes_p1_2_1_1_',
  B12: 'bio_week_12_nucleotide_metabolism_purines_2_1_', B13: 'bio_week_13_nucleotide_metabolism_1_1_',
  B14: 'bio_week_14tca_2_', B15: 'bio_week_15cellular_respiration_and_its_implications_breakthrough_by_slidesgo_3_',
};

// guide -> section -> [[deck, picture number, caption], ...]
const PICKS = {
  /* ── Biochemistry ─────────────────────────────────────────────── */
  'gct/biochemistry/wk01-water-ph-buffers.html': {
    compartments: [['B1', 2, 'Total body water (about 40 L in an adult): two-thirds inside cells (ICF), one-third outside (ECF); the ECF splits into interstitial fluid and blood plasma.']],
    solvent: [['B1', 4, 'Each water molecule can hydrogen-bond to its neighbours.'], ['B1', 6, 'Water dissolves salt: water molecules surround each Na⁺ and Cl⁻ ion in a hydration shell.']],
    electrolytes: [['B1', 7, 'Ion concentrations outside cells (extracellular fluid) and inside cells (cytoplasm). Na⁺ and Cl⁻ dominate outside; K⁺ and phosphates dominate inside.'], ['B1', 9, 'The Na⁺/K⁺-ATPase pumps 3 Na⁺ out and 2 K⁺ in for each ATP.']],
    'anion-gap': [['B1', 37, 'Anion gap: normal, high anion gap metabolic acidosis (HAGMA, extra unmeasured acid) and normal anion gap acidosis (NAGMA, Cl⁻ rises instead).']],
    osmolality: [['B1', 12, 'Osmosis: water moves across a semipermeable membrane toward the side with more dissolved particles.'], ['B1', 13, 'When ECF osmolality rises, water leaves cells and they shrink; when it falls, water enters cells and they swell.']],
    raas: [['B1', 15, 'The renin–angiotensin–aldosterone system: low blood volume or pressure → renin → angiotensin I → angiotensin II (ACE in the lungs) → vasoconstriction and aldosterone.']],
    hh: [['B1', 29, 'The Henderson–Hasselbalch equation.']],
    'lungs-kidneys': [['B1', 25, 'The bicarbonate buffer links the lungs (they remove CO₂) and the kidneys (they remove H⁺ and keep HCO₃⁻).']],
    disorders: [['B1', 31, 'Acidosis (blood pH falls) and alkalosis (blood pH rises), each with a metabolic (HCO₃⁻) or respiratory (pCO₂) cause.'], ['B1', 48, 'Normal arterial blood values: pH 7.35–7.45, pCO₂ 35–45 mm Hg, HCO₃⁻ 22–28 mEq/L.']],
    potassium: [['B1', 49, 'Potassium shifts: in acidosis H⁺ enters cells and K⁺ leaves (hyperkalaemia); in alkalosis the reverse (hypokalaemia).']],
  },
  'gct/biochemistry/wk02-major-compounds.html': {
    carbon: [['B2', 3, 'The common functional groups: carbon–oxygen, carbon–sulfur and carbon–nitrogen groups, esters and amides.']],
    redox: [['B2', 4, 'One-carbon groups from most reduced (methane) to most oxidised (CO₂).']],
    carbs: [['B2', 6, 'Aldoses (aldehyde group, e.g. glucose) and ketoses (ketone group, e.g. fructose).']],
    mono: [['B2', 9, 'D- and L-sugars: look at the chiral carbon farthest from the C=O. OH on the right = D, on the left = L.'], ['B2', 10, 'D-glucose, D-mannose and D-galactose differ at a single carbon (epimers).']],
    glycosidic: [['B2', 13, 'Glycosidic bonds: an N-glycosidic bond joins a base to ribose (in ATP); O-glycosidic bonds join sugars (lactose, starch).']],
    'di-poly': [['B2', 15, 'The three common disaccharides: sucrose (glucose + fructose), lactose (galactose + glucose) and maltose (glucose + glucose).'], ['B2', 19, 'Glycogen: α(1→4) chains with α(1→6) branch points.']],
    fatty: [['B2', 20, 'Saturated (stearic acid) and unsaturated fatty acids (oleic, α-linolenic, arachidonic); cis double bonds put kinks in the chain.']],
    acyl: [['B2', 21, 'A triacylglycerol: three fatty acids esterified to glycerol.'], ['B2', 23, 'Phosphatidic acid: glycerol + two fatty acids + phosphoric acid, the parent of the phosphoglycerides.']],
    sphingo: [['B2', 25, 'Sphingomyelin: ceramide (sphingosine + fatty acid) with a phosphocholine head.']],
    steroids: [['B2', 28, 'The steroid nucleus (rings A–D) in cholesterol, cholic acid (a bile acid) and estradiol.']],
    nitrogen: [['B2', 31, 'Purines (adenine, guanine) have two rings; pyrimidines (cytosine, uracil, thymine) have one.']],
  },
  'gct/biochemistry/wk03-amino-acids.html': {
    structure: [['B3', 2, 'General structure: an α-carbon carrying an amino group, a carboxyl group, a hydrogen and a side chain (R).'], ['B3', 3, 'D- and L-serine are mirror images that cannot be superimposed. Proteins use L-amino acids.']],
    'by-r': [['B3', 4, 'Amino acids with nonpolar side chains: glycine, alanine, valine, leucine, isoleucine.'], ['B3', 6, 'The aromatic amino acids and what they are precursors of.']],
    fate: [['B3', 20, 'Where amino acids enter metabolism: glucogenic ones feed pyruvate or TCA intermediates; ketogenic ones feed acetyl-CoA.']],
    cystinuria: [['B3', 21, 'Hexagonal cystine crystals in the urine of a patient with cystinuria.']],
    ptm: [['B3', 23, 'Common post-translational modifications and the amino acids they act on.']],
    cholera: [['B3', 25, 'Cholera toxin keeps Gsα switched on, so cAMP rises and CFTR pours Cl⁻ and water into the gut lumen.']],
    derivatives: [['B3', 11, 'Glutamate decarboxylase (GAD), with PLP as cofactor, turns glutamate into GABA.']],
  },
  'gct/biochemistry/wk04-protein-structure.html': {
    levels: [['B4', 5, 'The four levels of protein structure: primary, secondary, tertiary and quaternary.']],
    primary: [['B4', 7, 'Forming a peptide bond: the carboxyl group of one amino acid joins the amino group of the next, releasing water.'], ['B4', 8, 'The peptide bond has partial double-bond character: it is rigid, planar and usually trans.']],
    secondary: [['B4', 9, 'The α-helix and the β-pleated sheet, both held by hydrogen bonds along the backbone.'], ['B4', 15, 'Antiparallel and parallel β-sheets.']],
    tertiary: [['B4', 17, 'Side-chain interactions that hold tertiary structure: hydrophobic, hydrogen, ionic and disulfide bonds.']],
    quaternary: [['B4', 18, 'Hemoglobin: four polypeptide chains, each holding a heme group.']],
    denature: [['B4', 21, 'Denaturation unfolds a protein (heat, pH, chemicals) but leaves its peptide bonds intact.']],
    folding: [['B4', 23, 'The Hsp60 chaperonin cycle: an unfolded protein enters the barrel, the Hsp10 lid closes (ATP), and the folded protein is released.'], ['B4', 28, 'Diseases of protein misfolding and the proteins that aggregate in them.']],
    proteasome: [['B4', 26, 'The ubiquitin–proteasome pathway: a protein tagged with a ubiquitin chain is unfolded and cut up by the 26S proteasome (uses ATP).']],
    alzheimer: [['B4', 29, 'Amyloid precursor protein (APP): cut by α-secretase it is harmless; cut by β- then γ-secretase it releases Aβ, which forms plaques.']],
    cjd: [['B4', 33, 'Creutzfeldt–Jakob disease: the misfolded prion protein (PrPSc) converts normal PrPC and causes spongiform brain damage.']],
  },
  'gct/biochemistry/wk05-phospholipids.html': {
    intro: [['B5', 7, 'A phospholipid: a polar head (phosphate + alcohol) and two hydrophobic fatty acid tails.'], ['B5', 10, 'Adding a head group to phosphatidic acid (PA) gives the main phospholipids.']],
    pc: [['B5', 12, 'Surfactant lowers surface tension so alveoli do not collapse on expiration.'], ['B5', 13, 'Dipalmitoylphosphatidylcholine (DPPC), the main lipid of lung surfactant.']],
    pi: [['B5', 17, 'Phosphatidylinositol signalling: phospholipase C splits PIP₂ into IP₃ (releases Ca²⁺) and DAG (activates protein kinase C).']],
    cardiolipin: [['B5', 20, 'Cardiolipin: two phosphatidic acids joined through a glycerol, found in the inner mitochondrial membrane.']],
    ether: [['B5', 21, 'Ether-linked phospholipids: a plasmalogen and platelet-activating factor.']],
    degradation: [['B5', 23, 'Where each phospholipase (A₁, A₂, C, D) cuts a phospholipid.']],
    sphingo: [['B5', 24, 'Sphingomyelin: ceramide + phosphocholine.'], ['B5', 25, 'Sphingomyelin is a major lipid of the myelin sheath.']],
    niemann: [['B5', 27, 'Niemann–Pick disease: sphingomyelinase deficiency, so sphingomyelin cannot be broken down to ceramide.']],
    gsl: [['B5', 30, 'A cerebroside: galactose (polar head) joined to ceramide (hydrophobic tail) by an O-glycosidic bond.']],
    lipidoses: [['B5', 33, 'Breakdown of the sphingolipids; a missing enzyme at any numbered step causes a sphingolipidosis.'], ['B5', 39, 'Gaucher cells: macrophages filled with glucocerebroside.']],
    eicosanoids: [['B5', 40, 'Arachidonic acid pathways: cyclooxygenase makes prostaglandins and thromboxanes; lipoxygenase makes leukotrienes.'], ['B5', 41, 'What the main eicosanoids do.']],
    drugs: [['B5', 43, 'Steroids block phospholipase A₂; NSAIDs block cyclooxygenase.'], ['B5', 46, 'Aspirin blocks platelet COX-1, so platelets cannot make thromboxane A₂.']],
    leukotrienes: [['B5', 50, 'Leukotrienes narrow the bronchi in asthma; zileuton blocks their synthesis and montelukast blocks their receptor.']],
  },
  'gct/biochemistry/wk06-ecm-fibrous-proteins.html': {
    ecm: [['B6', 2, 'The extracellular matrix and the molecules in each part of it.']],
    collagen: [['B6', 5, 'Where the main collagen types are found: type I (bone and skin), II (cartilage), III (connective tissue), IV (basement membrane).'], ['B6', 6, 'Collagen sequence: glycine (Gly) at every third position, with many prolines (Pro) and hydroxyprolines (Hyp).']],
    synthesis: [['B6', 7, 'Collagen synthesis inside the fibroblast (steps 1–4) and outside it (steps 5–6).'], ['B6', 11, 'Hydroxylation of proline and lysine needs vitamin C (ascorbate).']],
    oi: [['B6', 12, 'Features of osteogenesis imperfecta.'], ['B6', 13, 'Blue sclerae in osteogenesis imperfecta.']],
    eds: [['B6', 17, 'Hyperextensible skin in Ehlers–Danlos syndrome.']],
    scurvy: [['B6', 19, 'Signs of vitamin C deficiency (scurvy).'], ['B6', 24, 'Menkes disease: copper is absorbed but not delivered to the tissues, so copper enzymes such as lysyl oxidase fail.']],
    elastin: [['B6', 28, 'Cross-linked elastin stretches and recoils.'], ['B6', 29, 'Features of Marfan syndrome (fibrillin-1 defect).']],
    aat: [['B6', 31, 'α1-Antitrypsin protects the lung from elastase; without it, elastase destroys alveolar walls.'], ['B6', 33, 'Emphysema: alveolar walls are destroyed, leaving large air spaces.']],
    laminin: [['B6', 34, 'Laminin: a cross of three chains (α, β, γ) held by disulfide bonds.']],
    proteoglycans: [['B6', 39, 'A proteoglycan: GAG chains attached to a core protein through a linkage tetrasaccharide.'], ['B6', 35, 'Versican and aggrecan, two proteoglycans.']],
    mps: [['B6', 41, 'Heparan sulfate is broken down step by step in lysosomes; a missing enzyme causes a mucopolysaccharidosis.']],
    integrins: [['B6', 45, 'Integrins (α and β subunits) bind fibronectin outside the cell and signal inside it.']],
    mmp: [['B6', 46, 'Cancer cells secrete MMP-9, which breaks down the basement membrane and lets them invade.']],
  },
  'gct/biochemistry/wk07-globular-proteins.html': {
    heme: [['B7', 4, 'Hemoglobin: four globin chains (α1, α2, β1, β2), each with a heme group.'], ['B7', 6, 'Fe²⁺ in heme makes six bonds: four to the porphyrin nitrogens, one to the proximal histidine, one to O₂.']],
    tr: [['B7', 7, 'T (taut, deoxy) and R (relaxed, oxy) forms of hemoglobin.']],
    types: [['B7', 11, 'Adult hemoglobin HbA (α₂β₂), fetal HbF (α₂γ₂) and HbA₂ (α₂δ₂).'], ['B7', 12, 'Normal adult hemoglobins and their share of the total.']],
    myoglobin: [['B7', 17, 'Myoglobin: one chain of eight helices (A–H) holding a single heme.']],
    curves: [['B7', 21, 'Oxygen-binding curves: myoglobin (hyperbolic) and hemoglobin (sigmoidal).']],
    effectors: [['B7', 28, 'Lower pH shifts the hemoglobin curve to the right: O₂ is released more easily (Bohr effect).']],
    bpg: [['B7', 32, 'One 2,3-BPG binds in the central cavity between the β-chains of deoxyhemoglobin.'], ['B7', 33, 'More 2,3-BPG shifts the curve to the right; without it hemoglobin holds O₂ like myoglobin.']],
    co: [['B7', 37, 'Carbon monoxide forms carboxyhemoglobin and shifts the curve to the left.']],
    genes: [['B7', 39, 'β-thalassemia: each chromosome 11 carries one β-globin gene. Losing one gives β-thalassemia minor, losing both gives major.'], ['B7', 41, 'How β-thalassemia causes anemia and its complications.']],
    methb: [['B7', 45, 'Methemoglobin (Fe³⁺) is reduced back to hemoglobin (Fe²⁺) by cytochrome b₅ reductase.']],
    sickle: [['B7', 47, 'Sickle cell: valine replaces glutamate at position 6 of the β-chain.'], ['B7', 50, 'How HbS polymerisation leads to the acute and chronic problems of sickle cell disease.']],
    electro: [['B7', 53, 'Electrophoresis: hemoglobins move toward the anode; HbS and HbC carry less negative charge, so they move less than HbA.']],
  },
  'gct/biochemistry/wk10-11-enzymes.html': {
    classes: [['B10', 6, 'The subclasses of oxidoreductases.']],
    properties: [['B10', 26, 'Lock-and-key and induced-fit models of substrate binding.'], ['B10', 28, 'Cofactors (metal ions) and coenzymes (small organic molecules).']],
    mechanism: [['B10', 31, 'An enzyme lowers the activation energy but does not change the overall free-energy change of the reaction.']],
    factors: [['B10', 34, 'Effect of temperature: activity rises, then falls as the enzyme is heat-inactivated.'], ['B10', 36, 'Optimum pH of some enzymes.']],
    mm: [['B10', 38, 'Michaelis–Menten curve: Km is the substrate concentration at half Vmax.'], ['B10', 39, 'A small Km means high affinity (enzyme 1); a large Km means low affinity (enzyme 2).']],
    inhibition: [['B10', 42, 'Reversible and irreversible inhibition compared.'], ['B10', 44, 'Competitive inhibition: the inhibitor competes with the substrate for the active site.'], ['B10', 46, 'Non-competitive inhibition: the inhibitor binds elsewhere and blocks catalysis.']],
    regulation: [['B10', 51, 'Allosteric inhibition and activation.'], ['B10', 52, 'Covalent modification: protein kinases add phosphate; phosphatases remove it.']],
    clinical: [['B10', 58, 'LDH isoenzymes on electrophoresis: LDH₁ rises after myocardial infarction; LDH₅ rises in acute hepatitis.'], ['B10', 60, 'The three creatine kinase isoenzymes: CK-BB (brain), CK-MB (heart), CK-MM (skeletal muscle).']],
  },
  'gct/biochemistry/wk12-purine-metabolism.html': {
    bases: [['B12', 2, 'The bases of DNA and RNA.'], ['B12', 4, 'Ribonucleoside mono-, di- and triphosphates.']],
    denovo: [['B12', 6, 'Where the atoms of the purine ring come from.'], ['B12', 7, 'PRPP synthetase makes PRPP from ribose 5-phosphate; purine nucleotides inhibit it.']],
    'amp-gmp': [['B12', 18, 'IMP branches into AMP and GMP.']],
    deoxy: [['B12', 16, 'Ribonucleotide reductase turns ribonucleoside diphosphates into deoxyribonucleoside diphosphates.']],
    control: [['B12', 14, 'Ribavirin and mycophenolate both inhibit IMP dehydrogenase.']],
    salvage: [['B12', 20, 'The salvage enzymes: HGPRT (hypoxanthine and guanine) and APRT (adenine).']],
    ada: [['B12', 22, 'Without ADA, deoxyadenosine builds up as dATP, which is toxic to lymphocytes.']],
    gout: [['B12', 28, 'Needle-shaped monosodium urate crystals from a gouty joint, seen under polarised light.'], ['B12', 29, 'Purine breakdown to uric acid, and where gout drugs act.']],
    tls: [['B12', 32, 'Tumour lysis syndrome: dying tumour cells release nucleic acids, phosphate and K⁺.']],
  },
  'gct/biochemistry/wk13-pyrimidine-metabolism.html': {
    synthesis: [['B13', 3, 'Where the atoms of the pyrimidine ring come from: glutamine, CO₂ and aspartate.'], ['B13', 13, 'CPS I (mitochondria, urea cycle) and CPS II (cytosol, pyrimidine synthesis) compared.']],
    'utp-ctp': [['B13', 7, 'CTP synthetase turns UTP into CTP, using glutamine as the nitrogen donor.']],
    dtmp: [['B13', 9, 'Thymidylate synthase makes dTMP from dUMP; dihydrofolate reductase regenerates the folate carrier.']],
    folate: [['B13', 14, 'Megaloblastic anemia: large red cells (macrocytes) because nuclear maturation is delayed.']],
    orotic: [['B13', 16, 'Orotic aciduria with megaloblastic anemia (UMP synthase defect) or with hyperammonaemia (OTC deficiency).']],
    degradation: [['B13', 18, 'Uracil and thymine are broken down by DPD to β-alanine and β-aminoisobutyrate.']],
    drugs: [['B13', 21, 'Methotrexate blocks dihydrofolate reductase; leucovorin rescue bypasses the block.']],
  },
  'gct/biochemistry/wk14-metabolism-tca.html': {
    pathways: [['B14', 3, 'Anabolic reactions build large molecules (use energy); catabolic reactions break them down (release energy).']],
    respiration: [['B14', 4, 'Aerobic respiration: glycolysis in the cytosol, then pyruvate oxidation, the Krebs cycle and oxidative phosphorylation in the mitochondrion.']],
    pdh: [['B14', 8, 'The pyruvate dehydrogenase complex and its cofactors.']],
    'pdh-control': [['B14', 9, 'PDH is switched off by phosphorylation (high NADH, acetyl-CoA, ATP) and on by dephosphorylation (high NAD⁺, ADP, Ca²⁺).']],
    'pdh-deficiency': [['B14', 10, 'PDH deficiency: pyruvate builds up and is turned into lactate and alanine.']],
    steps: [['B14', 13, 'The TCA cycle with its enzymes and the steps that make NADH, FADH₂ and GTP.'], ['B14', 16, 'Fluoroacetate (rat poison) forms fluorocitrate, which blocks aconitase.']],
    energy: [['B14', 25, 'ATP from one acetyl-CoA on the slide: 3 NADH, 1 FADH₂ and 1 GTP. (Current values give 10 ATP; see the Watch out box.)']],
    'tca-control': [['B14', 26, 'Regulation of the TCA cycle at citrate synthase, isocitrate dehydrogenase and α-ketoglutarate dehydrogenase.']],
  },
  'gct/biochemistry/wk15-etc-oxidative-phosphorylation.html': {
    membranes: [['B15', 3, 'The mitochondrion: outer and inner membranes, cristae, intermembrane space and matrix.']],
    complexes: [['B15', 8, 'The electron transport chain: complexes I–IV, coenzyme Q and cytochrome c.'], ['B15', 7, 'Complex II (succinate dehydrogenase) passes electrons from FADH₂ to coenzyme Q without pumping protons.']],
    coq: [['B15', 9, 'Coenzyme Q is made on the same mevalonate pathway as cholesterol, so statins lower it too.']],
    synthase: [['B15', 16, 'ATP synthase: protons flow through F₀ in the membrane and drive ATP synthesis in F₁.']],
    cyanide: [['B15', 22, 'Cyanide blocks cytochrome oxidase (complex IV), so cells switch to anaerobic metabolism and lactic acid rises.']],
    uncouplers: [['B15', 23, 'Uncoupling proteins let protons back into the matrix without passing through ATP synthase; the energy is lost as heat.']],
  },

  /* ── Medical Genetics ─────────────────────────────────────────── */
  'gct/genetics/wk01-introduction-mendel.html': {
    'terms-core': [['G1', 8, 'A homologous pair of chromosomes: the same locus carries one allele on each chromosome.']],
    genome: [['G1', 9, 'Haploid cells (n) have one set of chromosomes; diploid cells (2n) have homologous pairs.'], ['G1', 15, 'The 23 pairs of human chromosomes.']],
    mendel: [['G1', 13, 'A monohybrid cross: tall (TT) × dwarf (tt) gives all tall Tt; selfing Tt gives a 3 : 1 ratio.']],
    sickle: [['G1', 19, 'One base change (CTC → CAC) in β-globin DNA puts valine in place of glutamate, giving sickle-cell hemoglobin.'], ['G1', 20, 'Sickled red blood cells.']],
  },
  'gct/genetics/wk02-dominance-abo.html': {
    incomplete: [['G2', 5, 'Incomplete dominance: red × white gives pink, and the F2 is 1 red : 2 pink : 1 white.']],
    'tay-sachs': [['G2', 8, 'The cherry-red spot in the retina, a sign of Tay–Sachs disease.']],
    codominance: [['G2', 10, 'Codominance: both alleles show fully in the heterozygote.']],
    antigens: [['G2', 14, 'The ABO antigens differ by one sugar at the end of the chain: N-acetylgalactosamine (A) or galactose (B).']],
    abo: [['G2', 15, 'Blood groups: antigens on the red cells, antibodies in the plasma, and who can donate to whom (including Bombay).']],
  },
  'gct/genetics/wk03-gene-interaction-x-linkage.html': {
    epistasis: [['G3', 7, 'Recessive epistasis in mouse coat colour gives a 9 : 3 : 4 ratio.'], ['G3', 9, 'Complementary genes give a 9 : 7 ratio.']],
    xlinked: [['G3', 15, 'X-linked recessive inheritance from a carrier mother and from an affected father.'], ['G3', 16, 'Red–green colour blindness passed from a carrier mother to her son.']],
    sex: [['G3', 18, 'A sex-influenced trait: beard in goats is dominant in males and recessive in females.']],
    penetrance: [['G3', 22, 'Variable penetrance (some carriers show nothing) and variable expressivity (carriers show it to different degrees).']],
    imprinting: [['G3', 23, 'Maternal and paternal imprinting: only the copy from one parent is active.']],
    'pws-as': [['G3', 28, 'Prader–Willi syndrome: the paternal 15q11–q13 region is missing or silent.'], ['G3', 29, 'Angelman syndrome: the maternal UBE3A gene is missing or silent.']],
  },
  'gct/genetics/wk04-chromosome-mapping.html': {
    linkage: [['G4', 5, 'Homologous and non-homologous chromosomes, sister and non-sister chromatids.']],
    crossing: [['G4', 8, 'Crossing over makes recombinant gametes (pink) as well as parental ones.'], ['G4', 9, 'The farther apart two genes are, the more places a crossover can fall between them.']],
    order: [['G4', 12, 'A double crossover swaps only the middle gene, which identifies the gene order.']],
  },
  'gct/genetics/wk05-sex-determination.html': {
    chromosomal: [['G5', 3, 'The father’s X or Y decides the sex: half the children are XX, half XY.']],
    xy: [['G5', 6, 'The X and Y chromosomes pair through the pseudoautosomal regions at their tips.']],
    indifferent: [['G5', 9, 'The indifferent stage (5–6 weeks): both mesonephric (Wolffian) and paramesonephric (Müllerian) ducts are present.']],
    sry: [['G5', 10, 'In the XY gonad, SRY turns on SOX9 and testis development; in the XX gonad, WNT4/β-catenin and FOXL2 drive ovary development.']],
    azf: [['G5', 12, 'The azoospermia factor (AZF) regions on the long arm of the Y chromosome.']],
  },
  'gct/genetics/wk06-x-inactivation.html': {
    barr: [['G6', 5, 'Nuclei from a male (XY, no Barr body) and a female (XX, arrows: Barr body).']],
    lyon: [['G6', 9, 'Random X inactivation in the early embryo; each daughter cell keeps the same inactive X.']],
    xic: [['G6', 12, 'X inactivation: counting, then choice; on the future inactive X, XIST is switched on and TSIX off.']],
  },
  'gct/genetics/wk07-sex-chromosome-aneuploidies.html': {
    nondisjunction: [['G7', 5, 'Normal meiosis compared with nondisjunction in meiosis I and in meiosis II.']],
    klinefelter: [['G7', 7, 'Features of Klinefelter syndrome (47,XXY).']],
    xxx: [['G7', 10, 'Karyotype of triple X syndrome (47,XXX).']],
    fish: [['G7', 11, 'FISH: a fluorescent DNA probe is denatured, hybridised to its target on a chromosome, and seen under the microscope.']],
  },
  'gct/genetics/wk10-dna-organization.html': {
    viral: [['G10', 5, 'Electron micrographs of phage λ and the DNA released from it.']],
    bacterial: [['G10', 6, 'An E. coli cell burst open to release its 1200 μm-long chromosome.']],
    why: [['G10', 10, 'Relaxed and supercoiled circular DNA, drawn and in electron micrographs.']],
    'neg-pos': [['G10', 12, 'Positive and negative supercoils on either side of relaxed DNA.']],
    topo: [['G10', 15, 'Topoisomerase I cuts one strand; topoisomerase II cuts both strands and uses ATP.']],
    eukaryotes: [['G10', 16, 'Eukaryotic DNA is wound on histones (nucleosomes) and packed into chromatin and chromosomes.']],
  },
  'gct/genetics/wk11-chromatin.html': {
    nucleosome: [['G11', 5, 'A nucleosome: about 146 bp of DNA wrapped around eight histones, joined by linker DNA.']],
    levels: [['G11', 10, 'Levels of chromatin packing, from the 2 nm double helix to the 1400 nm metaphase chromosome.']],
    remodeling: [['G11', 11, 'ATP-dependent chromatin remodelling complexes slide DNA on the nucleosome.'], ['G11', 13, 'Acetylation (HAT) opens chromatin and turns genes on; deacetylation (HDAC) closes it.']],
    'eu-hetero': [['G11', 14, 'Electron micrograph of a nucleus: pale euchromatin, dark heterochromatin, nucleolus and nuclear envelope.']],
  },
  'gct/genetics/wk12-repetitive-dna.html': {
    classes: [['G12', 4, 'Categories of repetitive DNA.']],
    vntr: [['G12', 8, 'Different numbers of VNTR repeats give each person a different DNA fingerprint.']],
    str: [['G12', 9, 'STRs: short repeats (here AGAT) whose number differs between people.']],
    'str-clinic': [['G12', 11, 'Diseases caused by repeat expansions and where in the gene each repeat lies.']],
    lines: [['G12', 12, 'A LINE inserted among a gene’s exons and introns.']],
    sines: [['G12', 13, 'SINEs scattered through a gene.']],
  },
  'gct/genetics/wk13-gene-mutations.html': {
    point: [['G13', 7, 'Silent, nonsense and missense mutations in the codon for glutamate.'], ['G13', 8, 'Transitions (purine ↔ purine, pyrimidine ↔ pyrimidine) and transversions (purine ↔ pyrimidine).']],
    frameshift: [['G13', 12, 'Substitution, deletion and insertion shown with three-letter words: a deletion or insertion shifts the reading frame.']],
    location: [['G13', 15, 'A somatic mutation affects only the tissue it arises in; a germ-line mutation passes to every cell of the child.']],
    repair: [['G13', 16, 'The DNA repair systems and the damage each one fixes.']],
    transposition: [['G13', 17, 'Copy-and-paste (retrotransposons) and cut-and-paste (DNA transposons) transposition.']],
  },
  'gct/genetics/wk14-mutations-beta-thalassemia.html': {
    spontaneous: [['G14', 6, 'Tautomeric shifts: a base in its rare form pairs wrongly during replication.'], ['G14', 7, 'Strand slippage during replication adds or removes repeat units.']],
    physical: [['G14', 8, 'UV-C light joins neighbouring thymines into a dimer.'], ['G14', 9, 'Types of DNA damage caused by radiation.']],
    chemical: [['G14', 11, '5-Bromouracil pairs with adenine in its keto form but with guanine in its enol form.']],
    single: [['G14', 12, 'A nonsense mutation: UGG (Trp) becomes UAG (stop).'], ['G14', 13, 'A missense mutation: one base change puts a different amino acid into the protein.']],
    hbb: [['G14', 16, 'A gene and its regulatory regions; mutations in any part can lower β-globin output.']],
  },
  'gct/genetics/wk15-trinucleotide-repeats.html': {
    what: [['G15', 3, 'Normal and expanded DNA repeats.']],
    how: [['G15', 5, 'Slippage at a hairpin during replication can add or remove repeats.']],
    harm: [['G15', 4, 'An expanded CAG repeat in HTT adds a long polyglutamine tract to the protein (gain of function).']],
  },
  'gct/genetics/wk16-dna-repair-xp.html': {
    damage: [['G16', 6, 'Deamination: cytosine → uracil, guanine → xanthine, adenine → hypoxanthine, 5-methylcytosine → thymine.']],
    ber: [['G16', 9, 'Base excision repair: glycosylase removes the base, AP endonuclease cuts the backbone, polymerase fills, ligase seals.']],
    ner: [['G16', 11, 'Nucleotide excision repair: the helix is opened, a stretch around the damage is cut out, then filled and sealed.'], ['G16', 18, 'The NER proteins, including the XP proteins.']],
    systems: [['G16', 12, 'Mismatch repair: a wrong base in the new strand is cut out with its neighbours and replaced.']],
    dsb: [['G16', 14, 'Double-strand breaks are joined by non-homologous end joining (may lose bases) or homologous recombination (accurate).']],
  },
  'gct/genetics/wk17-transposable-elements.html': {
    dna: [['G17', 7, 'A DNA transposon: the transposase gene between inverted terminal repeats (ITRs), flanked by direct repeats (DRs).']],
    cutpaste: [['G17', 9, 'Cut-and-paste transposition step by step.']],
    copypaste: [['G17', 12, 'Retrotransposition: transcription, reverse transcription and insertion of the DNA copy.']],
    retro: [['G17', 11, 'LTR and non-LTR retrotransposons.']],
    human: [['G17', 13, 'About 45% of the human genome is transposable elements.']],
  },

  /* ── Molecular Biology ────────────────────────────────────────── */
  'gct/molecular-biology/lec01-cells-prokaryote-eukaryote.html': {
    history: [['M1', 3, 'Robert Hooke’s drawing of sliced cork (Micrographia, 1665): the first “cells”.']],
    sizes: [['M1', 5, 'Sizes from atoms to cells, with the limits of the light and electron microscopes.']],
    'two-types': [['M1', 8, 'A bacterial (prokaryotic) cell.'], ['M1', 10, 'An animal (eukaryotic) cell.']],
  },
  'gct/molecular-biology/lec02-cell-types-viruses.html': {
    differentiation: [['M2', 6, 'Cells from one fertilised egg differentiate into many types (nerve, muscle, blood, bone, fat, epithelium).']],
    viruses: [['M2', 9, 'Virus structure: an icosahedral virus, a bacteriophage, and an enveloped virus (HIV).'], ['M2', 10, 'A T-even bacteriophage: head (capsid) with DNA, sheath and tail fibres.']],
    cycles: [['M2', 11, 'Electron micrographs of phages being assembled inside a bacterium, and of virus particles budding from a cell.']],
  },
  'gct/molecular-biology/lec03-chemical-basis-macromolecules.html': {
    functional: [['M3', 2, 'Functional groups.']],
    carbs: [['M3', 5, 'Fructose and glucose, and how glucose closes into a ring.'], ['M3', 6, 'Sucrose and lactose.']],
    lipids: [['M3', 8, 'A fat: glycerol with three fatty acid tails.'], ['M3', 9, 'A phospholipid: polar head, glycerol backbone, two fatty acid chains.'], ['M3', 10, 'Steroids: cholesterol, testosterone and estrogen.']],
    nucleic: [['M3', 11, 'A nucleotide: phosphate, sugar and base.'], ['M3', 12, 'Purines and pyrimidines.']],
    dna: [['M3', 22, 'DNA: two antiparallel sugar–phosphate backbones joined by base pairs, twisted into a double helix.']],
    pairing: [['M3', 27, 'Hydrogen bonds in base pairs: A–T has two, G–C has three.']],
    rna: [['M3', 13, 'Deoxyribose has H at the 2′ carbon; ribose has OH.'], ['M3', 31, 'ATP: adenine, ribose and three phosphates.']],
  },
  'gct/molecular-biology/lec04-protein-structure-folding.html': {
    aa: [['M4', 3, 'Two amino acids join by a peptide bond, releasing water.']],
    sidechains: [['M4', 10, 'Two cysteines can be oxidised to form a disulfide bond.']],
    primary: [['M4', 11, 'Primary structure: the sequence of amino acids from the N- to the C-terminus.'], ['M4', 12, 'Sickle cell disease: one amino acid change makes red cells sickle and block vessels.']],
    secondary: [['M4', 13, 'The α-helix (3.6 residues per turn), held by hydrogen bonds.'], ['M4', 14, 'The β-pleated sheet.']],
    tertiary: [['M4', 16, 'Myoglobin, an example of tertiary structure.'], ['M4', 17, 'The non-covalent bonds that hold tertiary structure.']],
    quaternary: [['M4', 20, 'Hemoglobin: two α and two β chains.']],
    anfinsen: [['M4', 22, 'Anfinsen’s experiment: ribonuclease unfolded with urea and mercaptoethanol refolds by itself when they are removed.']],
    folding: [['M4', 23, 'Two folding pathways from unfolded chain to native protein.']],
    chaperones: [['M4', 24, 'Hsp70 chaperones bind the new chain as it leaves the ribosome.'], ['M4', 25, 'Some proteins finish folding inside a chaperonin (TRiC).']],
  },
  'gct/molecular-biology/lec05-mitochondria-respiration.html': {
    structure: [['M6', 2, 'A mitochondrion: outer and inner membranes, cristae, matrix, DNA and ribosomes.'], ['M6', 3, 'Mitochondria in a cell and a close-up showing cristae (electron micrographs).']],
    respiration: [['M6', 6, 'Overview of glucose metabolism: glycolysis in the cytosol, then the TCA cycle and electron transport in the mitochondrion.']],
    glycolysis: [['M6', 7, 'Glycolysis: glucose → 2 pyruvate, with a net gain of 2 ATP and 2 NADH.']],
    tca: [['M6', 9, 'Pyruvate is oxidised to acetyl-CoA, releasing CO₂ and making NADH.'], ['M6', 10, 'The citric acid cycle.']],
    etc: [['M6', 14, 'The electron transport chain pumps H⁺ into the intermembrane space; ATP synthase uses the gradient.']],
    chemiosmosis: [['M6', 18, 'ATP synthase: H⁺ flowing back into the matrix drives ATP synthesis.']],
    uncoupling: [['M6', 17, 'Uncoupling agents carry H⁺ across the inner membrane, bypassing ATP synthase.']],
  },
  'gct/molecular-biology/lec07-endomembrane-system.html': {
    overview: [['M7', 1, 'Electron micrograph of a secretory cell: Golgi complex, ER and secretory vesicles.']],
    pathways: [['M7', 3, 'The biosynthetic, secretory and endocytic pathways.'], ['M7', 2, 'Vesicle transport: budding from the donor compartment and fusion with the recipient.']],
    er: [['M7', 4, 'Rough ER (flattened sacs with ribosomes) continuous with smooth ER (tubules).']],
    golgi: [['M7', 6, 'The Golgi apparatus: vesicles from the rough ER arrive at the cis face and leave from the trans face.']],
  },
  'gct/molecular-biology/lec08-cotranslational-translocation.html': {
    translocation: [['M8', 4, 'Co-translational translocation: SRP binds the signal sequence, docks on the SRP receptor and hands the ribosome to the translocon.']],
    glycosylation: [['M8', 5, 'N-linked glycosylation: the sugar tree is built on dolichol phosphate and transferred to the new protein.']],
    'membrane-proteins': [['M8', 6, 'How hydrophobic segments become transmembrane segments of integral membrane proteins.']],
    lipids: [['M8', 7, 'Membrane proteins keep their orientation as vesicles carry them from the ER to the Golgi and plasma membrane.']],
  },
  'gct/molecular-biology/lec09-er-quality-control-sorting.html': {
    qc: [['M9', 3, 'The calnexin cycle: glucosidases trim the sugars, calnexin holds the protein, UGGT re-adds glucose to misfolded proteins.']],
    upr: [['M9', 4, 'The unfolded protein response: ER sensors detect misfolded proteins and signal to the nucleus.']],
    mito: [['M9', 5, 'Mitochondrial import: precursors held by cytosolic Hsp70 enter through the TOM complex.'], ['M9', 6, 'TIM23 takes matrix proteins into the matrix, where the presequence is cut off; TIM22 inserts inner-membrane proteins.']],
  },
  'gct/molecular-biology/lec10-vesicular-transport.html': {
    'er-golgi': [['M10', 3, 'COPII vesicles carry cargo from the ER to the ERGIC and Golgi; COPI vesicles return proteins.']],
    coats: [['M10', 2, 'Electron micrographs of COPI- and COPII-coated vesicles.']],
    copii: [['M10', 4, 'COPII proteins form a coated bud around the cargo receptors.'], ['M10', 5, 'Sar1-GTP starts COPII coat assembly.']],
    copi: [['M10', 7, 'Escaped ER proteins with the KDEL signal are bound by KDEL receptors and returned in COPI vesicles.']],
    targeting: [['M10', 8, 'Tethering: Rab-GTP and tethering proteins catch the vesicle at the target membrane.']],
    snares: [['M10', 9, 'Docking: v-SNARE on the vesicle and t-SNAREs on the target twist together.']],
  },
  'gct/molecular-biology/lec11-endocytosis-lysosomes.html': {
    m6p: [['M11', 2, 'Sorting of lysosomal enzymes by mannose-6-phosphate (M6P) and M6P receptors.']],
    lysosomes: [['M11', 4, 'Lysosomes (coloured) in an electron micrograph.']],
    autophagy: [['M11', 6, 'Autophagy: an old mitochondrion is wrapped into an autophagosome and digested; leftovers form a residual body.']],
    receptors: [['M11', 8, 'The endocytic pathway: early endosome, recycling of receptors, late endosome and lysosome.']],
    ldl: [['M11', 9, 'An LDL particle: a shell of phospholipid, cholesterol and apolipoprotein B-100 around esterified cholesterol.'], ['M11', 12, 'Atherosclerosis: LDL enters the damaged vessel wall, macrophages become foam cells, and a plaque forms.']],
    phagocytosis: [['M11', 13, 'Scanning electron micrograph of a macrophage engulfing a cell.']],
  },
  'gct/molecular-biology/lec14-transcription-mrna-processing.html': {
    dogma: [['M14', 2, 'Transcription and RNA processing in the nucleus, translation in the cytoplasm.']],
    polymerase: [['M14', 3, 'RNA polymerase opens a transcription bubble and adds nucleotides to the 3′ end of the growing RNA.']],
    promoter: [['M14', 6, 'Numbering: +1 is the start site; the promoter lies upstream.']],
    bacteria: [['M14', 8, 'The σ factor joins the core enzyme to find the promoter, then leaves once the RNA is being elongated.'], ['M14', 12, 'In bacteria, ribosomes translate the mRNA while it is still being transcribed.']],
    termination: [['M14', 9, 'Rho-dependent termination: Rho moves along the RNA and pulls it off the polymerase.'], ['M14', 10, 'Rho-independent termination: a G-C hairpin followed by U’s.']],
    eukaryotes: [['M14', 11, 'The eukaryotic RNA polymerases and the RNAs each one makes.']],
    mrna: [['M14', 14, 'Human β-globin mRNA: cap, 5′ UTR, coding region, 3′ UTR and poly(A) tail.']],
    cap: [['M14', 16, 'The 5′ cap: 7-methylguanosine joined by a 5′–5′ triphosphate link.'], ['M14', 17, 'The capping enzyme binds the phosphorylated CTD of RNA polymerase II.']],
    polya: [['M14', 18, 'Polyadenylation: the RNA is cut 10–35 nt after AAUAAA, then poly(A) polymerase adds the tail.']],
    splicing: [['M14', 21, 'Processing of the β-globin pre-mRNA: cap, cleavage and poly(A) addition, then removal of its two introns.']],
    selfsplicing: [['M14', 24, 'A group II intron (left) and the snRNAs of the spliceosome (right) fold the RNA in a similar way.']],
    alternative: [['M14', 28, 'Fibronectin: the fibroblast mRNA keeps exons EIIIA and EIIIB; the hepatocyte mRNA skips them.']],
    fish: [['M14', 29, 'FISH: fluorescent probes (yellow) mark satellite DNA on chromosomes.'], ['M14', 30, 'In situ hybridisation shows HPV DNA (pink) in the nuclei of infected cells.']],
  },

  /* ── Histology ────────────────────────────────────────────────── */
  'gct/histology/lec03-plasma-membrane-transport.html': {
    membrane: [['H3', 4, 'The plasma membrane in a transmission electron micrograph: two dark lines with a light layer between (trilaminar).']],
    proteins: [['H3', 6, 'The fluid mosaic: phospholipid bilayer, proteins, glycolipids and glycoproteins.']],
    endocytosis: [['H3', 10, 'The three kinds of endocytosis: phagocytosis, pinocytosis and receptor-mediated endocytosis.']],
    exocytosis: [['H3', 12, 'Constitutive secretion (continuous) and regulated secretion (Ca²⁺-triggered).']],
    signalling: [['H3', 13, 'Paracrine, autocrine and juxtacrine signalling.']],
  },
  'gct/histology/lec04-ribosomes-er-golgi.html': {
    ribosomes: [['H4', 2, 'A ribosome: large and small subunits on an mRNA.']],
    er: [['H4', 7, 'Rough ER (flattened sacs studded with ribosomes) and smooth ER (tubules), electron micrographs.']],
    golgi: [['H4', 13, 'The Golgi apparatus in an electron micrograph: a stack of curved, flattened cisternae.'], ['H4', 11, 'The Golgi apparatus and its place in the cell.']],
  },
  'gct/histology/lec05-lysosomes-proteasomes-peroxisomes.html': {
    lysosomes: [['OR', 7, 'Lysosomes (arrows): dense, membrane-bound bodies.']],
  },
  'gct/histology/lec06-mitochondria-inclusions.html': {
    structure: [['OR', 10, 'Mitochondria in an electron micrograph: double membrane and shelf-like cristae.']],
    inclusions: [['OR', 2, 'Glycogen in liver cells stains magenta with PAS (arrows).'], ['OR', 6, 'Lipid droplets (X): round, without a membrane.'], ['OR', 19, 'Secretory granules (arrows) crowded in a gland cell.']],
    em: [['OR', 1, 'Euchromatin: the pale, open chromatin of an active nucleus.'], ['OR', 5, 'Heterochromatin (arrows): dark clumps along the nuclear envelope.'], ['OR', 11, 'The nucleolus (circled): a dark, round body without a membrane.'], ['OR', 24, 'Rough ER: ribosomes attached to the cytosolic side of the membrane.']],
  },
  'gct/histology/lec07-cytoskeleton.html': {
    microtubules: [['H7', 2, 'Tubulin heterodimers line up as protofilaments, which form the microtubule wall.']],
    motors: [['H7', 1, 'Kinesin walks toward the + end of a microtubule; dynein walks toward the − end.']],
    actin: [['H7', 4, 'Actin monomers (G-actin) add at the + end and leave from the − end of the filament (F-actin).']],
    if: [['H7', 6, 'Intermediate filament assembly: monomer, dimer, tetramer, then a rope-like bundle 8–12 nm wide.']],
  },
  'gct/histology/lec08-nuclear-envelope-nucleolus.html': {
    envelope: [['H89', 1, 'The nucleus: inner and outer membranes, perinuclear space, nuclear pores, nuclear lamina and nucleolus.'], ['OR', 25, 'Electron micrograph of a nucleus: nuclear envelope, euchromatin, heterochromatin and nucleolus.']],
    nucleolus: [['OR', 11, 'The nucleolus (circled) in an electron micrograph.']],
  },
  'gct/histology/lec09-chromatin-chromosomes.html': {
    nucleosome: [['G11', 5, 'A nucleosome: DNA wrapped around eight histones, joined by linker DNA.']],
    types: [['OR', 1, 'Euchromatin: pale chromatin in an active nucleus.'], ['OR', 5, 'Heterochromatin (arrows): dark, condensed chromatin.']],
    karyotype: [['G7', 10, 'A karyotype: chromosomes arranged in pairs by size (here 47,XXX).']],
  },
  'gct/histology/lec10-cell-cycle-mitosis.html': {
    mitosis: [['H10', 1, 'The stages of mitosis, from interphase to two daughter cells.']],
  },
  'gct/histology/lec12-epithelial-cells-junctions.html': {
    junctions: [['OR', 36, 'Electron micrograph of the junctional complex: tight junction (TJ), adherens junction (AJ) and desmosome.'], ['OR', 31, 'Desmosomes, with tonofilaments (keratin) attached.'], ['OR', 32, 'A gap junction (arrows) between two cells.']],
    basal: [['OR', 39, 'Hemidesmosomes (arrows) anchoring cells to the basal lamina.']],
  },
  'gct/histology/lec13-apical-specializations.html': {
    microvilli: [['H13', 1, 'Microvilli in an electron micrograph: regular, finger-like projections forming a brush border.']],
    stereocilia: [['H13', 3, 'Stereocilia of an inner ear hair cell (scanning electron micrograph).']],
    cilia: [['H13', 5, 'Cross-sections of cilia showing the 9 + 2 axoneme.'], ['H13', 4, 'A cilium anchored on its basal body (a centriole).']],
  },
  'gct/histology/lec14-types-of-epithelia-glands.html': {
    simple: [['H14', 1, 'Simple squamous epithelium.'], ['H14', 2, 'Simple cuboidal epithelium.'], ['H14', 3, 'Simple columnar epithelium.']],
    stratified: [['H14', 4, 'Stratified epithelium.']],
    special: [['EP', 21, 'Pseudostratified ciliated columnar epithelium of the trachea, over hyaline cartilage (H&E).'], ['EP', 33, 'Transitional epithelium (urothelium), relaxed.']],
    'gland-types': [['H14', 6, 'Glands form from covering epithelium: exocrine glands keep a duct; endocrine glands lose it.']],
    structure: [['H14', 7, 'Simple exocrine glands: tubular, branched tubular, coiled tubular, acinar and branched acinar.'], ['H14', 8, 'Compound exocrine glands: tubular, acinar and tubuloacinar.']],
  },
  'gct/histology/practical-epithelium.html': {
    'simple-squamous': [['EP', 1, 'Simple squamous epithelium lining the space around a renal glomerulus (H&E).'], ['EP', 2, 'Simple squamous endothelium lining a small blood vessel (H&E).']],
    'simple-cuboidal': [['EP', 7, 'Simple cuboidal epithelium lining a small duct (H&E).'], ['EP', 6, 'Simple cuboidal epithelium (H&E).']],
    'simple-columnar': [['EP', 12, 'Simple columnar epithelium of the intestine, with pale goblet cells (H&E).'], ['EP', 13, 'Simple columnar epithelium: tall cells with oval nuclei in a row (H&E).']],
    pseudo: [['EP', 21, 'Pseudostratified ciliated columnar epithelium of the trachea (H&E).'], ['EP', 19, 'Pseudostratified columnar epithelium: nuclei at several levels (H&E).']],
    'strat-squamous': [['EP', 23, 'Keratinised stratified squamous epithelium of skin: a pale keratin layer on top (H&E).'], ['EP', 26, 'Non-keratinised stratified squamous epithelium: flat cells at the surface still have nuclei (H&E).']],
    'strat-cuboidal': [['EP', 30, 'Stratified cuboidal epithelium: two layers of cuboidal cells lining a duct (H&E).']],
    transitional: [['EP', 33, 'Transitional epithelium, relaxed bladder (H&E).'], ['EP', 34, 'Transitional epithelium, stretched bladder: fewer, flatter layers (H&E).']],
  },
};

/* Labobo's own diagrams (made from study-guides/image-prompts.md), from
   study-guides/img/incoming/<name>.png. guide -> section -> [[name, caption, options]].
   They go above the slide pictures, full width. options.cropTop drops that
   share of the picture's top (a picture that came back with something extra). */
const DRAWN = {
  'gct/biochemistry/wk01-water-ph-buffers.html': {
    compartments: [['bio-wk01-water-compartments', 'About two-thirds of the body’s water is inside cells (ICF); one-third is outside them (ECF), split between interstitial fluid and plasma.']],
    raas: [['bio-wk01-raas', 'The renin–angiotensin–aldosterone system: low pressure or low Na⁺ releases renin, and angiotensin II raises blood pressure three ways.']],
    'lungs-kidneys': [['bio-wk01-bicarbonate', 'The bicarbonate buffer: the lungs remove CO₂ within minutes; the kidneys remove H⁺ and keep HCO₃⁻ over hours to days.']],
  },
  'gct/biochemistry/wk02-major-compounds.html': {
    fatty: [['bio-wk02-fatty-acids', 'Saturated chains are straight and pack tightly (solid fats); a cis double bond kinks the chain, so oils stay liquid. A trans double bond keeps it straight.']],
    steroids: [['bio-wk02-steroid-rings', 'The steroid nucleus: three six-carbon rings (A–C) and one five-carbon ring (D), shared by cholesterol, bile acids, steroid hormones and vitamin D.']],
  },
  'gct/biochemistry/wk03-amino-acids.html': {
    structure: [['bio-wk03-amino-acid', 'Every amino acid: an α-carbon with an amino group, a carboxyl group, a hydrogen and a side chain. At pH 7.4 both groups are charged (a zwitterion). Proteins use L-amino acids.']],
    cholera: [['bio-wk03-cholera-toxin', 'Cholera toxin keeps Gsα switched on, so cAMP stays high, CFTR pours Cl⁻ into the gut, and Na⁺ and water follow.']],
  },
  'gct/biochemistry/wk04-protein-structure.html': {
    levels: [['bio-wk04-protein-levels', 'The four levels of protein structure.']],
    proteasome: [['bio-wk04-proteasome', 'A protein tagged with a ubiquitin chain is fed into the 26S proteasome (ATP) and cut into short peptides; the ubiquitin is reused.']],
  },
  'gct/biochemistry/wk05-phospholipids.html': {
    intro: [['bio-wk05-phospholipid', 'A phospholipid: a hydrophilic head (head group, phosphate, glycerol) and two hydrophobic fatty acid tails. In water they form a bilayer.']],
    eicosanoids: [['bio-wk05-eicosanoids', 'Where the anti-inflammatory drugs act: corticosteroids block phospholipase A₂, aspirin and NSAIDs block COX, zileuton blocks 5-lipoxygenase.']],
  },
  'gct/biochemistry/wk06-ecm-fibrous-proteins.html': {
    proteoglycans: [['bio-wk06-proteoglycan', 'A proteoglycan aggregate: core proteins carrying many GAG chains hang from one hyaluronic acid strand by link proteins. The GAGs hold water, which cushions cartilage.']],
    collagen: [['bio-wk06-collagen-levels', 'From one Gly–X–Y chain to a collagen fibre: three chains twist into tropocollagen, which lines up in staggered, cross-linked rows to make banded fibrils.']],
    synthesis: [['bio-wk06-collagen-synthesis', 'Collagen synthesis: steps 1–4 inside the fibroblast, 5–8 outside. Scurvy blocks step 2; Ehlers–Danlos and Menkes affect step 7.']],
  },
  'gct/biochemistry/wk07-globular-proteins.html': {
    curves: [['bio-wk07-o2-curves', 'Myoglobin binds O₂ tightly (hyperbolic curve, P50 ≈ 1 mm Hg); hemoglobin binds cooperatively (sigmoidal, P50 ≈ 26 mm Hg), so it releases O₂ in the tissues.']],
    effectors: [['bio-wk07-right-shift', 'A right shift means hemoglobin gives up O₂ more easily: more CO₂, more H⁺, higher temperature or more 2,3-BPG.']],
    sickle: [['bio-wk07-sickle', 'Sickle cell: HbS (β6 Glu → Val) dissolves when oxygenated but polymerises when deoxygenated, bending the cell into a rigid sickle.']],
  },
  'gct/genetics/wk01-introduction-mendel.html': {
    'terms-core': [['gen-wk01-locus-alleles', 'A homologous pair: the same locus on each chromosome carries one allele. AA and aa are homozygous, Aa heterozygous.']],
    mendel: [['gen-wk01-monohybrid', 'A monohybrid cross Aa × Aa: genotypes 1 : 2 : 1, phenotypes 3 dominant : 1 recessive.']],
  },
  'gct/genetics/wk02-dominance-abo.html': {
    bombay: [['gen-wk02-abo-antigens', 'Why Bombay (hh) looks like group O: without the H antigen there is nothing for the A or B enzyme to build on.']],
    antigens: [['gen-wk02-abo-antigens', 'The H gene adds fucose to make the H antigen; the A or B enzyme then adds one more sugar next to it. Without H (Bombay, hh) neither A nor B can be made.']],
    incomplete: [['gen-wk02-incomplete-dominance', 'Incomplete dominance in snapdragons: red × white gives pink, and the F2 is 1 red : 2 pink : 1 white.']],
    abo: [['gen-wk02-abo-table', 'ABO blood groups: the antigens on the red cells, the antibodies in the plasma, and the genotypes.']],
  },
  'gct/genetics/wk03-gene-interaction-x-linkage.html': {
    'pws-as': [['gen-wk03-imprinting', 'The same 15q11–q13 deletion causes Prader–Willi when it is on the paternal chromosome and Angelman when it is on the maternal one.']],
    assortment: [['gen-wk03-dihybrid', 'A dihybrid cross AaBb × AaBb: genes on different chromosomes assort independently, giving 9 : 3 : 3 : 1.']],
    xlinked: [['gen-wk03-x-linked', 'X-linked recessive: a carrier mother and an unaffected father. Half the sons are affected; half the daughters are carriers.']],
  },
  'gct/genetics/wk04-chromosome-mapping.html': {
    crossing: [['gen-wk04-crossing-over', 'Crossing over between two genes makes recombinant chromatids. The farther apart the genes, the more often it happens: 1% recombination = 1 map unit.']],
  },
  'gct/genetics/wk05-sex-determination.html': {
    sry: [['gen-wk05-sex-differentiation', 'With SRY the gonad becomes a testis: Sertoli cells (AMH) remove the Müllerian ducts and Leydig cells (testosterone) keep the Wolffian ducts. Without SRY an ovary forms.']],
  },
  'gct/genetics/wk06-x-inactivation.html': {
    lyon: [['gen-wk06-x-mosaic', 'Random X inactivation in the early embryo makes a female a mosaic of cells using the maternal or the paternal X. Barr bodies = number of X chromosomes − 1.', { cropTop: 0.52 }]],
  },
  'gct/genetics/wk07-sex-chromosome-aneuploidies.html': {
    nondisjunction: [['gen-wk07-nondisjunction', 'Nondisjunction in meiosis I makes only abnormal gametes; in meiosis II half the gametes are normal.']],
  },
  'gct/molecular-biology/lec01-cells-prokaryote-eukaryote.html': {
    'two-types': [['mb-lec01-pro-vs-eu', 'A prokaryote (no nucleus: DNA in a nucleoid, 70S ribosomes) next to a eukaryote (nucleus and membrane-bound organelles, 80S ribosomes).']],
    sizes: [['mb-lec01-size-scale', 'Sizes from atoms to a human egg, and what the eye, the light microscope and the electron microscope can resolve.']],
  },
  'gct/molecular-biology/lec02-cell-types-viruses.html': {
    viruses: [['mb-lec02-virus', 'A naked virus (capsid of capsomeres around DNA or RNA), an enveloped virus, and a bacteriophage.']],
    cycles: [['mb-lec02-lytic-lysogenic', 'The lytic cycle ends with the cell bursting; in the lysogenic cycle the phage DNA hides in the chromosome until stress switches it to lytic.']],
  },
  'gct/molecular-biology/lec03-chemical-basis-macromolecules.html': {
    dna: [['mb-lec03-double-helix', 'DNA: antiparallel sugar–phosphate strands joined by base pairs (A=T with 2 hydrogen bonds, G≡C with 3), twisted into a 2 nm double helix.']],
  },
  'gct/molecular-biology/lec04-protein-structure-folding.html': {
    anfinsen: [['mb-lec04-anfinsen', 'Anfinsen’s experiment: urea and β-mercaptoethanol unfold ribonuclease and break its disulfide bonds; when they are removed it folds back and works again.']],
    secondary: [['mb-lec04-helix-sheet', 'The α-helix (hydrogen bonds four residues apart, side chains pointing out) and the β-pleated sheet (parallel and antiparallel strands).']],
    chaperones: [['mb-lec04-chaperonin', 'A chaperonin: the unfolded chain enters the GroEL barrel, the GroES lid closes with ATP, and the protein folds in a protected chamber.']],
  },
  'gct/molecular-biology/lec05-mitochondria-respiration.html': {
    chemiosmosis: [['mb-lec05-chemiosmosis', 'Chemiosmosis: electron transport pumps H⁺ out of the matrix; H⁺ flowing back through ATP synthase spins its rotor and makes ATP.']],
    structure: [['mb-lec05-mitochondrion', 'Inside a mitochondrion.']],
  },
  'gct/molecular-biology/lec07-endomembrane-system.html': {
    pathways: [['mb-lec07-pathways', 'The three routes: biosynthetic (ER → Golgi → membrane and lysosomes), secretory (constitutive and regulated), and endocytic (membrane → endosome → lysosome).']],
  },
  'gct/histology/lec01-methods-of-study.html': {
    preparation: [['his-lec01-processing', 'Tissue processing, from fixation to an H&E-stained slide.']],
    ihc: [['his-lec01-ihc', 'Direct immunohistochemistry uses one labelled antibody; indirect adds labelled secondary antibodies, so each protein carries more labels and the signal is stronger.']],
  },
  'gct/histology/lec02-microscopy.html': {
    em: [['his-lec02-lm-tem-sem', 'Light microscope, TEM (electrons pass through an ultra-thin section) and SEM (electrons scan a surface, giving a 3-D look).']],
  },
  'gct/histology/lec03-plasma-membrane-transport.html': {
    proteins: [['his-lec03-fluid-mosaic', 'The fluid mosaic: a phospholipid bilayer with cholesterol, integral, multipass and peripheral proteins, a sugar coat (glycocalyx) and lipid rafts.']],
    endocytosis: [['his-lec03-endocytosis', 'The three kinds of endocytosis.']],
    signalling: [['his-lec03-signalling', 'The five ways cells signal.']],
  },
  'gct/histology/lec04-ribosomes-er-golgi.html': {
    'golgi-traffic': [['his-lec04-secretory-cell', 'The secretory path in a gland cell: rough ER at the base, Golgi from cis to trans face, secretory granules at the apex, then exocytosis.']],
  },
  'gct/histology/lec05-lysosomes-proteasomes-peroxisomes.html': {
    digestion: [['his-lec05-lysosome-routes', 'Three routes into the lysosome: phagocytosis, endocytosis and autophagy. What cannot be digested stays as a residual body (lipofuscin).']],
  },
  'gct/histology/lec06-mitochondria-inclusions.html': {
    structure: [['mb-lec05-mitochondrion', 'Inside a mitochondrion.']],
  },
  'gct/histology/lec07-cytoskeleton.html': {
    compare: [['his-lec07-filaments', 'The three cytoskeletal filaments drawn to relative width.']],
    motors: [['his-lec07-motors', 'Motor proteins on a microtubule: dynein walks to the − end (toward the nucleus), kinesin to the + end (toward the cell edge).']],
  },
};
const INCOMING = path.join(ROOT, 'img', 'incoming');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const OUT = path.join(ROOT, 'img', 'slides');
const DRAWN_OUT = path.join(ROOT, 'img', 'drawn');

// 1. Collect every picture to copy.
const jobs = [];
const figures = {};
for (const [guide, sections] of Object.entries(DRAWN)) {
  for (const [section, list] of Object.entries(sections)) {
    for (const [name, caption, opts = {}] of list) {
      const src = path.join(INCOMING, `${name}.png`);
      if (!fs.existsSync(src)) { console.log(`not made yet: ${name}.png (skipped)`); continue; }
      const dest = path.join(DRAWN_OUT, `${name}.jpg`);
      if (!jobs.some((j) => j.dest === dest)) jobs.push({ src, dest, ext: 'jpg', max: 1600, cropTop: opts.cropTop || 0 });
      ((figures[guide] ||= {})[section] ||= []).push({ url: `/guides/img/drawn/${name}.jpg`, dest, caption, drawn: true });
    }
  }
}
for (const [guide, sections] of Object.entries(PICKS)) {
  const slug = guide.replace(/^gct\//, '').replace(/\.html$/, '');
  for (const [section, list] of Object.entries(sections)) {
    list.forEach(([deck, n, caption], k) => {
      const key = D[deck];
      const pic = manifest[key]?.pictures[n - 1];
      if (!pic) throw new Error(`${guide} #${section}: no picture ${deck} #${n}`);
      const ext = 'jpg'; // diagrams too: on a white mat they compress well and stay sharp at 82%
      const name = `${section}-${k + 1}.${ext}`;
      const dest = path.join(OUT, slug, name);
      jobs.push({ src: pic.media, dest, ext, max: 1200, cropTop: 0 });
      ((figures[guide] ||= {})[section] ||= []).push({ url: `/guides/img/slides/${slug}/${name}`, dest, caption, slide: pic.slide });
    });
  }
}

// 2. Copy and shrink them, and read back each one's size.
fs.rmSync(OUT, { recursive: true, force: true });
fs.rmSync(DRAWN_OUT, { recursive: true, force: true });
const jobFile = path.join(ROOT, 'img', '.jobs.json');
fs.mkdirSync(path.dirname(jobFile), { recursive: true });
fs.writeFileSync(jobFile, JSON.stringify(jobs));
const ps = `
Add-Type -AssemblyName System.Drawing
$jobs = Get-Content -Raw '${jobFile.replace(/'/g, "''")}' | ConvertFrom-Json
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$par = New-Object System.Drawing.Imaging.EncoderParameters 1
$par.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 82L
$out = @()
foreach ($j in $jobs) {
  New-Item -ItemType Directory -Force (Split-Path $j.dest) | Out-Null
  try {
    $img = [System.Drawing.Image]::FromFile($j.src)
    $top = [int]($img.Height * [double]$j.cropTop)
    $srcH = $img.Height - $top
    $s = [math]::Min([double]1, [double]$j.max / $img.Width)
    $w = [int]($img.Width * $s); $h = [int]($srcH * $s)
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.Clear([System.Drawing.Color]::White)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
    $g.DrawImage($img, $rect, 0, $top, $img.Width, $srcH, [System.Drawing.GraphicsUnit]::Pixel)
    $bmp.Save($j.dest, $enc, $par)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    $out += "$w x $h"
  } catch { $out += "0 x 0" }
}
$out -join "\`n"
`;
const sizes = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8', maxBuffer: 1 << 24 })
  .trim().split(/\r?\n/).map((l) => l.split(' x ').map(Number));
fs.rmSync(jobFile);
if (sizes.length !== jobs.length) throw new Error(`expected ${jobs.length} sizes, got ${sizes.length}`);
const dims = new Map(jobs.map((j, i) => [j.dest, sizes[i]]));

// System.Drawing cannot open a few files (unusual PNG/JPEG variants). Copy
// those unchanged instead, reading their size from the file header.
function headerSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length - 9;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return [0, 0];
}
for (const sections of Object.values(figures)) {
  for (const list of Object.values(sections)) {
    for (const f of list) {
      if (dims.get(f.dest)[0] && fs.existsSync(f.dest)) continue;
      const job = jobs.find((j) => j.dest === f.dest);
      const buf = fs.readFileSync(job.src);
      const ext = buf[0] === 0x89 ? 'png' : 'jpg';
      const dest = f.dest.replace(/\.jpg$/, '.' + ext);
      fs.writeFileSync(dest, buf);
      f.url = f.url.replace(/\.jpg$/, '.' + ext);
      job.dest = f.dest = dest;
      dims.set(dest, headerSize(buf));
      console.log(`copied unchanged: ${path.relative(ROOT, dest)} (${Math.round(buf.length / 1024)} KB)`);
    }
  }
}
const failed = jobs.filter((j) => !dims.get(j.dest)?.[0]);
for (const j of failed) console.log(`could not read ${j.src} (skipped)`);
for (const sections of Object.values(figures)) {
  for (const [s, list] of Object.entries(sections)) {
    sections[s] = list.filter((f) => dims.get(f.dest)?.[0]);
    if (!sections[s].length) delete sections[s];
  }
}

// 3. Write the figure blocks into the guides.
const AUTO = /\n?<div class="lb-figures[^"]*" data-auto="slides">[\s\S]*?<\/div><!-- \/slides -->\n?/g;
let placed = 0;
for (const [guide, sections] of Object.entries(figures)) {
  const file = path.join(ROOT, guide);
  let html = fs.readFileSync(file, 'utf8').replace(AUTO, '\n');
  for (const [section, list] of Object.entries(sections)) {
    const head = new RegExp(`(<section class="lb-section" id="${section}">\\s*<h2>[^<]*</h2>)`);
    if (!head.test(html)) throw new Error(`${guide}: no section #${section}`);
    const figure = (f) => {
      const [w, h] = dims.get(f.dest);
      return `  <figure class="lb-figure${f.drawn ? ' lb-drawn' : ''}">
    <img src="${f.url}" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${esc(f.caption)}">
    <figcaption>${esc(f.caption)} <span class="lb-credit">${f.drawn ? 'Labobo diagram' : `Lecture slide ${f.slide}`}</span></figcaption>
  </figure>`;
    };
    // Our own diagram first and full width, then the slide pictures (two to a row).
    const drawn = list.filter((f) => f.drawn);
    const slides = list.filter((f) => !f.drawn);
    const blocks = [drawn, slides].filter((l) => l.length).map((l) =>
      `\n<div class="lb-figures${l.length > 1 && !l[0].drawn ? ' lb-figures-2' : ''}" data-auto="slides">\n${l.map(figure).join('\n')}\n</div><!-- /slides -->`);
    html = html.replace(head, `$1${blocks.join('')}`);
    placed += list.length;
  }
  fs.writeFileSync(file, html);
}
const kb = jobs.filter((j) => fs.existsSync(j.dest)).reduce((s, j) => s + fs.statSync(j.dest).size, 0) / 1024;
const drawnCount = jobs.filter((j) => j.dest.startsWith(DRAWN_OUT) && fs.existsSync(j.dest)).length;
console.log(`${placed} pictures placed in ${Object.keys(figures).length} guides (${drawnCount} Labobo diagrams, the rest from the slides; ${(kb / 1024).toFixed(1)} MB).`);
