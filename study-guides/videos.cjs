/* Puts the "Watch" boxes into the study guides.

     node study-guides/videos.cjs

   Each entry names a guide, the section it explains (the section's id), and
   one or more YouTube videos with where to start and stop. The box goes at
   the end of that section, so the student reads the section and then
   watches the part of the video that explains it. Running the script again
   replaces the boxes it added before, so this file is the one place to edit.

   Every video id and chapter time here was read from the video's own page
   (its chapter list). Channels: mainly Ninja Nerd, Dr Matt & Dr Mike, Medicosis
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
  'gct-2/biochemistry/lec01-glycolysis.html': {
    transport: [v('gggC9vctvBQ', NN, 'Metabolism | Glycolysis', '1:29', '6:30', 'the GLUT transporters and how glucose enters cells')],
    investment: [
      v('gggC9vctvBQ', NN, 'Metabolism | Glycolysis', '6:30', '17:24', 'hexokinase, PFK-1, aldolase and triose phosphate isomerase'),
      v('TnQGcKpahfM', MM, 'Glycolysis Made Easy!', '4:54', '13:33', 'preparing glucose and splitting it into two trioses'),
    ],
    generation: [
      v('gggC9vctvBQ', NN, 'Metabolism | Glycolysis', '17:24', '25:25', 'glyceraldehyde 3-phosphate dehydrogenase to PEP'),
      v('TnQGcKpahfM', MM, 'Glycolysis Made Easy!', '13:33', '26:13', 'the energy-generating steps and pyruvate'),
    ],
    pk: [v('gggC9vctvBQ', NN, 'Metabolism | Glycolysis', '25:25', '27:10', 'pyruvate kinase')],
    lactate: [v('gggC9vctvBQ', NN, 'Metabolism | Glycolysis', '27:10', '30:55', 'anaerobic glycolysis and lactate')],
    hormones: [v('xoqyF6DJZ-Y', NN, 'Metabolism | Regulation of Glycolysis', '1:05', '22:15', 'regulation of hexokinase, PFK-1 and pyruvate kinase, and insulin and glucagon')],
  },
  'gct-2/biochemistry/lec02-glycogen-metabolism.html': {
    synthesis: [v('zVGbd-df7Y8', NN, 'Metabolism | Glycogenesis', '19:12', 'end', 'glycogenin, UDP-glucose, glycogen synthase and the branching enzyme')],
    degradation: [v('YQV_ODVCzQQ', NN, 'Metabolism | Glycogenolysis', '0:00', '24:13', 'glycogen phosphorylase, the debranching enzyme and glucose release in the liver')],
    allosteric: [v('NL6ETs9k3Wk', NN, 'Metabolism | Regulation of Glycogen Metabolism', '3:05', '10:26', 'allosteric regulation by AMP, glucose and glucose 6-phosphate')],
    covalent: [v('NL6ETs9k3Wk', NN, 'Metabolism | Regulation of Glycogen Metabolism', '10:26', '24:39', 'hormonal control: glucagon, adrenaline, calcium and insulin')],
    gsd: [
      v('NL6ETs9k3Wk', NN, 'Metabolism | Regulation of Glycogen Metabolism', '24:39', 'end', 'the glycogen storage diseases'),
      v('Ngjza79OxRY', MP, 'Von Gierke Disease - Glycogen Storage Disease Type 1', '0:00', 'end', 'liver vs muscle storage diseases and von Gierke disease'),
    ],
  },
  'gct-2/biochemistry/lec03-gluconeogenesis.html': {
    overview: [v('cProcjVNvtU', MM, 'Gluconeogenesis | Everything you need to know!', '0:00', '8:43', 'when and why the liver makes new glucose')],
    pyruvate: [v('YpV96faQOZc', NN, 'Metabolism | Gluconeogenesis', '3:44', '16:54', 'the pathway: pyruvate carboxylase, PEPCK, fructose 1,6-bisphosphatase and glucose 6-phosphatase')],
    substrates: [
      v('YpV96faQOZc', NN, 'Metabolism | Gluconeogenesis', '16:54', '26:10', 'glycerol and amino acids as substrates'),
      v('ORIx2WYNWqs', NN, 'Metabolism | Regulation of Gluconeogenesis', '0:00', '13:35', 'the Cori cycle and the glucose–alanine cycle'),
    ],
    regulation: [v('ORIx2WYNWqs', NN, 'Metabolism | Regulation of Gluconeogenesis', '13:35', 'end', 'how gluconeogenesis is regulated')],
  },
  'gct-2/biochemistry/lec04-pentose-phosphate-pathway.html': {
    oxidative: [v('eXXpUxg9vn4', NN, 'Metabolism | Pentose Phosphate Pathway', '0:00', 'end', 'the oxidative and non-oxidative phases step by step')],
    nonoxidative: [v('lpHmTl83pQY', NN, 'Metabolism | Regulation of Pentose Phosphate Pathway', '0:00', '20:32', 'how the cell switches between making NADPH, ribose 5-phosphate and ATP')],
    peroxide: [v('lpHmTl83pQY', NN, 'Metabolism | Regulation of Pentose Phosphate Pathway', '20:32', 'end', 'what NADPH is used for, including glutathione and free radical defence')],
    g6pd: [v('iTh-hUU5mxE', MP, 'Glucose-6-Phosphate Dehydrogenase (G6PD) Deficiency', '0:00', 'end', 'genetics, triggers, haemolysis, diagnosis and management of G6PD deficiency')],
  },
  'gct-2/biochemistry/lec05-monosaccharide-metabolism.html': {
    fructose: [v('R3voJC1CBXg', 'Dirty Medicine', 'Fructose Metabolism', '0:53', '5:45', 'fructokinase, aldolase B and how fructose enters glycolysis')],
    'fructose-disorders': [v('R3voJC1CBXg', 'Dirty Medicine', 'Fructose Metabolism', '5:45', 'end', 'essential fructosuria and hereditary fructose intolerance')],
    galactose: [v('lT1--ba0wU8', 'Dirty Medicine', 'Galactose Metabolism', '0:49', '4:43', 'lactose and the galactose pathway')],
    galactosemia: [
      v('lT1--ba0wU8', 'Dirty Medicine', 'Galactose Metabolism', '4:43', '11:08', 'galactokinase deficiency and classic galactosemia'),
      v('As0kUYghMeA', MP, 'Galactosemia, Galactokinase deficiency, Lactose Intolerance', '0:00', 'end', 'the lactose metabolism disorders compared'),
    ],
    lactose: [v('lT1--ba0wU8', 'Dirty Medicine', 'Galactose Metabolism', '11:08', 'end', 'lactose intolerance')],
  },
  'gct-2/biochemistry/lec06-erythrocytes-blood-cells.html': {
    cells: [v('anfpX7NzExg', MM, 'Hematopoiesis | Formation of blood cells', '0:00', 'end', 'stem cells and how each blood cell line forms')],
    anemia: [v('mOrRJBqm744', NN, 'Hematology | Types of Anemias', '0:52', '10:40', 'iron deficiency and B12/folate deficiency anaemias')],
    pk: [v('LLypSc9m5GQ', MP, 'Pyruvate Kinase Deficiency | Hemolytic Anemia', '0:00', 'end', 'why red cells lyse when pyruvate kinase is deficient')],
    g6pd: [v('mOrRJBqm744', NN, 'Hematology | Types of Anemias', '13:34', '19:30', 'G6PD deficiency')],
    methemoglobin: [v('2RFcH_nlR84', MP, 'Methemoglobinemia - Your Hemoglobin is NOT what it should be!', '0:00', 'end', 'methaemoglobin, its causes and treatment')],
    iron: [v('ahCy97FVUpM', 'Armando Hasudungan', 'Iron Physiology', '0:00', 'end', 'iron absorption, transport by transferrin and storage in ferritin')],
    membrane: [
      v('mOrRJBqm744', NN, 'Hematology | Types of Anemias', '10:40', '13:34', 'hereditary spherocytosis'),
      v('aBrt7XhA9L0', MP, 'Hereditary Spherocytosis (HS) - Hemolytic Anemia', '0:00', 'end', 'spectrin and ankyrin defects in hereditary spherocytosis'),
    ],
    hematopoiesis: [v('kcnOXlr-9Ic', NN, 'Hematology | Erythropoiesis: Red Blood Cell Formation: Part 1', '0:00', 'end', 'erythropoiesis, iron and folate, and erythropoietin from the kidney')],
    hemoglobinopathies: [
      v('mOrRJBqm744', NN, 'Hematology | Types of Anemias', '19:30', '25:07', 'sickle cell anaemia'),
      v('mOrRJBqm744', NN, 'Hematology | Types of Anemias', '30:17', '33:21', 'thalassaemia'),
    ],
  },
  'gct-2/histology/lec01-connective-tissue.html': {
    overview: [v('0z9rF2kJaXs', MM, 'Connective Tissue | Everything you need to know!', '0:54', '12:14', 'what connective tissue does and its cells, fibres and ground substance')],
    fibroblasts: [v('xw_ALdt5n-A', 'Byte Size Med', 'Connective Tissue | Connective Tissue Proper', '2:54', '6:30', 'resident and transient connective tissue cells')],
    collagen: [
      v('3e2JYMNS_W4', 'Byte Size Med', 'Connective Tissue Fibres | Collagen | Elastin', '1:22', '8:50', 'collagen types, structure and synthesis'),
      v('03ILx-qr14U', MP, 'Types of collagen (I, II, III, IV, and V)', '0:00', 'end', 'where each collagen type is found'),
    ],
    elastic: [v('3e2JYMNS_W4', 'Byte Size Med', 'Connective Tissue Fibres | Collagen | Elastin', '8:50', 'end', 'elastin and elastic fibres')],
    ground: [v('xw_ALdt5n-A', 'Byte Size Med', 'Connective Tissue | Connective Tissue Proper', '7:54', '11:39', 'ground substance: glycosaminoglycans, proteoglycans and adhesive glycoproteins')],
  },
  'gct-2/histology/lec02-types-of-connective-tissue.html': {
    classification: [
      v('0z9rF2kJaXs', MM, 'Connective Tissue | Everything you need to know!', '12:14', '20:42', 'how connective tissues are classified'),
      v('xw_ALdt5n-A', 'Byte Size Med', 'Connective Tissue | Connective Tissue Proper', '11:39', 'end', 'loose and dense connective tissue'),
    ],
    brown: [v('X9bO9CVx_xs', 'Catalyst University', 'Uncoupling Proteins (Thermogenin) Produce HEAT!', '0:00', 'end', 'thermogenin, heat production in newborns, and brown vs white fat')],
  },
  'gct-2/histology/lec03-cartilage.html': {
    overview: [v('4inWF4H6pKE', 'Byte Size Med', 'Structure and Types of Cartilage', '1:57', '3:49', 'the components of cartilage')],
    hyaline: [v('4inWF4H6pKE', 'Byte Size Med', 'Structure and Types of Cartilage', '3:49', '8:05', 'hyaline cartilage, chondrocytes and perichondrium')],
    elastic: [
      v('4inWF4H6pKE', 'Byte Size Med', 'Structure and Types of Cartilage', '8:05', '8:55', 'elastic cartilage'),
      v('bmnwDeS3bAc', MM, 'Types of Cartilage', '6:00', 'end', 'elastic cartilage'),
    ],
    fibro: [
      v('4inWF4H6pKE', 'Byte Size Med', 'Structure and Types of Cartilage', '8:55', 'end', 'fibrocartilage'),
      v('bmnwDeS3bAc', MM, 'Types of Cartilage', '4:10', '6:00', 'fibrocartilage'),
    ],
  },
  'gct-2/histology/lec04-bone-part-1.html': {
    overview: [v('S5b4NvdT1ds', MM, 'Bony Tissue | Anatomy of a Long Bone', '0:40', 'end', 'bony tissue and the parts of a long bone')],
    osteoblasts: [v('QL7oqsBtocg', 'Byte Size Med', 'Bone Cells | Bone Physiology | Bone Remodelling', '1:50', '4:46', 'osteoprogenitor cells and osteoblasts')],
    osteocytes: [v('QL7oqsBtocg', 'Byte Size Med', 'Bone Cells | Bone Physiology | Bone Remodelling', '4:46', '6:29', 'osteocytes, lacunae and canaliculi')],
    osteoclasts: [v('QL7oqsBtocg', 'Byte Size Med', 'Bone Cells | Bone Physiology | Bone Remodelling', '6:29', '10:45', 'osteoclasts and bone resorption')],
    periosteum: [v('MYInVEnnS_I', 'Byte Size Med', 'Structure of Bone | Lamellar Bone', '6:29', '8:35', 'periosteum and endosteum')],
    types: [v('MYInVEnnS_I', 'Byte Size Med', 'Structure of Bone | Lamellar Bone', '1:13', '6:29', 'compact and cancellous bone, marrow and bone tissue')],
    lamellar: [v('MYInVEnnS_I', 'Byte Size Med', 'Structure of Bone | Lamellar Bone', '8:35', 'end', 'osteons, lamellae and cancellous bone')],
  },
  'gct-2/histology/lec05-bone-part-2-joints.html': {
    remodeling: [v('QL7oqsBtocg', 'Byte Size Med', 'Bone Cells | Bone Physiology | Bone Remodelling', '10:45', '13:09', 'bone modelling and remodelling')],
    intramembranous: [v('86V9SNWD_No', 'Byte Size Med', 'Ossification | Bone Formation | Histogenesis of Bone', '4:21', '5:59', 'intramembranous ossification')],
    endochondral: [v('86V9SNWD_No', 'Byte Size Med', 'Ossification | Bone Formation | Histogenesis of Bone', '5:59', '9:27', 'endochondral ossification')],
    'growth-plate': [v('86V9SNWD_No', 'Byte Size Med', 'Ossification | Bone Formation | Histogenesis of Bone', '9:27', '11:21', 'the epiphyseal growth plate and growth in length')],
    appositional: [v('86V9SNWD_No', 'Byte Size Med', 'Ossification | Bone Formation | Histogenesis of Bone', '11:21', 'end', 'growth in width')],
    repair: [v('Ovbqx5Uwmic', 'Nabil Ebraheim', 'Fracture Healing - Everything You Need To Know', '2:14', 'end', 'the stages of fracture healing and callus formation')],
    metabolic: [v('iAdF1vvgMmM', MM, 'Osteoporosis', '0:00', 'end', 'bone remodelling, peak bone mass and osteoporosis')],
    synarthroses: [v('LqCkvj0fTj0', MM, 'Joint Classification', '0:00', 'end', 'how joints are classified')],
    diarthroses: [v('JO_N1apvidE', MM, 'Synovial Joints', '0:00', 'end', 'the synovial joint capsule, membrane and fluid')],
  },
  'gct-2/histology/lec06-skeletal-muscle.html': {
    types: [v('m20sP2jrj5E', 'Byte Size Med', 'Types of Muscle Tissue | Skeletal Smooth Cardiac Muscle', '0:00', 'end', 'the three muscle types compared')],
    organization: [v('UKgbfxPTn_s', NN, 'Musculoskeletal System | Muscle Structure and Function', '8:10', '25:25', 'epimysium, perimysium, endomysium and the muscle fibre')],
    sarcomere: [
      v('Nrf_g5m8fVM', NN, 'Musculoskeletal System | Sarcomere Structure: Actin &amp; Myosin', '1:57', '10:38', 'sarcomere zones, A bands and I bands'),
      v('ZiJp8by6r08', 'Byte Size Med', 'Structure of Skeletal Muscle | Skeletal Muscle Bands', '2:31', '5:28', 'the bands of a muscle fibre'),
    ],
    filaments: [v('Nrf_g5m8fVM', NN, 'Musculoskeletal System | Sarcomere Structure: Actin &amp; Myosin', '10:38', '27:35', 'thin filaments (actin, tropomyosin, troponin) and thick filaments (myosin)')],
    sr: [v('ZiJp8by6r08', 'Byte Size Med', 'Structure of Skeletal Muscle | Skeletal Muscle Bands', '5:28', 'end', 'the sarcotubular system: T-tubules and sarcoplasmic reticulum')],
    contraction: [
      v('UW47uSLcM2g', NN, 'Musculoskeletal System | Neuromuscular Junction | Sliding Filament Theory', '12:38', 'end', 'calcium and troponin, the cross-bridge cycle and how the bands change'),
      v('MZLADPduKWw', MM, 'Rigor Mortis and Muscle Contraction', '0:00', 'end', 'why muscles lock in rigor mortis'),
    ],
    innervation: [v('UW47uSLcM2g', NN, 'Musculoskeletal System | Neuromuscular Junction | Sliding Filament Theory', '0:00', '12:38', 'the neuromuscular junction and excitation–contraction coupling')],
    proprioceptors: [v('IXV4fRC6nPc', NN, 'Neurology | Spinal Cord: Stretch Reflex | Muscle Spindle', '3:50', '18:18', 'the muscle spindle, intrafusal fibres and their nerves')],
    'fiber-types': [
      v('EH_Eem-VBZg', NN, 'Musculoskeletal System | Type I Muscle Fibers', '0:00', 'end', 'type I fibres compared with type II'),
      v('Nrf_g5m8fVM', NN, 'Musculoskeletal System | Sarcomere Structure: Actin &amp; Myosin', '27:35', 'end', 'dystrophin and muscular dystrophy'),
    ],
  },
  'gct-2/histology/lec07-cardiac-smooth-muscle.html': {
    cardiac: [v('AJcfx_S4Bqw', 'Byte Size Med', 'Structure of Cardiac Muscle', '0:27', '2:18', 'cardiac muscle compared with skeletal muscle')],
    discs: [
      v('AJcfx_S4Bqw', 'Byte Size Med', 'Structure of Cardiac Muscle', '2:18', '3:06', 'intercalated discs'),
      v('uDXq6bcAkCg', 'Osmosis from Elsevier', 'Cardiac muscle: Histology', '0:00', 'end', 'cardiac muscle under the microscope'),
    ],
    ultra: [v('AJcfx_S4Bqw', 'Byte Size Med', 'Structure of Cardiac Muscle', '5:07', 'end', 'T-tubules in cardiac muscle')],
    purkinje: [v('AJcfx_S4Bqw', 'Byte Size Med', 'Structure of Cardiac Muscle', '3:06', '5:07', 'conducting cells and contractile cells')],
    smooth: [v('zp2eIqhvJfc', 'Byte Size Med', 'Structure of Smooth Muscle | Types of Smooth Muscle', '0:00', 'end', 'the appearance, types and structure of smooth muscle')],
    dense: [
      v('qEVRoKuoj4U', 'Byte Size Med', 'Smooth Muscle Contraction | Excitation Contraction Coupling', '2:02', '9:10', 'calcium entry, calmodulin and MLCK'),
      v('ELf8vjpfdxk', MP, 'Smooth Muscles Physiology and Myosin-light Chain Kinase/ Phosphatase', '9:17', '12:05', 'what is unique about smooth muscle and how myosin is regulated'),
    ],
    innervation: [v('K2kHnb1x7cE', MM, 'Smooth Muscle vs. Skeletal Muscle', '10:26', '15:18', 'autonomic innervation of smooth muscle and varicosities')],
  },
  'gct-2/molecular-biology/lec01-central-dogma.html': {
    dogma: [v('nqlNcm_mMcI', MM, 'DNA Transcription and Translation | DNA to Protein', '0:00', 'end', 'DNA to RNA to protein in one overview')],
    bacteria: [v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '0:31', '23:28', 'prokaryotic vs eukaryotic transcription and RNA polymerases')],
    transcription: [v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '23:28', '50:23', 'initiation, elongation and termination')],
    polymerases: [v('WQt2wfehtms', MP, 'Posttranscriptional modification (hnRNA to mRNA)', '1:48', '3:45', 'the three eukaryotic RNA polymerases')],
    processing: [
      v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '50:23', 'end', 'capping, poly(A) tail, splicing and alternative splicing'),
      v('WQt2wfehtms', MP, 'Posttranscriptional modification (hnRNA to mRNA)', '3:45', '10:48', 'cap, tail and splicing, with clinical examples'),
    ],
  },
  'gct-2/molecular-biology/lec02-ribozymes-rnai-small-rnas.html': {
    ribosome: [v('80kxa1zApUM', NN, 'Cell Biology | Translation: Protein Synthesis', '32:53', '38:15', 'ribosome structure and the A, P and E sites')],
    ribozymes: [v('Nt7Gi9jiznE', 'Quick Biochemistry Basics', 'Ribozymes', '0:00', 'end', 'what ribozymes are, including the ribosomal RNA ribozyme')],
    rnai: [
      v('cK-OGB1_ELE', 'Nature Video', 'RNA interference (RNAi)', '0:00', 'end', 'an animated overview of RNAi, Dicer and RISC'),
      v('7XHXF0x2uKA', 'The Bumbling Biochemist', 'RNA interference (RNAi): miRNA, siRNA, Argonaute', '9:06', '12:32', 'how RNAi works step by step'),
    ],
    mirna: [v('7XHXF0x2uKA', 'The Bumbling Biochemist', 'RNA interference (RNAi): miRNA, siRNA, Argonaute', '1:10', '9:06', 'Argonaute and microRNAs')],
  },
  'gct-2/molecular-biology/lec03-crispr-noncoding-rnas-genetic-code.html': {
    mirna: [v('7XHXF0x2uKA', 'The Bumbling Biochemist', 'RNA interference (RNAi): miRNA, siRNA, Argonaute', '2:47', '9:06', 'how microRNAs are made and act')],
    pirna: [v('rCnjjzDcDCU', 'Easy Peasy', 'What Is piRNA? Piwi-Interacting RNA Explained Simply', '0:00', 'end', 'piRNAs, PIWI proteins and transposons')],
    crispr: [v('4FBD3qxS-j4', MM, 'CRISPR-Cas 9 | How does it work?', '0:00', 'end', 'CRISPR in bacteria, the guide RNA and Cas9, and its uses')],
    code: [v('80kxa1zApUM', NN, 'Cell Biology | Translation: Protein Synthesis', '1:41', '23:57', 'the genetic code and its characteristics')],
    charging: [
      v('80kxa1zApUM', NN, 'Cell Biology | Translation: Protein Synthesis', '23:57', '27:35', 'tRNA charging'),
      v('-NhqjgIx1_w', 'Animated Biology With Arpan', 'Aminoacylation of tRNA', '0:00', 'end', 'an animation of aminoacyl-tRNA synthetase'),
    ],
  },
  'gct-2/molecular-biology/lec04-control-of-gene-expression.html': {
    translation: [v('80kxa1zApUM', NN, 'Cell Biology | Translation: Protein Synthesis', '52:18', 'end', 'elongation: A, P and E sites, peptide bonds and translocation')],
    levels: [v('ebIpkw3XapE', 'Amoeba Sisters', 'Gene Expression and Regulation', '0:43', '8:15', 'the levels at which gene expression is controlled')],
    promoters: [v('ZrCx98CtJ_4', NN, 'Cell Biology | DNA Transcription', '23:28', '30:08', 'promoters, the TATA box and transcription factors')],
    lac: [v('yrJn-7k_5Fc', MP, 'Lac Operon &amp; Trp operon', '0:00', 'end', 'the lac and trp operons, repressor, CAP and the four scenarios')],
    eukaryotes: [v('TLvXWAWlMh8', MP, 'Control of Gene Expression | Transcription Factors, Enhancers, Promotor', '4:41', '12:08', 'chromatin, transcription factors and enhancers')],
    combinatorial: [v('TLvXWAWlMh8', MP, 'Control of Gene Expression | Transcription Factors, Enhancers, Promotor', '12:08', '14:17', 'the cortisol example')],
  },
  'gct-2/molecular-biology/lec05-cytoskeleton-cell-motility.html': {
    overview: [v('Msn9eOa2i8I', NN, 'Cytoskeleton Structure &amp; Function', '32:33', '43:08', 'an animated overview of the cytoskeleton')],
    microtubules: [v('Msn9eOa2i8I', NN, 'Cytoskeleton Structure &amp; Function', '23:01', '32:33', 'microtubule structure and function')],
    instability: [v('wkBGPGD4yaY', 'Animated Biology With Arpan', 'Dynamic instability of microtubule', '0:00', 'end', 'the GTP cap, catastrophe and treadmilling')],
    motors: [v('j7nH9-nGF58', 'Dr. G Bhanu Prakash', 'Molecular Motors: Kinesin, Dynein and Myosin', '0:00', 'end', 'kinesin, dynein and myosin in animation')],
    cilia: [
      v('9nZYlyFGm50', 'XVIVO Scientific Animation', 'How Do Cilia and Flagella Move?', '0:00', 'end', 'how dynein bends the 9 + 2 axoneme'),
      v('4SyyAILL_kg', MP, 'Kartagener’s Syndrome - Primary Ciliary Dyskinesia', '0:00', 'end', 'Kartagener’s syndrome and situs inversus'),
    ],
  },
  'gct-2/molecular-biology/lec06-intermediate-actin-filaments.html': {
    if: [
      v('Msn9eOa2i8I', NN, 'Cytoskeleton Structure &amp; Function', '14:18', '23:01', 'intermediate filament structure and function'),
      v('m308ZcpDbpE', 'Cell Bio Clips', 'Intermediate Filaments (Structure and Function)', '0:00', 'end', 'how intermediate filaments assemble and their types'),
    ],
    als: [v('_IvReih3P58', MP, 'Amyotrophic Lateral Sclerosis (ALS)', '0:00', '16:07', 'ALS, motor neurons and upper vs lower motor neuron signs')],
    keratin: [v('KPLSEtJCHo4', 'Osmosis from Elsevier', 'Epidermolysis Bullosa', '0:00', 'end', 'epidermolysis bullosa: symptoms, diagnosis and management')],
    dmd: [v('fZdgF0qrW-4', MP, 'Duchenne Muscular Dystrophy (DMD)', '0:00', 'end', 'Duchenne muscular dystrophy')],
    lamina: [v('6Cj97JJlesk', 'MHSc Medical Genomics', 'Progeria: The Genetics of Accelerated Aging', '0:00', '10:32', 'progeria, lamin A and progerin')],
    actin: [v('Msn9eOa2i8I', NN, 'Cytoskeleton Structure &amp; Function', '0:54', '14:18', 'microfilament (actin) structure and function')],
    myosin: [v('UW47uSLcM2g', NN, 'Musculoskeletal System | Neuromuscular Junction | Sliding Filament Theory', '12:38', '34:51', 'calcium, troponin and the cross-bridge cycle')],
  },
  'gct-2/molecular-biology/lec07-cell-environment-ecm.html': {
    ecm: [v('cMNx17H3dRU', 'Khan Academy', 'Extracellular matrix', '1:36', 'end', 'the extracellular matrix and collagen fibres')],
    collagen: [
      v('3e2JYMNS_W4', 'Byte Size Med', 'Connective Tissue Fibres | Collagen | Elastin', '1:46', '8:50', 'collagen types, structure and synthesis'),
      v('03ILx-qr14U', MP, 'Types of collagen (I, II, III, IV, and V)', '0:00', 'end', 'where each collagen type is found'),
    ],
    diseases: [
      v('aSyj6NfxRA0', MP, 'Osteogenesis Imperfecta (OI) - Brittle Bone Disease', '0:00', 'end', 'osteogenesis imperfecta'),
      v('gcxhJK5T37w', MP, 'Marfan Syndrome vs. Ehlers-Danlos Syndrome', '0:00', 'end', 'Marfan and Ehlers–Danlos syndromes compared'),
      v('iW-4yzHUuWw', MP, 'Alport Syndrome', '6:52', '9:44', 'Alport syndrome and type IV collagen'),
    ],
    proteoglycans: [v('xw_ALdt5n-A', 'Byte Size Med', 'Connective Tissue | Connective Tissue Proper', '7:54', '10:50', 'ground substance, glycosaminoglycans and proteoglycans')],
    fibronectin: [v('xw_ALdt5n-A', 'Byte Size Med', 'Connective Tissue | Connective Tissue Proper', '10:50', '11:39', 'adhesive glycoproteins such as fibronectin and laminin')],
  },
  'gct-2/genetics/lec01-genomics-bioinformatics-proteomics.html': {
    genomics: [
      v('uQq37JL618Q', 'Shomu’s Biology', 'Whole genome shotgun sequencing', '0:00', 'end', 'shotgun sequencing and assembling contigs'),
      v('rH6vsoyrc_U', 'Genomics Education Programme', 'Whole genome sequencing: From sample to report', '0:00', 'end', 'whole genome sequencing from sample to report'),
    ],
    bioinformatics: [v('S3gr8gjKHhc', 'Rob Edwards', 'BLAST 9 E values', '0:00', 'end', 'what the BLAST E-value means')],
    methods: [v('FHvblg338Gg', 'Animated Biology With Arpan', '2D gel electrophoresis', '0:00', 'end', 'isoelectric focusing and SDS-PAGE in a 2-D gel')],
  },
  'gct-2/genetics/lec02-sequencing-predicting-function.html': {
    sanger: [
      v('KTstRrDTmWI', 'Quick Biochemistry Basics', 'Sanger sequencing', '0:00', 'end', 'dideoxynucleotides and chain termination'),
      v('e2G5zx-OJIw', 'Thermo Fisher Scientific', 'How does Sanger Sequencing Work?', '0:00', 'end', 'automated Sanger sequencing with fluorescent ddNTPs'),
    ],
    htp: [
      v('CZeN-IgjYCo', 'Henrik’s Lab', 'Next Generation Sequencing (Illumina) - An Introduction', '0:00', 'end', 'next-generation sequencing in under five minutes'),
      v('fCd6B5HRaZ8', 'Illumina', 'Overview of Illumina Sequencing by Synthesis Workflow', '0:00', 'end', 'library preparation, the flow cell and sequencing by synthesis'),
    ],
    annotation: [v('S3gr8gjKHhc', 'Rob Edwards', 'BLAST 9 E values', '0:00', 'end', 'what the BLAST E-value means and why query length matters')],
  },
  'gct-2/genetics/lec03-human-genome-project.html': {
    origins: [v('AhsIF-cmoQQ', 'TED-Ed', 'The race to sequence the human genome', '0:00', 'end', 'the history of the Human Genome Project')],
    goals: [v('qOW5e4BgEa4', 'National Human Genome Research Institute', 'Lessons from the Human Genome Project', '0:00', 'end', 'technology, data sharing and ethics')],
    snps: [v('tJjXpiWKMyA', '23andMe', 'Genetics 101: What are SNPs?', '0:00', 'end', 'what SNPs are and their impact')],
    variation: [v('xu7EZtyq3A8', 'UCD Medicine', 'Understanding Copy Number Variation', '0:00', 'end', 'copy number variants')],
  },
  'gct-2/genetics/lec04-personal-genome-projects.html': {
    cmt: [v('r_aLp3SLwso', 'CMT Research Foundation', 'What is Charcot-Marie-Tooth Disease?', '0:00', 'end', 'Charcot–Marie–Tooth disease')],
    mosaicism: [v('VeFSIZIg48w', 'MRC Weatherall Institute of Molecular Medicine', 'A Quick Introduction to Somatic Mosaicism', '0:00', 'end', 'somatic mosaicism')],
    exome: [v('ywooWtXD1wM', 'Ambry Genetics', 'What is Exome Sequencing?', '0:00', 'end', 'exome sequencing')],
    encode: [v('PsV_sEDSE2o', 'National Human Genome Research Institute', 'ENCODE: The Encyclopedia of DNA Elements', '0:00', 'end', 'what ENCODE is and what it found')],
  },
  'gct-2/genetics/lec05-chromosome-mutations.html': {
    types: [v('mKnbGnEQO8M', 'Professor Dave Explains', 'Alteration of Chromosome Number and Structure', '0:58', '5:31', 'aneuploidy, nondisjunction and polyploidy')],
    nondisjunction: [v('uS3aJ9bLsKU', 'LabXchange', 'Nondisjunction in Meiosis', '0:00', 'end', 'nondisjunction in meiosis I and II and the gametes it makes')],
    down: [
      v('2Wbg5_h3Yr4', MP, 'Genetic Diseases - Down Syndrome, Edwards, Patau, Cri-du-chat', '0:25', '4:01', 'Down syndrome'),
      v('EKtO9DlEgjA', 'Osmosis from Elsevier', 'Down syndrome (Trisomy 21)', '9:25', '12:06', 'features of Down syndrome and prenatal screening'),
    ],
    origin: [v('EKtO9DlEgjA', 'Osmosis from Elsevier', 'Down syndrome (Trisomy 21)', '1:51', '5:00', 'meiosis, maternal age and nondisjunction')],
    patau: [v('2Wbg5_h3Yr4', MP, 'Genetic Diseases - Down Syndrome, Edwards, Patau, Cri-du-chat', '4:01', '9:34', 'Edwards and Patau syndromes')],
  },
  'gct-2/genetics/lec06-composition-arrangement-chromosomes.html': {
    aberrations: [v('cMQCxYj6U0A', 'All Things GC', 'Structural Chromosome Anomalies', '0:20', '9:51', 'deletions, duplications, rings, inversions and translocations')],
    deletion: [v('cMQCxYj6U0A', 'All Things GC', 'Structural Chromosome Anomalies', '2:01', '3:05', 'deletions')],
    cri: [
      v('nvDtk9SoEkY', 'Osmosis from Elsevier', 'Cri du chat syndrome', '0:00', 'end', 'the genetics, features and diagnosis of cri du chat'),
      v('2Wbg5_h3Yr4', MP, 'Genetic Diseases - Down Syndrome, Edwards, Patau, Cri-du-chat', '10:59', '13:48', 'cri du chat syndrome'),
    ],
    duplication: [v('abK4vYlfdjY', 'Pi Learning Center', 'Homologous Recombination: Unequal Crossover', '0:00', 'end', 'how unequal crossing over makes a duplication and a deletion')],
  },
  'gct-2/genetics/lec07-gene-duplication-evolution.html': {
    duplication: [v('G4VINRUe_o4', 'Stated Clearly', 'How Does New Genetic Information Evolve? Gene Duplications', '0:00', 'end', 'how duplicated genes evolve new functions')],
    cnv: [v('xu7EZtyq3A8', 'UCD Medicine', 'Understanding Copy Number Variation', '0:00', 'end', 'copy number variants')],
    inversions: [v('cMQCxYj6U0A', 'All Things GC', 'Structural Chromosome Anomalies', '4:45', '5:50', 'inversions')],
    heterozygotes: [
      v('THAjvn1cdDM', 'UCD Medicine', 'Paracentric Inversions', '0:00', 'end', 'paracentric inversions and their reproductive risks'),
      v('QXU7XojaEOs', 'UCD Medicine', 'Pericentric Inversions', '0:00', 'end', 'pericentric inversions, pairing and unbalanced gametes'),
    ],
  },
};

// GCT III Biochemistry (added 19 Nov 2026). Ids, titles and chapter times read from each video's page.
const DR = 'Dirty Medicine', JJ = 'JJ Medicine', OS = 'Osmosis from Elsevier', AL = 'Alila Medical Media', CU = 'Catalyst University';
Object.assign(GUIDES, {
  'gct-3/biochemistry/lec01-neurotransmitters.html': {
    catechol: [
      v('yuMP6lQ-Ueo', JJ, 'Catecholamine Biosynthesis Pathway', '0:00', 'end', 'tyrosine to dopamine, norepinephrine and epinephrine, with every enzyme and cofactor'),
      v('afzWLmd72Rk', NN, 'Endocrinology | Adrenal Medulla | Catecholamines', '7:25', '13:42', 'catecholamine synthesis in the adrenal medulla'),
    ],
    pheo: [
      v('rFoc4ACFehQ', NN, 'Parkinson’s Disease | Causes &amp; Pathophysiology | Part 2', '0:00', 'end', 'loss of dopaminergic neurons, α-synuclein and Lewy bodies'),
      v('RYLI-4zEi-I', MM, 'Parkinson’s disease | Dopamine and the basal ganglia', '0:00', 'end', 'why losing nigral dopamine upsets movement'),
    ],
    serotonin: [v('Ve_dS8Ft6U8', MP, 'Carcinoid Syndrome | Serotonin-Secreting Tumors', '0:00', 'end', 'why carcinoid causes flushing, diarrhoea, right-heart valve disease and high 5-HIAA')],
    alzheimer: [v('v5gdH_Hydes', OS, 'Alzheimer’s disease - plaques, tangles, causes, symptoms &amp; pathology', '0:00', 'end', 'amyloid plaques, tau tangles and loss of cholinergic neurons')],
    glugaba: [v('a8X15B1skF0', CU, 'GABA Biosynthesis and Catabolism', '0:00', 'end', 'glutamate decarboxylase, GABA transaminase and their B6 cofactor')],
  },
  'gct-3/biochemistry/lec02-kidney-minerals.html': {
    proximal: [v('rcvRiglLLL0', MM, 'Acid Base Balance | Renal Regulation', '8:39', '14:13', 'how the proximal tubule reclaims filtered bicarbonate')],
    collecting: [v('rcvRiglLLL0', MM, 'Acid Base Balance | Renal Regulation', '14:13', 'end', 'H⁺ excretion, urinary buffers and new bicarbonate')],
    capmg: [
      v('uxCw4qovZXE', MM, 'Calcium &amp; Phosphate Homeostasis', '0:00', 'end', 'how PTH, calcitriol and calcitonin control calcium and phosphate'),
      v('IVPaUMOxYB4', AL, 'Magnesium Metabolism and Hypomagnesemia, Animation', '0:00', 'end', 'magnesium handling and what happens when it is low'),
    ],
    copper: [
      v('yjsMSWh2U6s', MP, 'Menkes Disease - Menkes Kinky Hair Syndrome - Copper', '0:00', 'end', 'ATP7A and the copper enzymes that fail'),
      v('OYaDTnxTKag', MP, 'Wilson disease (Hepatolenticular Degeneration) - Copper', '0:00', 'end', 'ATP7B, low ceruloplasmin and copper deposits'),
    ],
    iron: [v('_CWMUt8Xi_Y', MP, 'Iron Studies - Iron Absorption - Ferrous (Fe2+), Ferric (Fe3+), TIBC, Ferritin, Transferrin - Part 1', '0:00', 'end', 'iron absorption, transport and how to read iron studies')],
  },
  'gct-3/biochemistry/lec03-lipid-digestion.html': {
    stomach: [v('ja-MWkFNvDg', NN, 'Gastrointestinal | Digestion &amp; Absorption of Lipids', '5:52', '14:06', 'oral and gastric lipases')],
    bileacids: [v('WdORLvO3HeI', JJ, 'Bile Acid Synthesis | Classic and Alternative Pathways | Primary and Secondary Bile Acids', '0:00', 'end', 'the classical and alternative pathways and secondary bile acids')],
    bile: [v('ja-MWkFNvDg', NN, 'Gastrointestinal | Digestion &amp; Absorption of Lipids', '14:06', '23:18', 'how bile emulsifies fat')],
    pancreas: [v('ja-MWkFNvDg', NN, 'Gastrointestinal | Digestion &amp; Absorption of Lipids', '23:18', '34:43', 'pancreatic lipase, colipase, phospholipase A₂ and cholesterol esterase')],
    absorption: [v('ja-MWkFNvDg', NN, 'Gastrointestinal | Digestion &amp; Absorption of Lipids', '34:43', 'end', 'micelles, absorption, re-esterification and chylomicrons')],
    chylo: [v('wQY0xpwqPfQ', NN, 'Metabolism | Lipoprotein Metabolism | Chylomicrons, VLDL, IDL, LDL, &amp; HDL', '12:52', '27:57', 'chylomicron assembly, lymphatic transport, LPL and remnant uptake')],
    cf: [v('x0YXkBE5fVo', MP, 'Cystic Fibrosis - Definition, Pathogenesis, Symptoms and Complications', '0:00', 'end', 'CFTR, salty sweat, pancreatic insufficiency and infertility')],
  },
  'gct-3/biochemistry/lec04-fatty-acid-synthesis.html': {
    citrate: [v('nBFSz63T1c0', NN, 'Metabolism | Fatty Acid Synthesis: Part 1', '0:00', 'end', 'glucose to cytosolic acetyl-CoA, the citrate shuttle and NADPH')],
    fas: [v('iKcvb1IihcM', NN, 'Metabolism | Fatty Acid Synthesis: Part 2 (Updated)', '12:19', 'end', 'acetyl-CoA carboxylase and each step of fatty acid synthase up to palmitate')],
    nadph: [v('iKcvb1IihcM', NN, 'Metabolism | Fatty Acid Synthesis: Part 2 (Updated)', '4:45', '12:19', 'the pentose phosphate pathway as the NADPH source')],
    tag: [v('v-5RcGtSa8Y', NN, 'Metabolism | Triglyceride Synthesis', '0:00', 'end', 'glycerol 3-phosphate, phosphatidic acid and TAG assembly in liver and adipose tissue')],
  },
  'gct-3/biochemistry/lec05-fatty-acid-oxidation.html': {
    transport: [v('OyQ1cgBw8HA', NN, 'Metabolism | Fatty Acid Oxidation: Part 1', '0:00', '18:47', 'fat mobilisation, activation and the carnitine shuttle')],
    betaox: [
      v('OyQ1cgBw8HA', NN, 'Metabolism | Fatty Acid Oxidation: Part 1', '18:47', 'end', 'the four steps of β-oxidation'),
      v('jxylGoJP9jY', NN, 'Metabolism | Fatty Acid Oxidation: Part 2', '8:41', '14:59', 'the ATP yield of palmitate'),
    ],
    oddchain: [v('jxylGoJP9jY', NN, 'Metabolism | Fatty Acid Oxidation: Part 2', '14:59', '25:28', 'propionyl-CoA to succinyl-CoA')],
    peroxisome: [v('jxylGoJP9jY', NN, 'Metabolism | Fatty Acid Oxidation: Part 2', '25:28', 'end', 'peroxisomal oxidation and fatty acid oxidation disorders')],
    ketones: [
      v('BlR9DkUAUkI', NN, 'Metabolism | Ketone Metabolism', '0:00', 'end', 'ketone synthesis in the liver, use in tissues and ketoacidosis'),
      v('u2yCChjGEIY', MM, 'Ketogenesis &amp; Diabetic Ketoacidosis (DKA)', '0:00', 'end', 'why type 1 diabetes leads to ketoacidosis'),
    ],
  },
  'gct-3/biochemistry/lec06-cholesterol-lipoproteins.html': {
    synthesis: [v('nurZ2nNovp8', NN, 'Metabolism | Cholesterol Metabolism', '1:04', '16:06', 'cholesterol synthesis from acetyl-CoA, the rate-limiting step and structure')],
    regulation: [v('nurZ2nNovp8', NN, 'Metabolism | Cholesterol Metabolism', '25:52', 'end', 'regulation of cholesterol synthesis')],
    vldl: [v('wQY0xpwqPfQ', NN, 'Metabolism | Lipoprotein Metabolism | Chylomicrons, VLDL, IDL, LDL, &amp; HDL', '27:57', '44:20', 'VLDL synthesis, IDL and the formation of LDL')],
    ldlr: [v('wQY0xpwqPfQ', NN, 'Metabolism | Lipoprotein Metabolism | Chylomicrons, VLDL, IDL, LDL, &amp; HDL', '44:20', '50:36', 'LDL uptake, oxidised LDL and foam cells')],
    hdl: [v('wQY0xpwqPfQ', NN, 'Metabolism | Lipoprotein Metabolism | Chylomicrons, VLDL, IDL, LDL, &amp; HDL', '50:36', 'end', 'HDL, reverse cholesterol transport and lipoprotein profiles')],
    disorders: [v('gE9cIQ9vz0k', NN, 'Hyperlipidemia | Clinical Medicine', '0:41', '21:05', 'the inherited hyperlipidaemias and their complications')],
  },
  'gct-3/biochemistry/lec07-water-soluble-vitamins.html': {
    b1: [
      v('DuBDw2d9lDI', MP, 'Beriberi - Vitamin B1 Deficiency - Thiamine Deficiency', '0:00', 'end', 'wet and dry beriberi'),
      v('7zjABcYH3xI', MP, 'Wernicke-Korsakoff Syndrome (WKS) - Biochemistry', '0:00', 'end', 'Wernicke encephalopathy and Korsakoff syndrome'),
    ],
    b2: [v('sf9ztQd39wo', MP, 'Water-Soluble Vitamins - Vitamin B1, B2, B3, B5, B7, B9, B12, Vitamin C', '14:24', '16:35', 'riboflavin')],
    b3: [v('sf9ztQd39wo', MP, 'Water-Soluble Vitamins - Vitamin B1, B2, B3, B5, B7, B9, B12, Vitamin C', '16:35', '22:22', 'niacin and pellagra')],
    b6: [v('yadAyuOvlkc', MM, 'B Vitamins | B1, B2, B3, B5, B6, B7, B9, B12', '16:41', '19:17', 'B6 and amino acid metabolism')],
    b7: [v('sf9ztQd39wo', MP, 'Water-Soluble Vitamins - Vitamin B1, B2, B3, B5, B7, B9, B12, Vitamin C', '27:03', '28:43', 'biotin')],
    b9: [v('XcKsctwgDcg', MP, 'Folate Deficiency vs. Vitamin B12 Deficiency', '0:00', 'end', 'how to tell folate from B12 deficiency')],
    b12: [v('sf9ztQd39wo', MP, 'Water-Soluble Vitamins - Vitamin B1, B2, B3, B5, B7, B9, B12, Vitamin C', '35:38', '45:02', 'B12 absorption, causes of deficiency, homocysteine and folate vs B12')],
    vitc: [v('sf9ztQd39wo', MP, 'Water-Soluble Vitamins - Vitamin B1, B2, B3, B5, B7, B9, B12, Vitamin C', '28:52', '32:54', 'vitamin C and scurvy')],
  },
});

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
