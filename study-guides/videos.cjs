/* Puts the "Watch" boxes into the study guides.

     node study-guides/videos.cjs

   Each entry names a guide, the section it explains (the section's id), and
   one or more YouTube videos with where to start and stop. The box goes at
   the end of that section, so the student reads the section and then
   watches the part of the video that explains it. Running the script again
   replaces the boxes it added before, so this file is the one place to edit.

   Every video id and chapter time here was read from the video's own page
   (its chapter list). Channels: Ninja Nerd, Dr Matt & Dr Mike, Medicosis
   Perfectionalis. */

const fs = require('fs');
const path = require('path');

const NN = 'Ninja Nerd';
const MM = 'Dr Matt &amp; Dr Mike';
const MP = 'Medicosis Perfectionalis';

/** One video: v(id, channel, title, from 'm:ss', to 'm:ss' | 'end', what it covers). */
const v = (id, channel, title, from, to, what) => ({ id, channel, title, from, to, what });

const GUIDES = {
  'gct/biochemistry/wk01-water-ph-buffers.html': {
    compartments: [v('Qotgezmz55o', MM, 'Fluid Compartments &amp; Fluid Balance', '0:40', '6:45', 'where body water is and how it splits between cells, interstitium and plasma')],
    osmolality: [v('xgyLjC_iHMg', MP, 'Osmolality, Osmolarity, and Tonicity', '0:00', '7:04', 'osmosis, osmolality and why water moves between compartments')],
    ph: [
      v('-kseXPCn1Ho', MM, 'Acids, Bases, and Buffers', '0:00', '8:25', 'why pH matters, what acids and bases are, and the body’s acids'),
      v('AOr_5tbgfQ0', NN, 'General Chemistry | Acids &amp; Bases', '7:25', '28:38', 'strong vs weak acids, conjugate pairs and the pH scale'),
    ],
    buffers: [
      v('tC9EfkOe8IQ', MM, 'Bicarbonate Buffer System', '0:00', 'end', 'the bicarbonate buffer (the video linked on slide 17)'),
      v('-kseXPCn1Ho', MM, 'Acids, Bases, and Buffers', '14:04', 'end', 'the phosphate, protein (hemoglobin) and bicarbonate buffers'),
    ],
    hh: [
      v('-kseXPCn1Ho', MM, 'Acids, Bases, and Buffers', '8:25', '14:04', 'pH, pKa and how a buffer works'),
      v('AOr_5tbgfQ0', NN, 'General Chemistry | Acids &amp; Bases', '28:38', '33:02', 'pKa, pKb and buffers'),
    ],
    'anion-gap': [v('HiFZQ-pOtmw', MM, 'Anion Gap Explained', '0:30', '8:33', 'what the anion gap is and how it is used in metabolic acidosis')],
    'lungs-kidneys': [
      v('7vPRetkeDjI', MM, 'Acid Base Balance | Respiratory Regulation', '0:48', '15:35', 'how breathing controls CO₂ and pH'),
      v('rcvRiglLLL0', MM, 'Acid Base Balance | Renal Regulation', '8:40', 'end', 'how the kidney reabsorbs bicarbonate, excretes H⁺ and makes new bicarbonate'),
    ],
    disorders: [
      v('w3nsxx6AcdA', MM, 'Acidosis and Alkalosis MADE EASY', '0:00', 'end', 'a 5-minute overview of the four disorders'),
      v('tW1oXP9sw98', NN, 'Acid-Base Disorders | Clinical Medicine', '0:45', '32:21', 'metabolic acidosis, including high and normal anion gap causes'),
      v('tW1oXP9sw98', NN, 'Acid-Base Disorders | Clinical Medicine', '32:21', '73:33', 'metabolic alkalosis, respiratory acidosis and respiratory alkalosis'),
    ],
  },
  'gct/biochemistry/wk02-major-compounds.html': {
    carbs: [v('AC5yGU7EfBI', MM, 'Carbohydrates | Biochemistry', '0:00', 'end', 'monosaccharides, disaccharides and polysaccharides')],
    fatty: [v('NAGcZpq2h7k', MM, 'Fatty Acids, Glycerol, and Lipids', '0:41', 'end', 'saturated, monounsaturated and polyunsaturated fatty acids')],
    acyl: [v('Wm7UR0zCQzM', NN, 'Metabolism | The Metabolic Map: Lipids', '4:12', '7:53', 'glycerol, fatty acids and how triacylglycerols are built')],
    sphingo: [v('yXLBuy38jQM', NN, 'Cell Biology | Tay-Sachs, Fabry, Gaucher, Niemann-Pick Disease', '29:01', '31:25', 'Niemann–Pick disease')],
    nitrogen: [v('yLsIvVs5ZWI', MM, 'DNA and Nucleotides | Biochemistry', '0:00', 'end', 'bases, nucleosides and nucleotides')],
  },
  'gct/biochemistry/wk03-amino-acids.html': {
    structure: [
      v('9ssCKw-7OvQ', MM, 'Proteins &amp; Amino Acids | Biochemistry', '0:30', '2:00', 'the general structure of an amino acid'),
      v('KbJAqwypP7c', MP, 'Amino Acids - What is their structure?', '2:42', '7:29', 'amino acid structure and the names and abbreviations'),
    ],
    cystinuria: [v('w8MaAG_oVwI', MP, 'Cystinuria - Inborn error of metabolism', '0:00', '9:24', 'genetics, stones, diagnosis and treatment of cystinuria')],
  },
  'gct/biochemistry/wk04-protein-structure.html': {
    primary: [v('9ssCKw-7OvQ', MM, 'Proteins &amp; Amino Acids | Biochemistry', '2:00', 'end', 'how amino acids join into polypeptides')],
    secondary: [v('qnCZyE_P5-o', MP, 'Protein Structure - Primary, Secondary, Tertiary, and Quaternary', '8:05', '14:30', 'primary and secondary structure')],
    tertiary: [v('qnCZyE_P5-o', MP, 'Protein Structure - Primary, Secondary, Tertiary, and Quaternary', '14:30', '18:50', 'tertiary structure')],
    quaternary: [v('qnCZyE_P5-o', MP, 'Protein Structure - Primary, Secondary, Tertiary, and Quaternary', '18:50', 'end', 'quaternary structure and a review of all four levels')],
    alzheimer: [v('YCvo86laWv0', MM, 'Dementia &amp; Alzheimer’s Disease', '5:10', '13:20', 'amyloid plaques and neurofibrillary tangles')],
  },
  'gct/biochemistry/wk05-phospholipids.html': {
    intro: [v('iYG_GH1EdEc', NN, 'Cell Membrane Structure &amp; Function', '2:09', '8:20', 'the membrane lipids and why they are amphipathic')],
    pc: [v('gjLCu8qe2nI', NN, 'Respiratory | Surface Tension &amp; Surfactant in Alveoli', '27:17', 'end', 'what surfactant is, who makes it and how it is secreted')],
    niemann: [v('yXLBuy38jQM', NN, 'Cell Biology | Tay-Sachs, Fabry, Gaucher, Niemann-Pick Disease', '29:01', '31:25', 'Niemann–Pick disease')],
    lipidoses: [v('yXLBuy38jQM', NN, 'Cell Biology | Tay-Sachs, Fabry, Gaucher, Niemann-Pick Disease', '17:59', '29:01', 'Tay–Sachs and Gaucher disease (start at 0:43 if you want lysosomes explained first)')],
    drugs: [v('Szi_Y1DLCMk', MM, 'NSAIDs | Non-Steroidal Anti-Inflammatory Drugs', '4:45', 'end', 'prostaglandins and how NSAIDs block COX')],
  },
  'gct/biochemistry/wk06-ecm-fibrous-proteins.html': {
    ecm: [v('0z9rF2kJaXs', MM, 'Connective Tissue | Everything you need to know!', '4:04', '12:14', 'the fibres and ground substance of connective tissue')],
    collagen: [v('03ILx-qr14U', MP, 'Types of collagen (I, II, III, IV, and V)', '3:47', '7:01', 'how collagen is made and its types')],
    synthesis: [v('dt4MKf9Hg7g', MP, 'Collagen post-translational modification', '0:00', 'end', 'hydroxylation, glycosylation and cross-linking of collagen')],
    oi: [v('aSyj6NfxRA0', MP, 'Osteogenesis Imperfecta (OI) - Brittle Bone Disease', '0:00', '10:32', 'causes and signs of osteogenesis imperfecta')],
    eds: [v('ejU4SRfg0M8', MP, 'Ehlers-Danlos Syndrome', '0:00', '10:36', 'collagen defects, genetics and the types of Ehlers–Danlos')],
    scurvy: [
      v('a5zysnKj0pQ', MP, 'Scurvy - Vitamin C Deficiency', '0:00', 'end', 'why vitamin C deficiency weakens collagen'),
      v('yjsMSWh2U6s', MP, 'Menkes Disease - Menkes Kinky Hair Syndrome - Copper', '0:00', 'end', 'Menkes disease and copper'),
    ],
    alport: [v('iW-4yzHUuWw', MP, 'Alport Syndrome | Nephritic | 5-Minute Review Series', '6:52', '9:44', 'Alport syndrome')],
    elastin: [v('07pTJjXPj5g', MP, 'Marfan Syndrome - Causes, Symptoms, Diagnosis, and Treatment', '0:00', '12:23', 'fibrillin, lens dislocation and the aorta in Marfan syndrome')],
    aat: [v('l4raS9QB4Tc', NN, 'Inherited Liver Diseases | Clinical Medicine', '18:23', '22:56', 'α1-antitrypsin deficiency in the lung and liver')],
  },
  'gct/biochemistry/wk07-globular-proteins.html': {
    heme: [v('HNi_xkbBOlY', MP, 'Hemoglobin Structure; What’s In Your Red Blood Cell?', '0:00', 'end', 'globin chains and heme')],
    curves: [
      v('bhJarMGNFw4', NN, 'Respiratory | Oxygen-Hemoglobin Dissociation Curve', '0:00', '5:54', 'the shape of the curve under normal conditions'),
      v('wQ2eCRN02f4', MP, 'Oxygen Hemoglobin Dissociation Curve (with a mnemonic)', '0:00', 'end', 'a short summary with a mnemonic'),
    ],
    effectors: [v('bhJarMGNFw4', NN, 'Respiratory | Oxygen-Hemoglobin Dissociation Curve', '16:06', '20:44', 'the Bohr effect')],
    co: [v('6iyAHeH7nHg', MP, 'Carbon Monoxide Poisoning', '7:28', '12:34', 'how CO binds hemoglobin and shifts the curve')],
    genes: [
      v('HYZMFZbNbPQ', MP, 'Alpha Thalassemia - All You Need to Know', '2:41', '6:55', 'α-thalassemia: genes lost, HbH and Hb Bart'),
      v('uVV-QxOo2uI', MP, 'Beta Thalassemia - Causes and Types', '0:00', 'end', 'β⁰ and β⁺, thalassemia minor, intermedia and major'),
    ],
    methb: [v('2RFcH_nlR84', MP, 'Methemoglobinemia - Your Hemoglobin is NOT what it should be!', '0:00', 'end', 'Fe³⁺ hemoglobin, its causes and treatment')],
    sickle: [v('jkOvpKn1tUg', MP, 'Sickle Cell Disease “part 2” - Pathophysiology', '1:46', 'end', 'oxygen cycling, HbS polymerisation and why HbF does not sickle')],
  },
  'gct/biochemistry/wk10-11-enzymes.html': {
    mm: [
      v('CotD9m8Wm78', MP, 'Michaelis-Menten Equation &amp; Enzyme Kinetics', '3:12', 'end', 'the Michaelis–Menten curve, Km and Vmax'),
      v('4eLjRcHnMCk', NN, 'Biochemistry | Michaelis-Menten Equation', '2:30', 'end', 'the steady-state assumption, the equation and what Km says about affinity'),
    ],
    inhibition: [
      v('jJUoQMLMV2E', NN, 'Biochemistry | Enzyme Inhibition', '1:50', '18:24', 'competitive and noncompetitive inhibition'),
      v('jJUoQMLMV2E', NN, 'Biochemistry | Enzyme Inhibition', '27:21', 'end', 'irreversible inhibition'),
      v('ieFZBP8Vg4I', MP, 'Competitive vs Non-competitive inhibitors', '0:00', 'end', 'a 10-minute comparison of the two'),
    ],
  },
  'gct/biochemistry/wk12-purine-metabolism.html': {
    denovo: [
      v('4GFKdLy2fOE', NN, 'Metabolism | Nucleotide Synthesis | Purine and Pyrimidine Synthesis', '29:42', 'end', 'purine synthesis, then GMP and AMP'),
      v('EHZuFDf7VPE', MP, 'Purine Metabolism - De Novo, Salvage, Degradation, Uric Acid', '6:54', '8:49', 'de novo purine synthesis'),
    ],
    salvage: [v('EHZuFDf7VPE', MP, 'Purine Metabolism - De Novo, Salvage, Degradation, Uric Acid', '8:49', '13:51', 'degradation to uric acid and the salvage pathway')],
    gout: [v('1f9r9nPt1GA', MP, 'Gout Diagnosis', '0:42', '15:00', 'what gout is, risk factors and joint-fluid crystals')],
    tls: [v('Vq2-koDMYKU', MP, 'Gout Management', '11:53', '17:48', 'xanthine oxidase inhibitors, uricase and uricosurics')],
  },
  'gct/biochemistry/wk13-pyrimidine-metabolism.html': {
    synthesis: [v('4GFKdLy2fOE', NN, 'Metabolism | Nucleotide Synthesis | Purine and Pyrimidine Synthesis', '14:41', '24:48', 'pyrimidine synthesis')],
    dtmp: [v('4GFKdLy2fOE', NN, 'Metabolism | Nucleotide Synthesis | Purine and Pyrimidine Synthesis', '24:48', '29:42', 'ribonucleotide reduction and thymine (dTMP) synthesis')],
    drugs: [v('ChOaLWtNrAc', MM, 'Methotrexate - Mechanism of Action', '0:00', 'end', 'how methotrexate blocks DNA synthesis')],
  },
  'gct/biochemistry/wk14-metabolism-tca.html': {
    pathways: [v('Lf4irlyN1eE', MM, 'Metabolism Overview', '0:00', '12:13', 'an overview of metabolism and the macronutrients')],
    pdh: [
      v('5WHFJ0ypeFE', NN, 'Metabolism | Transition Stage (Preparatory Phase)', '0:00', 'end', 'a 6-minute overview of pyruvate → acetyl-CoA'),
      v('U1nK68V3SeA', NN, 'Metabolism | Regulation of the Transition Stage', '2:56', '14:07', 'the PDH complex and its three enzymes'),
    ],
    'pdh-control': [v('U1nK68V3SeA', NN, 'Metabolism | Regulation of the Transition Stage', '14:07', 'end', 'PDH kinase, PDH phosphatase and clinical relevance')],
    'pdh-deficiency': [v('ikDRv59qOUc', MP, 'Vitamin B1 - Thiamine - Quick Review', '3:58', 'end', 'thiamine deficiency and its effects')],
    steps: [
      v('JOncWQUpMzc', MM, 'Krebs Cycle | Made Easy!', '5:57', '13:16', 'each step from citrate back to oxaloacetate'),
      v('rr7IRYLqleg', NN, 'Metabolism | The Krebs Cycle', '0:00', 'end', 'every enzyme of the cycle in detail'),
    ],
    energy: [v('JOncWQUpMzc', MM, 'Krebs Cycle | Made Easy!', '13:16', '14:39', 'the net yield of one turn')],
  },
  'gct/biochemistry/wk15-etc-oxidative-phosphorylation.html': {
    complexes: [
      v('ClBDozXUIWc', MM, 'Electron Transport Chain | Made Easy', '0:31', '9:39', 'the carriers and Complexes I to IV'),
      v('AsD0hOkVZXU', NN, 'Metabolism | Electron Transport Chain: Overview', '0:00', '26:05', 'the whole chain step by step'),
    ],
    synthase: [
      v('ClBDozXUIWc', MM, 'Electron Transport Chain | Made Easy', '9:39', 'end', 'how ATP synthase makes ATP'),
      v('AsD0hOkVZXU', NN, 'Metabolism | Electron Transport Chain: Overview', '26:05', 'end', 'how much ATP each NADH and FADH₂ gives'),
    ],
    cyanide: [v('UbkYCrLXHNk', MP, 'Cyanide Poisoning', '0:00', 'end', 'how cyanide blocks Complex IV and how it is treated')],
  },

  // Medical Genetics
  'gct/genetics/wk01-introduction-mendel.html': {
    'terms-core': [v('tltFH-kRMoc', MM, 'Inheritance and Punnett squares', '0:00', 'end', 'genotype, phenotype, homozygous, heterozygous, dominant and recessive')],
    mendel: [
      v('2-R33y2IvnI', MP, '1st &amp; 2nd Mendelian Laws', '1:00', '3:57', 'Punnett squares and the law of segregation'),
      v('En4Z7oijNBY', MP, 'Punnett Squares - Monohybrid Cross, Dihybrid Cross', '2:23', '5:36', 'monohybrid crosses and the test cross'),
    ],
    variation: [v('MWSAyHvH3tQ', MP, 'Types of Mutations | Changes in the Gene Pool', '0:00', '6:44', 'how mutations create variation')],
  },
  'gct/genetics/wk02-dominance-abo.html': {
    'tay-sachs': [v('yXLBuy38jQM', NN, 'Cell Biology | Tay-Sachs, Fabry, Gaucher, Niemann-Pick Disease', '17:59', '28:11', 'Tay–Sachs disease and Hex A')],
    abo: [
      v('Amn2EWTY2Lk', MM, 'ABO Blood Types Made Easy!', '0:00', 'end', 'antigens and antibodies of each blood type'),
      v('xXgzXXUEbFU', MP, 'Blood Types (ABO system) - Blood Groups', '0:29', 'end', 'the ABO system, antibodies and blood typing'),
    ],
  },
  'gct/genetics/wk03-gene-interaction-x-linkage.html': {
    assortment: [
      v('2-R33y2IvnI', MP, '1st &amp; 2nd Mendelian Laws', '2:59', '5:05', 'independent assortment and meiosis'),
      v('En4Z7oijNBY', MP, 'Punnett Squares - Monohybrid Cross, Dihybrid Cross', '5:36', 'end', 'the dihybrid cross and 9 : 3 : 3 : 1'),
    ],
    xlinked: [
      v('BcXQJoFMWN0', MM, 'X-linked Inheritance and Punnett Squares', '0:00', 'end', 'X-linked crosses with Punnett squares'),
      v('CbSg-DXNWFE', MM, 'Genetic inheritance of disease', '15:30', 'end', 'autosomal dominant and sex-linked disease patterns'),
    ],
  },
  'gct/genetics/wk04-chromosome-mapping.html': {
    crossing: [v('_OhcR5hUI90', MP, 'Sex-linked Crosses and Gene maps', '4:12', '9:01', 'linked genes, crossing over and chromosome mapping')],
  },
  'gct/genetics/wk07-sex-chromosome-aneuploidies.html': {
    turner: [v('fNU6pVnKVY8', MP, 'Cardiovascular complications in Turner syndrome', '0:00', 'end', 'the heart and aorta in Turner syndrome')],
  },
  'gct/genetics/wk11-chromatin.html': {
    nucleosome: [v('S6LXyzZn5Ls', NN, 'Cell Biology | DNA Structure &amp; Organization', '8:55', '22:05', 'chromatin and the histone proteins of the nucleosome')],
    remodeling: [v('TLvXWAWlMh8', MP, 'Control of Gene Expression | Acetylation vs Methylation', '4:41', '7:01', 'how chromatin opening controls gene expression')],
  },
  'gct/genetics/wk13-gene-mutations.html': {
    point: [v('MWSAyHvH3tQ', MP, 'Types of Mutations | Changes in the Gene Pool', '1:24', '7:51', 'types of mutations, with sickle cell as an example')],
    repair: [v('5eB-GOJvsqM', MP, 'How DNA Repairs Itself (Proofreading, Mismatch, Excision Repair)', '0:00', '13:07', 'proofreading, mismatch repair and excision repair')],
  },
  'gct/genetics/wk14-mutations-beta-thalassemia.html': {
    thal: [v('uVV-QxOo2uI', MP, 'Beta Thalassemia - Causes and Types', '0:00', 'end', 'β⁰ and β⁺ mutations and thalassemia minor, intermedia and major')],
  },
  'gct/genetics/wk15-trinucleotide-repeats.html': {
    diseases: [v('gbFoRtbzygA', MP, 'Huntington Disease - Chorea, trinucleotide repeats (CAG)', '0:00', 'end', 'a 2-minute summary of Huntington disease')],
  },
  'gct/genetics/wk16-dna-repair-xp.html': {
    ner: [v('5eB-GOJvsqM', MP, 'How DNA Repairs Itself (Proofreading, Mismatch, Excision Repair)', '0:00', '13:07', 'how mismatch and excision repair work')],
    xp: [v('wklWGURTUi8', MP, 'Xeroderma Pigmentosum', '0:00', 'end', 'how a nucleotide excision repair defect causes XP')],
  },

  // Molecular Biology
  'gct/molecular-biology/lec01-cells-prokaryote-eukaryote.html': {
    'two-types': [v('R7e9k0ypRZ0', MM, 'Eukaryotic vs. Prokaryotic Cells', '0:00', 'end', 'how bacterial cells differ from human cells')],
    compare: [v('ayFiGn2fYi8', NN, 'Bacteria | Structure and Function', '0:30', '4:55', 'an overview of how a bacterial cell is built')],
  },
  'gct/molecular-biology/lec02-cell-types-viruses.html': {
    eukaryotes: [v('tUDLMni7R_E', MM, 'The Cell and Organelles', '0:00', 'end', 'a 7-minute tour of the eukaryotic cell and its organelles')],
    viruses: [v('DLTbpTXox08', MP, 'An Introduction To Virology', '0:00', 'end', 'what a virus is and how it is built')],
  },
  'gct/molecular-biology/lec04-protein-structure-folding.html': {
    aa: [v('9ssCKw-7OvQ', MM, 'Proteins &amp; Amino Acids', '0:00', 'end', 'amino acids and how they join into polypeptides')],
    secondary: [v('qnCZyE_P5-o', MP, 'Protein Structure - Primary, Secondary, Tertiary, and Quaternary', '8:05', '14:30', 'primary and secondary structure')],
    tertiary: [v('qnCZyE_P5-o', MP, 'Protein Structure - Primary, Secondary, Tertiary, and Quaternary', '14:30', '18:50', 'the bonds that hold tertiary structure')],
    quaternary: [v('qnCZyE_P5-o', MP, 'Protein Structure - Primary, Secondary, Tertiary, and Quaternary', '18:50', '21:27', 'quaternary structure and a review of all four levels')],
  },
  'gct/molecular-biology/lec05-mitochondria-respiration.html': {
    structure: [v('FXDkK-eZeuk', NN, 'Mitochondria Structure &amp; Function', '0:33', '5:52', 'the membranes, cristae and matrix')],
    etc: [v('AsD0hOkVZXU', NN, 'Metabolism | Electron Transport Chain: Overview', '0:00', '26:05', 'how electrons pass along complexes I–IV and drive ATP synthase')],
    yield: [v('AsD0hOkVZXU', NN, 'Metabolism | Electron Transport Chain: Overview', '26:05', 'end', 'counting the ATP made from one glucose')],
  },
  'gct/molecular-biology/lec07-endomembrane-system.html': {
    overview: [v('tUDLMni7R_E', MM, 'The Cell and Organelles', '1:19', '3:58', 'protein synthesis on the ER and processing in the Golgi')],
    er: [v('X1n2ggpzBbc', NN, 'Endoplasmic Reticulum Structure &amp; Function', '0:36', '29:33', 'the structure and the jobs of rough and smooth ER')],
    golgi: [v('TPgyv2411Xo', NN, 'Golgi Apparatus Structure &amp; Function', '0:36', '24:53', 'cis and trans faces and what the Golgi does to proteins')],
    lysosomes: [v('QtGMAgxv72Y', NN, 'Lysosomes Structure &amp; Function', '0:40', '28:15', 'how lysosomes are built, what they digest, and autolysis')],
    peroxisomes: [v('ntM9tyaZJsc', NN, 'Peroxisomes Structure &amp; Function', '0:29', '16:02', 'fatty acid oxidation and hydrogen peroxide breakdown')],
  },
  'gct/molecular-biology/lec08-cotranslational-translocation.html': {
    translocation: [v('X1n2ggpzBbc', NN, 'Endoplasmic Reticulum Structure &amp; Function', '3:18', '14:01', 'how ribosomes on the rough ER feed proteins into the lumen')],
  },
  'gct/molecular-biology/lec10-vesicular-transport.html': {
    exocytosis: [v('xHIzfkbj82U', NN, 'Cell Biology | Passive &amp; Active Transport | Endocytosis &amp; Exocytosis', '1:15:29', '1:22:47', 'how vesicles fuse with the plasma membrane')],
  },
  'gct/molecular-biology/lec11-endocytosis-lysosomes.html': {
    lysosomes: [v('QtGMAgxv72Y', NN, 'Lysosomes Structure &amp; Function', '10:44', '28:15', 'what lysosomes digest and how')],
    endocytosis: [v('xHIzfkbj82U', NN, 'Cell Biology | Passive &amp; Active Transport | Endocytosis &amp; Exocytosis', '57:09', '1:15:29', 'pinocytosis, phagocytosis and receptor-mediated endocytosis')],
    storage: [v('yXLBuy38jQM', NN, 'Cell Biology | Tay-Sachs, Fabry, Gaucher, Niemann-Pick Disease', '17:59', '32:34', 'Tay-Sachs, Gaucher and Niemann-Pick')],
  },
  'gct/molecular-biology/lec14-transcription-mrna-processing.html': {
    dogma: [v('nqlNcm_mMcI', MM, 'DNA Transcription and Translation | DNA to Protein', '0:00', 'end', 'DNA to RNA to protein in 14 minutes')],
    polymerase: [v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '0:31', '23:28', 'how transcription differs in prokaryotes and eukaryotes')],
    bacteria: [v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '23:28', '41:16', 'initiation and elongation')],
    termination: [v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '41:16', '50:23', 'Rho-dependent and Rho-independent termination')],
    polya: [v('WQt2wfehtms', MP, 'Posttranscriptional modification (hnRNA to mRNA)', '3:45', '8:55', 'the 5′ cap and the poly(A) tail, and why the tail protects mRNA')],
    splicing: [v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '1:05:45', '1:14:43', 'the spliceosome and the lariat')],
    alternative: [v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '1:14:43', 'end', 'alternative splicing')],
  },

  // Histology
  'gct/histology/lec03-plasma-membrane-transport.html': {
    membrane: [v('iYG_GH1EdEc', NN, 'Cell Membrane Structure &amp; Function', '0:34', '8:20', 'the lipid bilayer and its lipids')],
    proteins: [v('iYG_GH1EdEc', NN, 'Cell Membrane Structure &amp; Function', '8:20', '17:47', 'integral and peripheral proteins and the glycocalyx')],
    transport: [v('xHIzfkbj82U', NN, 'Cell Biology | Passive &amp; Active Transport | Endocytosis &amp; Exocytosis', '0:31', '57:09', 'simple and facilitated diffusion, and primary and secondary active transport')],
    endocytosis: [v('xHIzfkbj82U', NN, 'Cell Biology | Passive &amp; Active Transport | Endocytosis &amp; Exocytosis', '57:09', '1:15:29', 'pinocytosis, phagocytosis and receptor-mediated endocytosis')],
    exocytosis: [v('xHIzfkbj82U', NN, 'Cell Biology | Passive &amp; Active Transport | Endocytosis &amp; Exocytosis', '1:15:29', '1:22:47', 'exocytosis')],
  },
  'gct/histology/lec04-ribosomes-er-golgi.html': {
    cytoplasm: [v('tUDLMni7R_E', MM, 'The Cell and Organelles', '0:00', 'end', 'a 7-minute tour of the organelles')],
    rer: [v('X1n2ggpzBbc', NN, 'Endoplasmic Reticulum Structure &amp; Function', '0:36', '14:01', 'ER structure and what the rough ER does')],
    ser: [v('X1n2ggpzBbc', NN, 'Endoplasmic Reticulum Structure &amp; Function', '14:01', '29:33', 'what the smooth ER does')],
    'golgi-traffic': [v('TPgyv2411Xo', NN, 'Golgi Apparatus Structure &amp; Function', '0:36', '24:53', 'Golgi faces and how proteins are modified and sorted')],
  },
  'gct/histology/lec05-lysosomes-proteasomes-peroxisomes.html': {
    digestion: [v('QtGMAgxv72Y', NN, 'Lysosomes Structure &amp; Function', '0:40', '25:57', 'how lysosomes are made and what they digest')],
    peroxisomes: [v('ntM9tyaZJsc', NN, 'Peroxisomes Structure &amp; Function', '0:29', '16:02', 'fatty acid oxidation and hydrogen peroxide breakdown')],
  },
  'gct/histology/lec06-mitochondria-inclusions.html': {
    structure: [v('FXDkK-eZeuk', NN, 'Mitochondria Structure &amp; Function', '0:33', '5:52', 'the membranes, cristae and matrix')],
    oxphos: [v('FXDkK-eZeuk', NN, 'Mitochondria Structure &amp; Function', '13:03', '19:03', 'the electron transport chain and ATP synthase')],
  },
  'gct/histology/lec07-cytoskeleton.html': {
    compare: [v('t5DvF5OVr1Y', NN, 'Cell Biology | Cell Structure &amp; Function', '43:20', '54:50', 'actin, intermediate filaments and microtubules')],
  },
  'gct/histology/lec08-nuclear-envelope-nucleolus.html': {
    envelope: [v('u5MozvAH32c', NN, 'Cell Nucleus Structure &amp; Function', '0:33', '3:53', 'the nuclear envelope and pores')],
    pores: [v('u5MozvAH32c', NN, 'Cell Nucleus Structure &amp; Function', '6:47', '16:46', 'what the nuclear envelope and pores control')],
    nucleolus: [v('u5MozvAH32c', NN, 'Cell Nucleus Structure &amp; Function', '26:16', '30:56', 'the nucleolus and ribosome assembly')],
  },
  'gct/histology/lec09-chromatin-chromosomes.html': {
    nucleosome: [v('S6LXyzZn5Ls', NN, 'Cell Biology | DNA Structure &amp; Organization', '8:55', '22:05', 'histones, nucleosomes and chromatin packing')],
    types: [v('u5MozvAH32c', NN, 'Cell Nucleus Structure &amp; Function', '16:46', '26:16', 'euchromatin and heterochromatin')],
  },
  'gct/histology/lec10-cell-cycle-mitosis.html': {
    checkpoints: [v('9ZoZx2FK9DE', NN, 'Cell Biology | Cell Cycle Regulation', '0:37', '29:40', 'cyclins, CDKs, growth factors and checkpoint genes such as p53')],
    mitosis: [v('LUDws4JrIiI', NN, 'Cell Biology | Cell Cycle: Interphase &amp; Mitosis', '0:00', 'end', 'interphase and every stage of mitosis')],
  },
  'gct/histology/lec11-stem-cells-meiosis-apoptosis.html': {
    meiosis: [v('ANri3kaEOm4', MP, 'Meiosis - Cell Division', '0:00', 'end', 'meiosis I and II compared with mitosis')],
    apoptosis: [v('9ZoZx2FK9DE', NN, 'Cell Biology | Cell Cycle Regulation', '29:40', '37:15', 'the proteins that trigger apoptosis')],
  },
  'gct/histology/lec12-epithelial-cells-junctions.html': {
    features: [v('_vsKkLTnJCU', MM, 'Epithelial Tissue', '0:00', '2:40', 'what epithelium is and how its form fits its function')],
    junctions: [v('gmlA8V2zMv4', NN, 'Cell Junctions', '5:19', '32:17', 'tight junctions, adherens junctions and desmosomes'), v('gmlA8V2zMv4', NN, 'Cell Junctions', '38:06', '45:24', 'gap junctions')],
    basal: [v('gmlA8V2zMv4', NN, 'Cell Junctions', '32:17', '38:06', 'hemidesmosomes')],
  },
  'gct/histology/lec14-types-of-epithelia-glands.html': {
    classify: [v('ddHQW0QnbDI', MM, 'Epithelial classification', '1:23', '7:06', 'naming epithelia by layers and cell shape')],
    simple: [v('ddHQW0QnbDI', MM, 'Epithelial classification', '7:06', '10:58', 'simple squamous, cuboidal and columnar')],
    stratified: [v('ddHQW0QnbDI', MM, 'Epithelial classification', '10:58', '14:17', 'stratified epithelia')],
    special: [v('ddHQW0QnbDI', MM, 'Epithelial classification', '14:17', 'end', 'transitional epithelium'), v('_vsKkLTnJCU', MM, 'Epithelial Tissue', '2:40', 'end', 'pseudostratified columnar epithelium')],
  },
  'gct/histology/practical-epithelium.html': {
    method: [v('ddHQW0QnbDI', MM, 'Epithelial classification', '0:00', 'end', 'how to classify every type of epithelium')],
  },
  // GCT II. Chapter times read from each video's page on 17 Nov 2026.
  'gct-2/biochemistry/lec07-hemostasis.html': {
    water: [
      v('YNROPnYy1tc', MP, 'Starling Forces made easy: Hydrostatic vs Oncotic Pressure', '7:57', '13:41', 'Starling forces along a capillary and why low plasma protein causes edema'),
      v('cl1B9lwoJTE', MM, 'Swelling and Oedema (Capillary Exchange)', '0:00', 'end', 'how a fall in plasma proteins leads to oedema'),
    ],
    transport: [v('EBf97p7AeZc', MP, 'Albumin &amp; Globulins: Plasma Proteins and Electrophoresis', '0:00', 'end', 'albumin and the globulins, and what they carry')],
    plug: [
      v('SGzp9wqeu84', NN, 'Hematology | Hemostasis: Coagulation Cascade', '6:22', '16:58', 'vascular spasm and platelet plug formation'),
      v('8FTuOjO7j-s', MM, 'Hemostasis and the Clotting Cascade', '1:33', '7:55', 'vascular spasm and the platelet plug'),
      v('EEE4ReO1Pxs', MP, 'Von Willebrand Factor (vWF): Platelets and Coagulation', '0:00', 'end', 'what vWF does in platelet adhesion and for factor VIII'),
    ],
    process: [
      v('SGzp9wqeu84', NN, 'Hematology | Hemostasis: Coagulation Cascade', '16:58', '36:13', 'the coagulation cascade, clot retraction and repair'),
      v('8FTuOjO7j-s', MM, 'Hemostasis and the Clotting Cascade', '7:55', '20:46', 'the extrinsic, intrinsic and common pathways (the videos also show factor XII; for this lecture, follow the book)'),
    ],
    complexes: [v('8FTuOjO7j-s', MM, 'Hemostasis and the Clotting Cascade', '20:46', 'end', 'why the clotting factors need vitamin K and calcium')],
    fibrinolysis: [
      v('SGzp9wqeu84', NN, 'Hematology | Hemostasis: Coagulation Cascade', '36:13', '39:27', 'fibrinolysis: plasminogen, t-PA and plasmin'),
      v('aSRI6BGXX70', NN, 'Antiplatelet, Anticoagulant, Thrombolytic Agents', '50:29', '1:00:45', 'fibrinolysis and how thrombolytic drugs work'),
    ],
    drugs: [
      v('8E5VwvN0MCU', NN, 'Antiplatelets, Anticoagulants, and Thrombolytics | Clinical Medicine', '0:37', '30:53', 'antiplatelet drugs, including the P2Y12 blockers'),
      v('8E5VwvN0MCU', NN, 'Antiplatelets, Anticoagulants, and Thrombolytics | Clinical Medicine', '30:53', '58:48', 'heparins, warfarin, fondaparinux, direct thrombin and Xa inhibitors'),
      v('aSRI6BGXX70', NN, 'Antiplatelet, Anticoagulant, Thrombolytic Agents', '2:15:07', '2:26:50', 'heparin adverse effects, including heparin-induced thrombocytopenia'),
    ],
  },
};

const seconds = (t) => t.split(':').reduce((s, x) => s * 60 + Number(x), 0);

function box(videos) {
  const items = videos.map((x) => {
    const t = seconds(x.from);
    const url = `https://www.youtube.com/watch?v=${x.id}${t ? `&amp;t=${t}s` : ''}`;
    const range = x.to === 'end' ? `from ${x.from} to the end` : `from ${x.from} to ${x.to}`;
    return `    <li><a href="${url}" target="_blank" rel="noopener">${x.channel} · ${x.title}</a>
      <span class="lb-when">Watch ${range}: ${x.what}.</span></li>`;
  });
  return `<aside class="lb-box lb-video" data-auto="video">
    <span class="lb-box-title">Watch: explains the section above</span>
    <ul>
${items.join('\n')}
    </ul>
  </aside>
`;
}

let added = 0;
for (const [rel, sections] of Object.entries(GUIDES)) {
  const file = path.join(__dirname, rel);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<aside class="lb-box lb-video" data-auto="video">[\s\S]*?<\/aside>\n/g, '');
  for (const [id, videos] of Object.entries(sections)) {
    const start = html.indexOf(`<section class="lb-section" id="${id}">`);
    if (start < 0) throw new Error(`${rel}: no section #${id}`);
    const end = html.indexOf('</section>', start);
    html = html.slice(0, end) + box(videos) + html.slice(end);
    added++;
  }
  fs.writeFileSync(file, html);
}
console.log(`${added} Watch boxes placed in ${Object.keys(GUIDES).length} guides`);
