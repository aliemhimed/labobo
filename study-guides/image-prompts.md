# Study guide pictures: Nano Banana prompts

95 diagrams for the 53 GCT study guides, grouped **pre-midterm** (lectures and weeks 1–7) and **post-midterm** (8 onward), and within each by subject: Biochemistry, Medical Genetics, Molecular Biology, Histology.

★ **make first** marks the 36 pictures that no slide picture covers (or whose slide version is too small to read on a phone). The rest are optional: a slide picture already in the guide shows the same thing, so make them only if you want every picture in one Labobo style.

Pre-midterm: 50 prompts, 15 of them ★. Post-midterm: 45 prompts, 21 of them ★.

## Nano Banana settings

Set these once, at the start of each chat:

| Setting | Choose | Why |
|---|---|---|
| Model | Nano Banana 2.1 | As in your screenshot |
| System instructions | Paste the style text below | Every picture in the chat then follows the same style, without repeating it in each prompt |
| Output format | **Images only** | We only need the picture; text replies just waste output |
| Resolution | **2K** | Labels stay sharp; I shrink it for the site anyway. 4K adds nothing and takes longer |
| Grounding with Google Search | **Off** | The prompt already has every fact; searching can pull in wrong details |
| Image search | **Off** | It can copy textbook figures, which is what we want to avoid |
| Output length, stop sequence | Leave as they are | Not used for pictures |

Change these for each prompt (written on every prompt below):

- **Aspect ratio:** pick the one given (16:9, 4:3 or 1:1). Don't leave it on Auto: Auto can crop labels or squeeze a flowchart.
- **Thinking level:** **Medium** for every prompt. High can think for 20+ minutes and still produce nothing. If a picture comes out with a wrong or misplaced label, fix it with a follow-up message (see the tips) instead of raising the thinking level.
- If a picture takes more than about 3 minutes, stop it and send the prompt again in a new chat.

Tips:
- Start a new chat for each subject (or after about 10 pictures). In long chats the style starts to drift.
- If one label comes out misspelled, reply in the same chat: *"Keep everything the same, only change the label 'X' to 'Y'."*
- Save each picture with its **Save as** name into `study-guides/img/incoming/`.

### Style text (paste into System instructions)

> For every image in this chat, use this style: a clean, flat, educational diagram for first-year medical students. Plain white background. Thick dark navy outlines (#0B1233), rounded shapes, and a limited palette of soft, bright fills: blue #8FB2FF, mint #7DE3C3, yellow #FFE45C, coral #FF8A8A, violet #C9B6FF and orange #FFB86B. Labels in a clean bold sans-serif font, dark navy, horizontal, large enough to read on a phone, with thin leader lines to the part they name. Spell every label exactly as I write it, and add no other words, titles, numbers or watermarks. No 3D effects, no shadows, no gradients, no photorealism, no people's faces. Keep generous white space around the edges.

---

## Pre-midterm (lectures and weeks 1–7)

50 prompts, 15 marked ★ make first.

### Biochemistry

#### B01 · Body water compartments
- **Goes in:** Week 1 · Water, pH, buffers → *Body water compartments*
- **Save as:** `bio-wk01-water-compartments.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A diagram of total body water as one wide rounded rectangle split into two boxes side by side. The left box takes two thirds of the width, filled blue, labelled "Intracellular fluid (ICF) ⅔". The right box takes one third, filled mint, labelled "Extracellular fluid (ECF) ⅓", and is split vertically into a larger part labelled "Interstitial fluid" and a smaller part labelled "Plasma". A thin wavy line between ICF and ECF is labelled "Cell membranes". A thin dashed line between interstitial fluid and plasma is labelled "Capillary walls". Above the whole rectangle the label "Total body water ≈ ⅔ of body weight".

#### B02 · The renin–angiotensin–aldosterone system  ★ make first
- **Goes in:** Week 1 → *Regulating water and salt: RAAS*
- **Save as:** `bio-wk01-raas.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A left-to-right flowchart with small simple organ icons. Start: a kidney icon with the label "Low blood pressure or low Na⁺" and an arrow labelled "Renin". A liver icon releases "Angiotensinogen", arrow to "Angiotensin I", arrow labelled "ACE (lungs)" to "Angiotensin II". From Angiotensin II, three arrows branch out to boxes: "Vasoconstriction", "Adrenal cortex → Aldosterone → Na⁺ and water kept", and "ADH and thirst". A final arrow from all three to "Blood pressure rises".

#### B03 · The bicarbonate buffer, lungs and kidneys
- **Goes in:** Week 1 → *Lungs and kidneys*
- **Save as:** `bio-wk01-bicarbonate.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** The equation written large across the centre: "CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻". Under "CO₂" a simple pair of lungs with an arrow out labelled "Lungs breathe out CO₂ (fast, minutes)". Under "H⁺ + HCO₃⁻" a simple kidney with two arrows: "Excrete H⁺" and "Reabsorb HCO₃⁻", and the label "Kidneys (slow, hours to days)". Above the first double arrow, the small label "Carbonic anhydrase".

#### B04 · Saturated and unsaturated fatty acids
- **Goes in:** Week 2 · Major compounds → *Fatty acids*
- **Save as:** `bio-wk02-fatty-acids.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three fatty acid chains drawn as zig-zag carbon skeleton lines, each with a small round head on the left labelled "COOH". Top: a straight zig-zag labelled "Saturated (no double bonds)". Middle: a zig-zag with one double bond causing a clear 30-degree bend, the double bond highlighted yellow and labelled "cis double bond = kink". Bottom: a zig-zag with one double bond that stays straight, labelled "trans double bond = straight". To the right, small groups of the chains: straight chains packed tightly labelled "Solid (fats)"; kinked chains loosely packed labelled "Liquid (oils)".

#### B05 · Steroid nucleus
- **Goes in:** Week 2 → *Steroids*
- **Save as:** `bio-wk02-steroid-rings.png`
- **Settings:** Aspect ratio **4:3** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** The steroid nucleus drawn as four fused rings in the standard steroid layout: three six-membered rings in a row with a five-membered ring on the right end. Fill the rings blue, mint, violet and yellow, with the letters "A", "B", "C", "D" in the centres. Under it, the label "Steroid nucleus: three 6-carbon rings + one 5-carbon ring". Small labels with leader lines pointing to examples around it: "Cholesterol", "Bile acids", "Steroid hormones", "Vitamin D".

#### B06 · General structure of an amino acid
- **Goes in:** Week 3 · Amino acids → *General structure and stereochemistry*
- **Save as:** `bio-wk03-amino-acid.png`
- **Settings:** Aspect ratio **4:3** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A central carbon atom drawn as a yellow circle labelled "α-carbon". Four bonds to four groups: up, a blue circle "NH₃⁺ (amino group)"; right, a coral circle "COO⁻ (carboxyl group)"; down, a small grey circle "H"; left, a violet blob "R (side chain)". Under the drawing: "At pH 7.4 the amino acid is a zwitterion". Next to it, a small mirror-image pair of the same molecule labelled "L" and "D" with a dashed mirror line, and the note "Proteins use L-amino acids".

#### B07 · Cholera toxin
- **Goes in:** Week 3 → *ADP-ribosylation: cholera toxin*
- **Save as:** `bio-wk03-cholera-toxin.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** An intestinal lining cell drawn as a tall rectangle, gut lumen on top. Inside the cell, a stepwise chain of icons with arrows: "Cholera toxin" (coral) enters → "ADP-ribosylates Gsα" → "Gsα stuck ON (GTP)" → "Adenylate cyclase always active" → "cAMP ↑" → "CFTR channel opens". At the top surface, arrows leaving the cell into the lumen labelled "Cl⁻ out", then "Na⁺ and water follow", and a large droplet icon labelled "Watery diarrhoea".

#### B08 · The four levels of protein structure
- **Goes in:** Week 4 · Protein structure → *The four levels*
- **Save as:** `bio-wk04-protein-levels.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Four panels left to right, each with a title. "Primary": a chain of coloured beads (amino acids) with the caption "amino acid sequence". "Secondary": a ribbon α-helix and a set of three flat arrows forming a β-pleated sheet, with dashed lines labelled "H-bonds". "Tertiary": one ribbon chain folded into a compact 3D shape containing helices and sheets. "Quaternary": four folded chains (two blue, two mint) fitting together, labelled "several subunits, e.g. hemoglobin". Thin arrows between the panels.

#### B09 · Ubiquitin–proteasome pathway
- **Goes in:** Week 4 → *Ubiquitin and the proteasome*
- **Save as:** `bio-wk04-proteasome.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Left: a crumpled ribbon protein labelled "Damaged or unneeded protein". Arrow labelled "E1, E2, E3 enzymes". Middle: the same protein with a chain of four small yellow circles attached, labelled "Polyubiquitin chain". Arrow to the right into a barrel-shaped cylinder made of stacked rings with a cap at each end, labelled "26S proteasome" and "uses ATP". Out of the other end come small fragments labelled "Short peptides", and the yellow circles return by a curved arrow labelled "Ubiquitin recycled".

#### B10 · Anatomy of a phospholipid
- **Goes in:** Week 5 · Phospholipids → *Membrane lipids*
- **Save as:** `bio-wk05-phospholipid.png`
- **Settings:** Aspect ratio **4:3** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A phospholipid drawn as a simple model. At the top, a round coral head labelled "Head group (e.g. choline)", connected to a yellow circle "Phosphate", connected to a blue bar "Glycerol". From the glycerol, two zig-zag tails hang down, one straight and one with a kink, labelled "Fatty acid tails". Brackets on the side: "Hydrophilic head" for the top part and "Hydrophobic tails" for the bottom part. To the right, a small drawing of many of these molecules forming a bilayer, labelled "Lipid bilayer".

#### B11 · Eicosanoid pathway and the drugs that block it
- **Goes in:** Week 5 → *Eicosanoids* (also used for *Aspirin and acetaminophen*)
- **Save as:** `bio-wk05-eicosanoids.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A top-down flowchart. Top box: "Membrane phospholipids". Arrow labelled "Phospholipase A₂" to "Arachidonic acid". From arachidonic acid two branches. Left branch arrow labelled "COX-1 / COX-2" to "Prostaglandins and thromboxanes". Right branch arrow labelled "5-Lipoxygenase" to "Leukotrienes". Red "blocked" symbols on the arrows: on the phospholipase A₂ arrow, "Corticosteroids"; on the COX arrow, "Aspirin, NSAIDs"; on the lipoxygenase arrow, "Zileuton".

#### B12 · From collagen chain to collagen fibre  ★ make first
- **Goes in:** Week 6 · ECM and fibrous proteins → *Collagen structure and types*
- **Save as:** `bio-wk06-collagen-levels.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Five stages left to right, each larger in scale. 1) A single chain drawn as a thin helix with a repeating sequence label "Gly–X–Y". 2) Three helices twisted around each other, labelled "Triple helix". 3) A single rod labelled "Tropocollagen". 4) Many rods arranged in staggered rows with short gaps, joined by small yellow links labelled "Cross-links", the whole labelled "Fibril (banded)". 5) A bundle of fibrils labelled "Collagen fibre".

#### B13 · Collagen synthesis inside and outside the cell
- **Goes in:** Week 6 → *Collagen synthesis*
- **Save as:** `bio-wk06-collagen-synthesis.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A fibroblast drawn as a large rounded cell on the left, the extracellular space on the right. Numbered steps along a path. Inside the cell: "1 Pro-α chains made on RER", "2 Hydroxylation of proline and lysine (needs vitamin C)", "3 Glycosylation", "4 Triple helix forms: procollagen". At the cell edge: "5 Secretion". Outside the cell: "6 Peptidases cut the ends: tropocollagen", "7 Cross-linking by lysyl oxidase (needs copper)", "8 Fibrils". Small coral warning tags on step 2 "Scurvy" and on step 7 "Ehlers–Danlos / Menkes".

#### B14 · Proteoglycan aggregate  ★ make first
- **Goes in:** Week 6 → *Proteoglycans and glycosaminoglycans*
- **Save as:** `bio-wk06-proteoglycan.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A "bottle-brush" model. A long horizontal blue strand labelled "Hyaluronic acid". Attached along it at regular intervals, vertical violet stems labelled "Core protein", each connected by a small yellow block labelled "Link protein". From each core protein, many short mint bristles stick out on both sides, labelled "Glycosaminoglycan (GAG) chains". A small inset shows water droplets around the bristles labelled "GAGs attract water: cushioning".

#### B15 · Oxygen-binding curves of myoglobin and hemoglobin
- **Goes in:** Week 7 · Globular proteins → *Oxygen-binding curves*
- **Save as:** `bio-wk07-o2-curves.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A line graph. X-axis: "pO₂ (mm Hg)" from 0 to 100. Y-axis: "O₂ saturation (%)" from 0 to 100. A steep hyperbolic blue curve reaching near 100% early, labelled "Myoglobin (P50 ≈ 1 mm Hg)". A sigmoidal (S-shaped) coral curve labelled "Hemoglobin (P50 ≈ 26 mm Hg)". A dashed horizontal line at 50% labelled "50%". Small markers on the x-axis at about 40 labelled "Tissues" and at about 100 labelled "Lungs".

#### B16 · Right shift of the hemoglobin curve  ★ make first
- **Goes in:** Week 7 → *Allosteric effectors and the Bohr effect*
- **Save as:** `bio-wk07-right-shift.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A line graph with axes "pO₂ (mm Hg)" and "O₂ saturation (%)". A solid S-shaped curve labelled "Normal". A second S-shaped curve shifted to the right, dashed, labelled "Right shift: Hb gives up O₂ more easily". A big arrow pointing right between them. A box to the side titled "Shift right when:" listing "↑ CO₂", "↑ H⁺ (↓ pH)", "↑ Temperature", "↑ 2,3-BPG".

#### B17 · Sickle hemoglobin polymerisation
- **Goes in:** Week 7 → *Sickle cell disease, HbC and HbSC*
- **Save as:** `bio-wk07-sickle.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three steps left to right. 1) A round biconcave red blood cell with small separate dots inside, labelled "Oxygenated: HbS dissolved". 2) Inside the same cell, the dots join into long rigid fibres, labelled "Deoxygenated: HbS polymerises". 3) The cell bent into a crescent (sickle) shape, labelled "Sickled cell: rigid, blocks small vessels". Under step 1 a small tag "β6 Glu → Val".

### Medical Genetics

#### G01 · Gene, locus and alleles
- **Goes in:** Week 1 · Introduction and Mendel → *Core terminology*
- **Save as:** `gen-wk01-locus-alleles.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A pair of tall rounded homologous chromosomes side by side, one blue labelled "From mother", one mint labelled "From father". A matching band on each at the same height, highlighted yellow, with a bracket labelled "Locus (same place)". On the left band the letter "A", on the right band the letter "a", with a label "Alleles (versions of one gene)". Below three small pairs: "AA = homozygous dominant", "Aa = heterozygous", "aa = homozygous recessive".

#### G02 · Monohybrid cross
- **Goes in:** Week 1 → *Mendel's first three postulates*
- **Save as:** `gen-wk01-monohybrid.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Top: two round pea plants icons labelled "Aa" × "Aa". Arrows to a 2×2 Punnett square with gametes "A" and "a" along the top and left. Cells: "AA", "Aa", "Aa", "aa", with AA and Aa filled yellow (dominant look) and aa filled green. Right of the square: "Genotypes 1 AA : 2 Aa : 1 aa" and "Phenotypes 3 dominant : 1 recessive".

#### G03 · Incomplete dominance
- **Goes in:** Week 2 · Dominance and ABO → *Incomplete (partial) dominance*
- **Save as:** `gen-wk02-incomplete-dominance.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Snapdragon flowers. Top: a red flower "CᴿCᴿ" × a white flower "CᵂCᵂ". Arrow to the F1: one pink flower "CᴿCᵂ". Arrow to F2: one red, two pink, one white flowers in a row, labelled "1 : 2 : 1". Caption: "Heterozygote is in between".

#### G04 · Making the A, B and H antigens  ★ make first
- **Goes in:** Week 2 → *How A and B antigens are made* (also used for *The Bombay phenotype*)
- **Save as:** `gen-wk02-abo-antigens.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A red blood cell surface (a horizontal curved membrane) with sugar chains drawn as strings of coloured shapes sticking up. Left: "Precursor" chain. Arrow labelled "H gene (FUT1) adds fucose" to the "H antigen" chain ending in a small triangle (fucose). From H antigen two arrows: "A enzyme adds N-acetylgalactosamine" → "A antigen" (ends with a blue square); "B enzyme adds galactose" → "B antigen" (ends with a yellow circle). A third, faint arrow labelled "O allele: no working enzyme" → "H antigen stays (group O)". A coral box at the bottom: "Bombay (hh): no H antigen, so no A or B even with A or B genes".

#### G05 · ABO blood groups table
- **Goes in:** Week 2 → *The ABO system*
- **Save as:** `gen-wk02-abo-table.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A 4-column chart with a column for each blood group "A", "B", "AB", "O". Row 1 "Red cell": a red cell icon with blue squares (A), yellow circles (B), both (AB), or none (O). Row 2 "Antibodies in plasma": Y-shaped antibody icons "anti-B" (A), "anti-A" (B), "none" (AB), "anti-A and anti-B" (O). Row 3 "Genotypes": "IᴬIᴬ or Iᴬi", "IᴮIᴮ or Iᴮi", "IᴬIᴮ", "ii".

#### G06 · Dihybrid cross 9:3:3:1  ★ make first
- **Goes in:** Week 3 · Gene interaction and X-linkage → *Independent assortment*
- **Save as:** `gen-wk03-dihybrid.png`
- **Settings:** Aspect ratio **1:1** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A 4×4 Punnett square for "AaBb × AaBb", gametes "AB", "Ab", "aB", "ab" along the top and the side. Each of the 16 cells shows its genotype and is coloured by phenotype: yellow for A_B_ (9 cells), blue for A_bb (3), mint for aaB_ (3), coral for aabb (1). A legend: "9 A_B_ : 3 A_bb : 3 aaB_ : 1 aabb".

#### G07 · X-linked recessive inheritance
- **Goes in:** Week 3 → *X-linked inheritance*
- **Save as:** `gen-wk03-x-linked.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A small pedigree using standard symbols (squares = male, circles = female). Parents: an unaffected father square labelled "XY" and a carrier mother circle half-filled labelled "XᴴXʰ". Four children: an unaffected daughter "XᴴXᴴ", a carrier daughter (half-filled circle) "XᴴXʰ", an unaffected son "XᴴY", an affected son (filled square) "XʰY". Caption: "Carrier mother: half her sons affected, half her daughters carriers". A legend for filled, half-filled and empty symbols.

#### G08 · Genomic imprinting: Prader–Willi and Angelman
- **Goes in:** Week 3 → *Prader–Willi and Angelman syndromes*
- **Save as:** `gen-wk03-imprinting.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two panels. Each shows a pair of chromosome 15s, one blue labelled "Paternal", one coral labelled "Maternal", with a highlighted band labelled "15q11–q13". Left panel titled "Prader–Willi": the paternal band is missing (deletion), caption "Loss of paternal genes". Right panel titled "Angelman": the maternal band is missing, caption "Loss of maternal gene (UBE3A)". Under both: "Same region, different parent → different disease".

#### G09 · Crossing over and recombinant gametes
- **Goes in:** Week 4 · Chromosome mapping → *Crossing over and map units*
- **Save as:** `gen-wk04-crossing-over.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Left: a pair of homologous chromosomes, each as two sister chromatids, one blue carrying "A" and "B", one mint carrying "a" and "b". An X-shaped crossover between one blue and one mint chromatid between the two genes. Right: four resulting chromatids: "A B" (blue) and "a b" (mint) labelled "Parental"; "A b" and "a B" (half blue half mint) labelled "Recombinant". Caption: "The farther apart two genes are, the more often they recombine. 1% recombination = 1 map unit (cM)".

#### G10 · Sexual differentiation  ★ make first
- **Goes in:** Week 5 · Sex determination → *SRY and testis formation* (also used for *Male* and *Female differentiation*)
- **Save as:** `gen-wk05-sex-differentiation.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A branching flowchart. Top: "Bipotential gonad + Wolffian and Müllerian ducts". Left branch: "SRY present (Y)" → "Testis" → two boxes: "Sertoli cells → AMH → Müllerian ducts regress" and "Leydig cells → Testosterone → Wolffian ducts develop; DHT → male external genitalia". Right branch: "No SRY" → "Ovary" → "Müllerian ducts develop (uterus, tubes); Wolffian ducts regress; female external genitalia".

#### G11 · X inactivation and mosaicism
- **Goes in:** Week 6 · X-inactivation → *The Lyon hypothesis and mosaicism*
- **Save as:** `gen-wk06-x-mosaic.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Left: one early embryo cell with two X chromosomes, one blue "Xᵐ" and one coral "Xᵖ". Arrows to many cells; in each one X is condensed into a small dark dot at the edge of the nucleus labelled "Barr body", randomly blue in some cells and coral in others. Right: a patch of tissue made of blue and coral cell patches, labelled "Mosaic: patches of cells using different X". Caption: "Number of Barr bodies = number of X chromosomes − 1".

#### G12 · Nondisjunction
- **Goes in:** Week 7 · Sex chromosome aneuploidies → *Nondisjunction*
- **Save as:** `gen-wk07-nondisjunction.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two columns. Left "Nondisjunction in meiosis I": a cell with one homologous pair, both chromosomes go to the same side; after meiosis II four gametes: two with an extra chromosome labelled "n + 1" and two missing it labelled "n − 1". Right "Nondisjunction in meiosis II": first division normal; in one of the two cells the sister chromatids fail to separate; four gametes: "n + 1", "n − 1", "n", "n". Under all: "Fertilised by a normal gamete → trisomy (2n + 1) or monosomy (2n − 1)".

### Molecular Biology

#### M01 · Prokaryotic vs eukaryotic cell
- **Goes in:** Lecture 1 · Cells → *Two basic types of cells*
- **Save as:** `mb-lec01-pro-vs-eu.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two cells side by side, drawn roughly to scale (the eukaryote about ten times larger). Left, a rod-shaped bacterium labelled "Prokaryote (1–10 μm)" with labels: "Cell wall", "Plasma membrane", "Nucleoid (no nucleus)", "Ribosomes (70S)", "Plasmid", "Flagellum". Right, an animal cell labelled "Eukaryote (10–100 μm)" with labels: "Nucleus", "Nuclear envelope", "Mitochondrion", "Rough ER", "Golgi", "Lysosome", "Ribosomes (80S)", "Plasma membrane".

#### M02 · Size scale from atoms to cells
- **Goes in:** Lecture 1 → *Units and sizes*
- **Save as:** `mb-lec01-size-scale.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A horizontal logarithmic ruler from "0.1 nm" to "1 mm" with ticks at 0.1 nm, 1 nm, 10 nm, 100 nm, 1 μm, 10 μm, 100 μm, 1 mm. Small icons above the ruler at their sizes: "Atom", "Glucose", "Protein", "Ribosome", "Virus", "Bacterium", "Red blood cell", "Human egg". Below the ruler, coloured bars showing range: "Eye" (from about 0.1 mm), "Light microscope" (from 0.2 μm), "Electron microscope" (from about 0.1 nm).

#### M03 · Structure of a virus
- **Goes in:** Lecture 2 · Cell types and viruses → *Structure of viruses*
- **Save as:** `mb-lec02-virus.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two viruses side by side. Left "Naked virus": an icosahedral capsid made of small subunits labelled "Capsomeres" and "Capsid", with a coiled strand inside labelled "Nucleic acid (DNA or RNA)". Right "Enveloped virus": the same core inside a round membrane labelled "Envelope (from host membrane)" with spikes labelled "Glycoprotein spikes". Underneath a bacteriophage drawn with "Head", "Tail", "Tail fibres".

#### M04 · Lytic and lysogenic cycles  ★ make first
- **Goes in:** Lecture 2 → *Lytic and lysogenic cycles*
- **Save as:** `mb-lec02-lytic-lysogenic.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A two-loop diagram sharing a start. Start: "Phage attaches and injects DNA" into a bacterium. Left loop "Lytic cycle": "Phage DNA copied" → "New phages assembled" → "Cell bursts (lysis)". Right loop "Lysogenic cycle": "Phage DNA joins bacterial chromosome (prophage)" → "Copied with each cell division" → many daughter bacteria each with the prophage. A crossing arrow from the lysogenic loop to the lytic loop labelled "Stress triggers switch".

#### M05 · Nucleotide and the DNA double helix
- **Goes in:** Lecture 3 · Chemical basis → *DNA architecture* (also used for *Base pairing*)
- **Save as:** `mb-lec03-double-helix.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Left: a flat ladder segment of DNA. Each side rail is alternating "Sugar" (blue pentagon) and "Phosphate" (yellow circle); rungs are base pairs: "A = T" with two dashed lines labelled "2 H-bonds", "G ≡ C" with three dashed lines labelled "3 H-bonds". Rails labelled "5′" and "3′" at the ends, running in opposite directions, labelled "Antiparallel". Right: the same ladder twisted into a right-handed double helix with a wide groove labelled "Major groove" and a narrow groove labelled "Minor groove", and "2 nm" across.

#### M06 · α-helix and β-sheet
- **Goes in:** Lecture 4 · Protein structure and folding → *Secondary structure*
- **Save as:** `mb-lec04-helix-sheet.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Left: a coiled ribbon labelled "α-helix" with dashed lines connecting turns labelled "H-bond between C=O and N–H four residues apart", and side chains sticking outward labelled "R groups point out". Right: three flat arrows side by side, two pointing the same way and one opposite, with dashed H-bond lines between them, labelled "β-pleated sheet", with small labels "Parallel" and "Antiparallel".

#### M07 · Anfinsen's experiment
- **Goes in:** Lecture 4 → *Denaturation and Anfinsen's experiment*
- **Save as:** `mb-lec04-anfinsen.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three stages left to right. 1) A neatly folded protein with four yellow bridges labelled "Native ribonuclease (4 disulfide bonds), active". Arrow labelled "+ Urea + β-mercaptoethanol". 2) A loose, unfolded chain labelled "Denatured, inactive". Arrow labelled "Remove urea and mercaptoethanol". 3) The same folded shape as stage 1 labelled "Refolds, active again". Caption: "The amino acid sequence holds all the information for folding".

#### M08 · Chaperonin
- **Goes in:** Lecture 4 → *Chaperones and chaperonins*
- **Save as:** `mb-lec04-chaperonin.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A barrel made of two stacked rings, labelled "GroEL (chaperonin)", with a lid labelled "GroES cap". Sequence of three: an unfolded chain entering the open barrel; the lid closing with the label "ATP"; the protein folded inside the closed chamber, then released folded. Caption: "A protected chamber where a protein can fold".

#### M09 · Anatomy of a mitochondrion
- **Goes in:** Lecture 5 · Mitochondria → *Structure of mitochondria* (also Histology Lecture 6 → *Mitochondrial structure*)
- **Save as:** `mb-lec05-mitochondrion.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A cut-open oval mitochondrion. Labels with leader lines: "Outer membrane (porins)", "Inner membrane", "Cristae", "Intermembrane space", "Matrix", "Mitochondrial DNA (circular)", "Ribosomes", "ATP synthase" (small lollipop shapes on the cristae facing the matrix).

#### M10 · Chemiosmosis
- **Goes in:** Lecture 5 → *Chemiosmosis and ATP synthase*
- **Save as:** `mb-lec05-chemiosmosis.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A close-up of the inner membrane with "Intermembrane space" above and "Matrix" below. Many "H⁺" ions crowded above the membrane, few below. Electron transport complexes on the left pumping H⁺ up (arrows labelled "Electron transport pumps H⁺ out"). On the right, ATP synthase shaped like a turbine with a rotor, H⁺ flowing down through it, a curved arrow showing rotation, and "ADP + Pi → ATP" at the bottom. Labels: "Proton gradient (proton-motive force)", "Rotor spins".

#### M11 · The endomembrane system map
- **Goes in:** Lecture 7 · Endomembrane system → *Biosynthetic, secretory and endocytic pathways*
- **Save as:** `mb-lec07-pathways.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A cell outline with the nucleus on the left. Organelles from left to right: "Nucleus", "Rough ER", "Smooth ER", "Golgi (cis → trans)", "Secretory granules", "Lysosome", "Endosome", "Plasma membrane". Three colours of arrows: blue arrows labelled "Biosynthetic pathway" from ER to Golgi to lysosome and membrane; mint arrows labelled "Secretory pathway" from trans-Golgi through vesicles to the plasma membrane (with branches "Constitutive" and "Regulated"); coral arrows labelled "Endocytic pathway" from the plasma membrane to the endosome to the lysosome.

### Histology

#### H01 · Tissue processing step by step  ★ make first
- **Goes in:** Lecture 1 · Methods of study → *Preparing tissue for study*
- **Save as:** `his-lec01-processing.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A row of seven numbered icons with arrows. 1 "Fixation" (tissue in a jar of formalin). 2 "Dehydration" (three jars, increasing alcohol 70%, 95%, 100%). 3 "Clearing" (jar labelled xylene). 4 "Infiltration" (tissue in melted paraffin in an oven). 5 "Embedding" (tissue in a paraffin block in a mould). 6 "Sectioning" (microtome cutting thin ribbons). 7 "Staining (H&E)" (a glass slide with a pink and purple section).

#### H02 · Direct vs indirect immunohistochemistry  ★ make first
- **Goes in:** Lecture 1 → *Visualising specific molecules: immunohistochemistry*
- **Save as:** `his-lec01-ihc.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two panels on a tissue section surface with a target protein (a violet shape). Left "Direct": one Y-shaped antibody with a glowing yellow star bound to the protein, labelled "Labelled primary antibody". Right "Indirect": one unlabelled Y-shaped antibody labelled "Primary antibody" bound to the protein, with three Y-shaped antibodies with yellow stars bound to it labelled "Labelled secondary antibodies". Caption on the right: "More labels per protein → stronger signal".

#### H03 · Light microscope vs TEM vs SEM  ★ make first
- **Goes in:** Lecture 2 · Microscopy → *Electron microscopy: TEM and SEM*
- **Save as:** `his-lec02-lm-tem-sem.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three simplified vertical instrument diagrams side by side. "Light microscope": light source at the bottom, glass lenses, beam passing through a thin section to the eye. "TEM": electron gun at the top, magnetic coils, beam passing through an ultra-thin section onto a screen, labelled "inside of cells". "SEM": electron gun at the top, beam scanning across the surface of a whole sample, detector at the side, labelled "3-D surface". Under each, the resolution: "≈ 0.2 μm", "≈ 0.1–0.2 nm", "≈ a few nm".

#### H04 · Fluid mosaic model
- **Goes in:** Lecture 3 · Plasma membrane → *Membrane proteins and the fluid mosaic*
- **Save as:** `his-lec03-fluid-mosaic.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A cut-away slab of lipid bilayer with "Outside" above and "Cytoplasm" below. Labels: "Phospholipid bilayer", "Cholesterol" (small yellow wedges between lipids), "Integral protein", "Multipass protein" (crossing several times), "Peripheral protein" (on the inner surface), "Glycoprotein" and "Glycolipid" with branching sugar chains on top, "Glycocalyx" (the sugar layer), "Lipid raft" (a slightly thicker patch with several proteins).

#### H05 · Three types of endocytosis
- **Goes in:** Lecture 3 → *Endocytosis*
- **Save as:** `his-lec03-endocytosis.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three panels across a plasma membrane. "Phagocytosis": arms of the cell wrapping around a bacterium, forming a "Phagosome". "Pinocytosis": a small dip in the membrane taking in fluid with dissolved dots, forming a "Pinocytotic vesicle (~80 nm)". "Receptor-mediated endocytosis": specific particles bound to Y-shaped receptors clustered in a coated pit, forming a "Coated vesicle".

#### H06 · Five ways cells signal  ★ make first
- **Goes in:** Lecture 3 → *Signal reception and transduction*
- **Save as:** `his-lec03-signalling.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Five small panels with simple round cells. "Endocrine": a gland cell releases dots into a blood vessel carrying them to a distant cell. "Paracrine": a cell releases dots to a neighbour nearby. "Synaptic": a nerve ending releases dots across a narrow gap to the next cell. "Autocrine": a cell releases dots that bind its own receptors. "Juxtacrine": two cells touching, a surface protein on one binding a receptor on the other.

#### H07 · The secretory pathway in a gland cell  ★ make first
- **Goes in:** Lecture 4 · Ribosomes, ER and Golgi → *Golgi traffic and processing*
- **Save as:** `his-lec04-secretory-cell.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A tall pyramidal gland cell with the base at the bottom and the lumen at the top. Basal part full of stacked "Rough ER" (purple-blue because of ribosomes), the round "Nucleus" in the lower middle, the "Golgi" above the nucleus with its "cis face" toward the ER and "trans face" toward the top, "Secretory granules" (dense round vesicles) crowding the apex, and one granule fusing with the top membrane labelled "Exocytosis". Arrows along the path.

#### H08 · How material reaches lysosomes  ★ make first
- **Goes in:** Lecture 5 · Lysosomes, proteasomes, peroxisomes → *Digestion of endocytosed material* (also used for *Autophagy*)
- **Save as:** `his-lec05-lysosome-routes.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three routes converging on a central "Lysosome (pH 5)". From the top left: "Phagocytosis" → "Phagosome". From the top right: "Endocytosis" → "Endosome". From the bottom: an old mitochondrion wrapped by a membrane → "Autophagosome". All fuse with the lysosome → "Heterolysosome / autolysosome (digesting)" → "Residual body" → "Lipofuscin (in long-lived cells)". Small arrow out of the lysosome: "Nutrients to cytosol".

#### H09 · The three cytoskeletal filaments  ★ make first
- **Goes in:** Lecture 7 · Cytoskeleton → *The three compared*
- **Save as:** `his-lec07-filaments.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three filaments drawn side by side at relative widths. "Microfilament (actin) 5–7 nm": two strands of small beads twisted together, ends labelled "+" and "−". "Intermediate filament ~10 nm": a rope made of twisted fibres, no ends labelled. "Microtubule ~25 nm": a hollow tube made of alternating blue and mint beads (α and β tubulin) in rows, labelled "13 protofilaments", ends "+" and "−".

#### H10 · Kinesin and dynein on a microtubule
- **Goes in:** Lecture 7 → *MTOCs and motor proteins*
- **Save as:** `his-lec07-motors.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A long microtubule stretching from a "Centrosome (MTOC)" near the "Nucleus" on the left ("− end") to the "Cell edge" on the right ("+ end"). A two-legged motor walking right carrying a vesicle, labelled "Kinesin → + end (anterograde)". Another motor walking left carrying a vesicle, labelled "Dynein → − end (retrograde)". A small "ATP" next to each.


---

## Post-midterm (lectures and weeks 8 onward)

45 prompts, 21 marked ★ make first.

### Biochemistry

#### B18 · Activation energy with and without an enzyme  ★ make first
- **Goes in:** Weeks 10–11 · Enzymes → *Activation energy and the transition state*
- **Save as:** `bio-wk10-activation-energy.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** An energy diagram. X-axis "Progress of reaction", Y-axis "Free energy". Start level labelled "Substrate", lower end level labelled "Product". A tall coral curve labelled "Without enzyme" and a much lower blue curve labelled "With enzyme". The peaks labelled "Transition state". Vertical double arrows: a tall one labelled "Activation energy (no enzyme)" and a shorter one labelled "Activation energy (with enzyme)". A double arrow between start and end levels labelled "ΔG (unchanged)".

#### B19 · Michaelis–Menten curve
- **Goes in:** Weeks 10–11 → *Michaelis–Menten kinetics*
- **Save as:** `bio-wk10-michaelis-menten.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A graph. X-axis "[S] substrate concentration", Y-axis "V₀ reaction rate". A rectangular hyperbola rising steeply then levelling off. A dashed horizontal line at the plateau labelled "Vmax". A dashed horizontal line at half that height labelled "½ Vmax", meeting the curve, then a dashed vertical line down to the x-axis labelled "Km". Under the graph: "Low Km = high affinity".

#### B20 · Lineweaver–Burk plots for the two kinds of inhibition  ★ make first
- **Goes in:** Weeks 10–11 → *Inhibition*
- **Save as:** `bio-wk10-inhibition-plots.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two side-by-side graphs, each with axes "1/[S]" and "1/V₀", showing straight lines that cross the y-axis and extend left to cross the x-axis. Left graph titled "Competitive": two lines meeting at the same point on the y-axis (labelled "1/Vmax same"), the steeper line labelled "+ inhibitor", the other "no inhibitor"; their x-intercepts differ (label "Km ↑"). Right graph titled "Non-competitive": two lines meeting at the same point on the x-axis (labelled "−1/Km same"), the steeper line "+ inhibitor"; their y-intercepts differ (label "Vmax ↓").

#### B21 · Lock-and-key and induced fit
- **Goes in:** Weeks 10–11 → *Properties: active site, specificity, cofactors*
- **Save as:** `bio-wk10-induced-fit.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two rows. Top row titled "Lock and key": an enzyme with a rigid notch exactly the shape of a substrate block; arrow; the substrate sits in the notch. Bottom row titled "Induced fit": an enzyme with a loose open notch; arrow; the substrate enters and the enzyme's notch closes around it, labelled "Enzyme changes shape". The notch labelled "Active site" in both.

#### B22 · Nucleoside vs nucleotide
- **Goes in:** Week 12 · Purine metabolism → *Bases, nucleosides and nucleotides*
- **Save as:** `bio-wk12-nucleotide-parts.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three building blocks drawn as simple shapes, then combined. A coral hexagon pair labelled "Base (purine or pyrimidine)", a blue pentagon labelled "Sugar (ribose or deoxyribose)", a yellow circle labelled "Phosphate". First combination: base + sugar, labelled "Nucleoside (e.g. adenosine)". Second combination: phosphate + sugar + base, labelled "Nucleotide (e.g. AMP)". A small side note with two shapes: "Purines: A, G (two rings)" and "Pyrimidines: C, T, U (one ring)".

#### B23 · Purine salvage and breakdown to uric acid  ★ make first
- **Goes in:** Week 12 → *Salvage and degradation* (also used for *Gout*)
- **Save as:** `bio-wk12-purine-breakdown.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A flow diagram. Top-left "AMP" → "Adenosine" → arrow labelled "ADA" → "Inosine" → "Hypoxanthine". Bottom-left "GMP" → "Guanosine" → "Guanine" → "Xanthine". From Hypoxanthine an arrow labelled "Xanthine oxidase" to "Xanthine", then another arrow labelled "Xanthine oxidase" to "Uric acid" (large, coral). A red block symbol on both xanthine oxidase arrows labelled "Allopurinol, febuxostat". Curved green arrows going back up from Hypoxanthine and Guanine labelled "HGPRT + PRPP → IMP, GMP (salvage)", with a small tag "Missing in Lesch–Nyhan".

#### B24 · The thymidylate cycle and the drugs that block it  ★ make first
- **Goes in:** Week 13 · Pyrimidine metabolism → *Deoxyribonucleotides and dTMP* (also used for *Drugs*)
- **Save as:** `bio-wk13-thymidylate-cycle.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two linked circles of arrows. Left: "dUMP" → arrow labelled "Thymidylate synthase" → "dTMP". Right cycle: "N⁵,N¹⁰-Methylene-THF" gives its carbon and becomes "DHF", then an arrow labelled "Dihydrofolate reductase (DHFR)" turns DHF into "THF", and THF is recharged back to N⁵,N¹⁰-Methylene-THF. Red block symbols: on thymidylate synthase "5-Fluorouracil"; on DHFR "Methotrexate, trimethoprim".

#### B25 · Pyrimidine synthesis at a glance
- **Goes in:** Week 13 → *Pyrimidine synthesis*
- **Save as:** `bio-wk13-pyrimidine-synthesis.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A left-to-right pathway: "Glutamine + CO₂ + 2 ATP" → arrow labelled "CPS II (cytosol)" → "Carbamoyl phosphate" → "+ Aspartate" → "Orotate" → arrow labelled "+ PRPP" → "OMP" → "UMP" → "UTP" → arrow labelled "CTP synthetase" → "CTP". A small coral tag under Orotate → UMP: "UMP synthase: deficient in orotic aciduria". A note box: "The ring is built first, then attached to ribose-5-P (PRPP)".

#### B26 · The citric acid (TCA) cycle  ★ make first
- **Goes in:** Week 14 · Metabolism and TCA → *The eight steps of the TCA cycle*
- **Save as:** `bio-wk14-tca-cycle.png`
- **Settings:** Aspect ratio **1:1** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A circular cycle with eight stations clockwise from the top, each a rounded box: "Citrate", "Isocitrate", "α-Ketoglutarate", "Succinyl-CoA", "Succinate", "Fumarate", "Malate", "Oxaloacetate". Entering at the top: "Acetyl-CoA" joining Oxaloacetate to form Citrate. Small side arrows leaving the cycle: "NADH + CO₂" at Isocitrate → α-Ketoglutarate; "NADH + CO₂" at α-Ketoglutarate → Succinyl-CoA; "GTP" at Succinyl-CoA → Succinate; "FADH₂" at Succinate → Fumarate; "NADH" at Malate → Oxaloacetate. Centre label: "Mitochondrial matrix".

#### B27 · Regulation of pyruvate dehydrogenase
- **Goes in:** Week 14 → *PDH regulation*
- **Save as:** `bio-wk14-pdh-regulation.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Centre: "Pyruvate" → big arrow through a box labelled "PDH complex" → "Acetyl-CoA + CO₂ + NADH". Above the box, a switch: "PDH kinase adds phosphate → PDH OFF" and "PDH phosphatase removes phosphate → PDH ON". Left side, green "Activators": "Pyruvate", "ADP", "Ca²⁺", "Insulin". Right side, red "Inhibitors": "Acetyl-CoA", "NADH", "ATP". Bottom note: "Cofactors: B1 (thiamine), B2, B3, B5, lipoic acid".

#### B28 · The electron transport chain and its inhibitors  ★ make first
- **Goes in:** Week 15 · ETC → *The complexes* (also used for *Inhibitors*)
- **Save as:** `bio-wk15-etc.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A horizontal inner mitochondrial membrane (lipid bilayer band) with "Intermembrane space" above and "Matrix" below. In the membrane, left to right: protein blocks "I", "II", "III", "IV" and a mushroom-shaped "ATP synthase (V)". A small yellow oval "CoQ" moving between I/II and III, and a small coral circle "Cyt c" on the top surface between III and IV. Electron path arrow from "NADH" into I and from "FADH₂" into II, through CoQ, III, Cyt c, IV to "O₂ → H₂O". Upward arrows of "H⁺" through I, III and IV. Downward arrow of H⁺ through ATP synthase producing "ADP + Pi → ATP". Red labels with block symbols: at I "Rotenone", at III "Antimycin A", at IV "Cyanide, CO", at V "Oligomycin".

#### B29 · Uncouplers
- **Goes in:** Week 15 → *Uncouplers*
- **Save as:** `bio-wk15-uncouplers.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Inner mitochondrial membrane band with "Intermembrane space (high H⁺)" above and "Matrix" below. On the left, ATP synthase with H⁺ flowing down through it, labelled "Normal: H⁺ flow makes ATP". On the right, a small coral molecule carrying H⁺ straight across the membrane, labelled "Uncoupler (e.g. 2,4-DNP, thermogenin)", with heat wavy lines and the label "Energy lost as heat, no ATP". Below: "Electron transport continues, O₂ use rises".

### Medical Genetics

#### G13 · DNA supercoiling and topoisomerases
- **Goes in:** Week 10 · DNA organisation → *Topoisomerases* (also used for *Negative and positive supercoils*)
- **Save as:** `gen-wk10-supercoiling.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three circles of double-stranded DNA drawn as two twisted lines. Left "Relaxed circle". Middle "Negatively supercoiled (underwound)": the circle twisted into a figure of several loops. Right "Positively supercoiled (overwound)". Below, two small panels: "Topoisomerase I: cuts one strand, no ATP" showing one strand cut and passing through; "Topoisomerase II (gyrase): cuts both strands, uses ATP" showing a double strand passing through a double-strand break.

#### G14 · Levels of DNA packaging  ★ make first
- **Goes in:** Week 11 · Chromatin → *Levels of packaging* (also used in Histology Lecture 9 → *Nucleosome structure*)
- **Save as:** `gen-wk11-packaging-levels.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A left-to-right progression, each step larger and more coiled, each with a size label. "DNA double helix 2 nm" → "Beads on a string: nucleosomes 11 nm" (DNA wound around violet discs) → "30 nm fibre" (nucleosomes stacked in a zig-zag coil) → "Looped domains 300 nm" (fibre forming loops on a central scaffold) → "Condensed chromatin 700 nm" → "Metaphase chromosome 1400 nm" (an X-shaped chromosome).

#### G15 · The nucleosome
- **Goes in:** Week 11 → *The nucleosome* (also used in Histology Lecture 9)
- **Save as:** `gen-wk11-nucleosome.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A close-up of two nucleosomes on a DNA strand. Each nucleosome is a squat cylinder made of eight coloured segments labelled "Histone octamer: 2 × H2A, H2B, H3, H4", with the DNA double helix wrapped about 1.7 turns around it, labelled "~147 bp wrapped". Between the two, a stretch of DNA labelled "Linker DNA". A small yellow block where DNA enters and leaves one nucleosome labelled "Histone H1". Short tails sticking out of the core labelled "Histone tails (acetylation, methylation)".

#### G16 · VNTRs and STRs
- **Goes in:** Week 12 · Repetitive DNA → *STRs (microsatellites)* (also used for *VNTRs*)
- **Save as:** `gen-wk12-vntr-str.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two rows of DNA drawn as a long bar. Top row "Minisatellite (VNTR)": a long block repeated several times in a row, each block labelled "10–100 bp unit". Bottom row "Microsatellite (STR)": short blocks with the letters "CA CA CA CA CA CA" labelled "1–6 bp unit". To the right of each, two people icons (no faces, simple silhouettes) with different numbers of repeats, labelled "Number of repeats differs between people → DNA fingerprinting".

#### G17 · Point mutations explained with a sentence  ★ make first
- **Goes in:** Week 13 · Gene mutations → *Point mutations* (also used for *Insertions, deletions and frameshifts*)
- **Save as:** `gen-wk13-mutation-types.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Five rows, each a sentence of three-letter words in boxes, with a label on the left. "Normal": "THE FAT CAT ATE THE RAT". "Silent": "THE FAT CAT ATE THE RAT" (one letter box coloured but same word meaning, with note "same amino acid"). "Missense": "THE FAT HAT ATE THE RAT" (changed word in coral). "Nonsense": "THE FAT CAT" followed by a red STOP sign. "Frameshift": "THE FAT CTA TET HER AT" (all boxes after the change in coral) with note "one letter deleted". Spell each word exactly.

#### G18 · Thymine dimer from UV light
- **Goes in:** Week 14 · Mutations and β-thalassemia → *Physical mutagens*
- **Save as:** `gen-wk14-thymine-dimer.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A DNA double strand drawn as a ladder. Wavy yellow rays from a small sun icon labelled "UV light" hit two neighbouring rungs on one strand, both labelled "T". The two T's are joined to each other by a thick coral bond, making the backbone kink, labelled "Thymine dimer". A caption: "Blocks replication and transcription; repaired by nucleotide excision repair".

#### G19 · Expanding repeats over generations (anticipation)  ★ make first
- **Goes in:** Week 15 · Trinucleotide repeats → *Genetic anticipation*
- **Save as:** `gen-wk15-anticipation.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A three-generation pedigree, one person per generation in a vertical line, using square and circle symbols. Next to each person, a horizontal bar of repeated small blocks labelled "CAG CAG CAG…", growing longer each generation. Labels: Generation I "Repeats in normal range – no disease", Generation II "Expanded – late onset, mild", Generation III "Further expanded – earlier onset, more severe". A downward arrow on the side labelled "Anticipation".

#### G20 · Base excision vs nucleotide excision repair
- **Goes in:** Week 16 · DNA repair and XP → *Base excision repair* and *Nucleotide excision repair*
- **Save as:** `gen-wk16-ber-ner.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two side-by-side vertical step sequences on a DNA ladder. Left "Base excision repair": 1 "Damaged base (e.g. uracil)" → 2 "DNA glycosylase removes the base" → 3 "AP endonuclease cuts the backbone" → 4 "DNA polymerase fills one base" → 5 "DNA ligase seals". Right "Nucleotide excision repair": 1 "Bulky damage (thymine dimer)" → 2 "Damage recognised (XP proteins)" → 3 "A short stretch of the strand is cut out" → 4 "DNA polymerase fills the gap" → 5 "DNA ligase seals". A coral tag on the right column: "Defective in xeroderma pigmentosum".

#### G21 · Cut-and-paste vs copy-and-paste transposition
- **Goes in:** Week 17 · Transposable elements → *Cut-and-paste mechanism* and *Copy-and-paste mechanism*
- **Save as:** `gen-wk17-transposition.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two rows. Top "DNA transposon: cut and paste": a coloured segment with small arrows at both ends labelled "Inverted repeats", a "Transposase" enzyme cuts it out of one place on the DNA and inserts it at a new place, leaving the old place empty. Bottom "Retrotransposon: copy and paste": the segment stays in place; arrow "Transcription" → an RNA copy (wavy line) → arrow "Reverse transcriptase" → a DNA copy inserted at a new place, so there are now two copies.

### Molecular Biology

#### M12 · Co-translational translocation
- **Goes in:** Lecture 8 · Co-translational translocation → *Co-translational translocation* (also Histology Lecture 4 → *Signal sequence and SRP*)
- **Save as:** `mb-lec08-srp.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A numbered sequence above an ER membrane (cytosol above, ER lumen below). 1 "Ribosome makes the signal sequence" (a ribosome on an mRNA strand with a short coral peptide emerging). 2 "SRP binds; translation pauses". 3 "SRP docks on the SRP receptor". 4 "Ribosome hands over to the translocon; SRP released (GTP)". 5 "Chain threads into the lumen; translation resumes". 6 "Signal peptidase cuts off the signal sequence". 7 "Protein folds in the ER lumen".

#### M13 · G proteins as switches  ★ make first
- **Goes in:** Lecture 8 → *G proteins as switches*
- **Save as:** `mb-lec08-gprotein-switch.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A circular cycle with two states. Left state: a G protein drawn as a rounded block holding a small "GDP" circle, labelled "OFF". Right state: the same block holding "GTP", labelled "ON", with a glowing outline. Top arrow from OFF to ON labelled "GEF: swaps GDP for GTP". Bottom arrow from ON to OFF labelled "GAP: speeds GTP hydrolysis (GTP → GDP + Pi)".

#### M14 · The calnexin cycle
- **Goes in:** Lecture 9 · ER quality control → *Quality control: the calnexin cycle*
- **Save as:** `mb-lec09-calnexin.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A cycle inside the ER lumen. A newly made glycoprotein with a sugar tree carrying one glucose (small yellow circle) binds "Calnexin" (attached to the ER membrane). Arrow "Glucosidase II removes the last glucose" → protein released. Branch: "Folded correctly" → "To the Golgi". Branch: "Still misfolded" → "UGGT adds a glucose back" → returns to calnexin. A side exit: "Misfolded for too long → ERAD (proteasome)".

#### M15 · Importing proteins into mitochondria
- **Goes in:** Lecture 9 → *Import into mitochondria*
- **Save as:** `mb-lec09-mito-import.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A section of a mitochondrion with outer and inner membranes. A protein chain with a coral tip labelled "Matrix-targeting sequence (amphipathic helix)" arrives from the cytosol held by "Hsp70 (keeps it unfolded)". It passes through a channel in the outer membrane labelled "TOM complex", then through the inner membrane channel labelled "TIM complex", into the matrix where "Mitochondrial Hsp70" pulls it in and "Signal peptidase removes the tip". The protein then folds.

#### M16 · The three coated vesicles  ★ make first
- **Goes in:** Lecture 10 · Vesicular transport → *The three coated vesicles*
- **Save as:** `mb-lec10-coated-vesicles.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A cell map with the ER on the left, the Golgi in the middle (cis and trans faces), and the plasma membrane on the right with an endosome nearby. Coloured vesicles with spiky coats travelling between them: blue "COPII: ER → Golgi"; yellow "COPI: Golgi → ER and between Golgi stacks (retrograde)"; coral "Clathrin: trans-Golgi → endosomes and plasma membrane → endosomes". A small legend of the three coat colours.

#### M17 · SNAREs and vesicle fusion
- **Goes in:** Lecture 10 → *Docking and fusion: SNAREs*
- **Save as:** `mb-lec10-snares.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three steps. 1 "Tethering": a vesicle near a target membrane, held by a long thin protein labelled "Tethering protein (Rab-GTP)". 2 "Docking": a protein on the vesicle labelled "v-SNARE" twisting together with one on the target labelled "t-SNARE", making a coiled bundle labelled "trans-SNARE complex". 3 "Fusion": the membranes merge and the vesicle contents spill into the target compartment.

#### M18 · Mannose-6-phosphate sorting
- **Goes in:** Lecture 11 · Endocytosis and lysosomes → *Sorting lysosomal enzymes* (also Histology Lecture 5 → *Making lysosomes*)
- **Save as:** `mb-lec11-m6p.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A flow from left to right. "RER: lysosomal enzyme made" → "cis-Golgi: phosphotransferase adds the tag" (enzyme gets a small yellow tag labelled "M6P") → "trans-Golgi: M6P receptors bind the tagged enzyme" → clathrin-coated vesicle → "Late endosome: low pH releases the enzyme" → "Lysosome". A curved arrow returning the empty receptors to the Golgi labelled "Receptors recycled". A coral side note at the phosphotransferase: "Missing in I-cell disease → enzymes secreted".

#### M19 · LDL uptake by receptor-mediated endocytosis  ★ make first
- **Goes in:** Lecture 11 → *LDL uptake and cholesterol*
- **Save as:** `mb-lec11-ldl.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A numbered sequence at the plasma membrane. 1 "LDL binds LDL receptors" (round LDL particles on Y-shaped receptors). 2 "Receptors gather in a clathrin-coated pit". 3 "Coated vesicle pinches off". 4 "Coat removed; vesicle fuses with the early endosome". 5 "Low pH: LDL lets go of the receptor". 6 "Receptors recycled to the surface". 7 "LDL to the lysosome → free cholesterol released". A coral note: "Faulty receptor → familial hypercholesterolemia".

#### M20 · Bacterial transcription
- **Goes in:** Lecture 14 · Transcription → *Transcription in bacteria*
- **Save as:** `mb-lec14-bacterial-transcription.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A DNA double strand drawn horizontally with a highlighted region labelled "Promoter" and a marker "+1" just after it, "Upstream" to the left and "Downstream" to the right. Three steps. 1 "Initiation": a large enzyme "Core RNA polymerase" plus a smaller piece "σ factor" together labelled "Holoenzyme" binds the promoter; the DNA opens into a bubble labelled "Open complex". 2 "Elongation": σ has left; the core enzyme moves right, an RNA strand emerging labelled "RNA 5′ → 3′". 3 "Termination": the RNA folds into a hairpin followed by "UUUU", and the RNA is released.

#### M21 · Eukaryotic mRNA processing
- **Goes in:** Lecture 14 → *Structure of mRNA* (also used for *5′ cap* and *3′ poly(A) tail*)
- **Save as:** `mb-lec14-mrna-processing.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Top: a long pre-mRNA bar with blue boxes "Exon 1", "Exon 2", "Exon 3" and grey stretches "Intron" between them. Three processing steps with arrows: "5′ cap added (7-methylguanosine)" at the left end; "Cut after AAUAAA, poly(A) tail added" at the right end with "AAAAAA"; "Introns spliced out". Bottom: the mature mRNA bar: "5′ cap", "5′ UTR", joined exons labelled "Coding region", "3′ UTR", "Poly(A) tail".

#### M22 · Splicing and the lariat  ★ make first
- **Goes in:** Lecture 14 → *Splicing*
- **Save as:** `mb-lec14-lariat.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three steps. 1: "Exon 1" (blue) – intron (grey) starting with "GU", containing a branch point "A", ending with "AG" – "Exon 2" (blue). Small blobs labelled "snRNPs (U1, U2, U4, U5, U6) = spliceosome" sit on the intron. 2: "First cut": the 5′ end of the intron loops back and joins to the branch-point A, making a loop labelled "Lariat". 3: "Second cut": the exons join together labelled "Exons joined", and the lariat intron is released labelled "Intron degraded".

#### M23 · Alternative splicing
- **Goes in:** Lecture 14 → *Alternative splicing*
- **Save as:** `mb-lec14-alternative-splicing.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Top: a pre-mRNA with exons "1", "2", "3", "4" (exon 3 coral, others blue). Two arrows down. Left: an mRNA with exons "1 2 3 4" labelled "Fibroblast: includes the extra exon → fibronectin binds the cell surface". Right: an mRNA with exons "1 2 4" labelled "Hepatocyte: skips the exon → soluble fibronectin in blood". Caption: "One gene, several proteins".

### Histology

#### H11 · The nucleus and its envelope
- **Goes in:** Lecture 8 · Nuclear envelope and nucleolus → *Nuclear envelope*
- **Save as:** `his-lec08-nucleus.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A cut-open round nucleus. Labels: "Outer nuclear membrane (with ribosomes)", continuous on one side with "Rough ER"; "Inner nuclear membrane"; "Perinuclear space" between them; "Nuclear pore complex" (several ring-shaped openings); "Nuclear lamina" (a mesh lining the inside); "Nucleolus" (a large dark round body, no membrane); "Heterochromatin" (dark clumps along the edge); "Euchromatin" (pale, spread out).

#### H12 · Nuclear transport  ★ make first
- **Goes in:** Lecture 8 → *Nuclear pore complexes and transport*
- **Save as:** `his-lec08-nuclear-transport.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A close-up of one nuclear pore complex spanning a double membrane, "Cytoplasm" above and "Nucleus" below. Downward arrow: a protein with a small tag labelled "NLS" carried by "Importin" into the nucleus. Upward arrows: "mRNA" and a "Ribosomal subunit" carried out by "Exportin". A small label "Energy: GTP (Ran)". The pore labelled "Nucleoporins".

#### H13 · The cell cycle and its checkpoints  ★ make first
- **Goes in:** Lecture 10 · Cell cycle and mitosis → *Phases of the cell cycle* (also used for *Checkpoints*)
- **Save as:** `his-lec10-cell-cycle.png`
- **Settings:** Aspect ratio **1:1** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A circular cycle divided into four coloured arcs: a large "G1" (blue), "S" (mint, labelled "DNA replication"), "G2" (yellow) and a smaller "M" (coral, labelled "Mitosis"). A small side exit from G1 labelled "G0 (resting)". Three stop-sign markers on the circle: between G1 and S "G1/S checkpoint", within S "S checkpoint", between G2 and M "G2/M checkpoint". In the centre: "Cyclins + CDKs drive the cycle; p53 stops it if DNA is damaged".

#### H14 · The stages of mitosis
- **Goes in:** Lecture 10 → *Mitosis*
- **Save as:** `his-lec10-mitosis.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Five round cells in a row, each with a label. "Interphase": a nucleus with loose chromatin and two centrosomes nearby. "Prophase": X-shaped chromosomes visible, nuclear envelope breaking up, spindle forming between centrosomes moving apart. "Metaphase": chromosomes lined up in the middle, spindle fibres attached at the "Kinetochores". "Anaphase": sister chromatids pulled to opposite poles. "Telophase and cytokinesis": two new nuclei forming, the cell pinching in the middle by an "Actin contractile ring".

#### H15 · Meiosis I and II  ★ make first
- **Goes in:** Lecture 11 · Stem cells, meiosis, apoptosis → *Meiosis*
- **Save as:** `his-lec11-meiosis.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A tree diagram. Top: one cell with one homologous pair (one blue, one coral chromosome, each as two sister chromatids), labelled "2n, DNA replicated". A small inset: the pair touching with a crossed segment, labelled "Synapsis and crossing over". Arrow labelled "Meiosis I: homologues separate" → two cells, each with one chromosome made of two chromatids (now partly mixed colours). Arrow labelled "Meiosis II: sister chromatids separate" → four cells, each with one single chromatid, labelled "4 haploid cells (n), all different".

#### H16 · Apoptosis vs necrosis  ★ make first
- **Goes in:** Lecture 11 → *Apoptosis vs necrosis*
- **Save as:** `his-lec11-apoptosis-necrosis.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two rows starting from the same normal cell. Top row "Apoptosis": the cell shrinks, the nucleus becomes small and dense ("Pyknosis"), the membrane forms bubbles ("Blebbing"), the cell breaks into "Apoptotic bodies", which a macrophage swallows; label "No inflammation". Bottom row "Necrosis": the cell swells, organelles swell, the membrane bursts and contents spill out; white blood cells arrive; label "Inflammation".

#### H17 · The junctional complex and basal junctions  ★ make first
- **Goes in:** Lecture 12 · Epithelial cells and junctions → *Intercellular junctions* (also used for *Basal anchoring junctions*)
- **Save as:** `his-lec12-junctions.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two tall columnar epithelial cells side by side, the lumen on top with microvilli, the basement membrane at the bottom. Between the cells, from top to bottom: "Tight junction (claudin, occludin)" right at the top, sealing; "Adherens junction (cadherin → actin)" as a belt just below; "Desmosome (desmoglein → intermediate filaments)" as spot welds; "Gap junction (connexons)" as small channels. At the base: "Hemidesmosome (integrin → intermediate filaments)" and "Focal adhesion (integrin → actin)" attaching to the "Basement membrane". Draw actin as thin red lines and intermediate filaments as thicker blue lines inside the cells.

#### H18 · The basement membrane  ★ make first
- **Goes in:** Lecture 12 → *Basement membrane*
- **Save as:** `his-lec12-basement-membrane.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A close-up cross-section. Top: the base of an epithelial cell. Below it, a thin dense layer labelled "Basal lamina (20–100 nm)" with a mesh labelled "Type IV collagen" and small cross-shaped molecules labelled "Laminin", plus labels "Nidogen" and "Perlecan". Below that, a looser fibrous layer labelled "Reticular lamina" with "Type III collagen (reticular fibres)" and loops labelled "Type VII collagen anchoring fibrils". Bottom: "Connective tissue (lamina propria)". A bracket over both layers: "Basement membrane (seen by light microscopy)".

#### H19 · Microvillus vs cilium
- **Goes in:** Lecture 13 · Apical specialisations → *Cilia and flagella* (also used for *Microvilli*)
- **Save as:** `his-lec13-microvillus-cilium.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Two columns. Left "Microvillus (1 μm)": a short finger-shaped projection with a core bundle of thin red lines labelled "Actin filaments", rooted in a horizontal mesh labelled "Terminal web", and a fuzzy coat labelled "Glycocalyx". Below it, its cross-section: a circle with many dots. Right "Cilium (5–10 μm)": a long projection anchored by a "Basal body", with a cross-section circle showing nine pairs of tubes around two central single tubes, labelled "Axoneme 9 + 2", and small arms on the pairs labelled "Dynein arms".

#### H20 · Classifying covering epithelia  ★ make first
- **Goes in:** Lecture 14 · Types of epithelia and glands → *Classifying covering epithelia* (also used in the Epithelium practical → *How to identify an epithelium*)
- **Save as:** `his-lec14-epithelia-grid.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A grid of simple cross-section drawings of epithelia, each sitting on a thin line labelled basement membrane, each with a title. Row 1: "Simple squamous" (one row of flat cells with flat nuclei), "Simple cuboidal" (one row of square cells, round central nuclei), "Simple columnar" (one row of tall cells, oval basal nuclei). Row 2: "Stratified squamous" (many layers, flat at the top), "Stratified cuboidal" (two layers of square cells), "Pseudostratified columnar" (one layer, nuclei at different heights, cilia on top, all cells touching the base). Row 3: "Transitional – relaxed" (several layers with dome-shaped top cells), "Transitional – stretched" (fewer, flattened layers).

#### H21 · Three ways glands release secretions  ★ make first
- **Goes in:** Lecture 14 → *Secretion mechanisms*
- **Save as:** `his-lec14-secretion-modes.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** Three gland cells side by side. "Merocrine": vesicles fuse with the top membrane and release their contents; the cell stays whole; label "Exocytosis (e.g. salivary, pancreas)". "Apocrine": the top of the cell pinches off with the secretion inside a bit of cytoplasm; label "Loses its apex (e.g. mammary gland)". "Holocrine": the whole cell filled with product breaks apart; label "Whole cell lost (e.g. sebaceous gland)".

#### H22 · Gland shapes
- **Goes in:** Lecture 14 → *Gland structure*
- **Save as:** `his-lec14-gland-shapes.png`
- **Settings:** Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium**
- **Prompt:** A row of simple outline drawings of exocrine glands opening onto a surface line at the top, each labelled underneath. "Simple tubular", "Simple coiled tubular", "Simple branched tubular", "Simple acinar", "Compound tubular", "Compound acinar", "Compound tubulo-acinar". Ducts drawn as thin tubes, secretory parts filled mint; tubular parts long, acinar parts round sacs; compound glands have branching ducts.


---

## Pictures that should come from the slides only

These need real images, so I won't make prompts for them:

- **Histology:** all microscope photos (H&E epithelium types, the "Organelles" electron micrographs, the relaxed vs stretched urothelium, microvilli and cilia micrographs, the nucleolus, mitochondria and RER in EM).
- **Biochemistry:** exact chemical structures (amino acid side chains, sugar rings and glycosidic bonds, purine and pyrimidine rings, heme), where a drawing that is slightly wrong would teach the wrong thing.
- **Genetics:** real karyotypes, FISH images, and photos of patients or clinical signs.

---

## Fixes needed (pre-midterm): new prompts

Six pictures came back with a mistake. Make each one again in a **new chat**: paste the style text into System instructions as before, then the prompt below. Settings: Aspect ratio **16:9** · Resolution **2K** · Thinking level **Medium** · Images only. Save it with the same name, replacing the old file.

Each prompt now spells out the part that went wrong, and ends with a check line so the model looks at it again.

### Fix 1 · `gen-wk02-abo-antigens.png` (needed)

A red blood cell surface drawn as a wide, gently curved horizontal membrane along the bottom, labelled "Red blood cell surface". Four sugar chains stand up from the membrane, left to right, each a short vertical string of coloured shapes. Chain 1, labelled "Precursor": four plain shapes. Arrow labelled "H gene (FUT1) adds fucose" to Chain 2, labelled "H antigen": the same four shapes with an orange triangle on top, labelled "fucose". From Chain 2 two arrows go right. Upper arrow labelled "A enzyme adds N-acetylgalactosamine" to Chain 3, labelled "A antigen": the same four shapes, the orange fucose triangle, and a blue square added beside the triangle. Lower arrow labelled "B enzyme adds galactose" to Chain 4, labelled "B antigen": the same four shapes, the orange fucose triangle, and a yellow circle added beside the triangle. A faint dashed arrow from Chain 2 downwards labelled "O allele: no working enzyme → H antigen stays (group O)". A coral box at the bottom right: "Bombay (hh): no H antigen, so no A or B even with A or B genes". Check: the orange fucose triangle must appear on the H, A and B antigen chains; the A and B sugars are added next to it, never instead of it.

### Fix 2 · `gen-wk03-imprinting.png`

Two side-by-side panels with rounded borders. Each panel shows two upright chromosome 15s: a blue one labelled "Paternal" and a coral one labelled "Maternal". Left panel titled "Prader–Willi": on the blue paternal chromosome, a dashed empty gap labelled "deletion (missing 15q11–q13)"; the coral maternal chromosome has a yellow band labelled "15q11–q13". Caption under the left panel: "Loss of paternal genes". Right panel titled "Angelman": the blue paternal chromosome has a yellow band labelled "15q11–q13"; on the coral maternal chromosome, a dashed empty gap labelled "deletion (missing 15q11–q13)". Caption under the right panel: "Loss of maternal gene (UBE3A)". One line under both panels: "Same region, different parent → different disease". Check: every region label reads exactly "15q11–q13", with the 1 before the 5.

### Fix 3 · `mb-lec05-chemiosmosis.png`

A close-up of the inner mitochondrial membrane as a horizontal lipid bilayer across the middle, "Intermembrane space" written above it and "Matrix" below it. Many small "H⁺" circles crowded above the membrane, only a few below. On the left, three blocky protein complexes in the membrane with upward arrows carrying H⁺ through them, and one label under them: "Electron transport pumps H⁺ out". On the right, ATP synthase shaped like a turbine: a part in the membrane and a round head hanging into the matrix, H⁺ flowing down through it, curved arrows around it labelled "Rotor spins", and "ADP + Pi → ATP" under the head. A bracket beside the crowded H⁺ labelled "Proton gradient (proton-motive force)". Check the spelling: "Electron" (E-l-e-c-t-r-o-n), and each label appears only once.

### Fix 4 · `mb-lec01-pro-vs-eu.png`

Two cells side by side, the eukaryote drawn about three times larger. Left: a rod-shaped bacterium, title above it "Prokaryote (1–10 μm)", with these labels and leader lines: "Cell wall" (outer layer), "Plasma membrane" (inner layer), "Nucleoid (no nucleus)" (tangled DNA loop), "Ribosomes (70S)" (small dots), "Plasmid" (small separate ring), "Flagellum" (long tail). Right: a round animal cell, title above it "Eukaryote (10–100 μm)", with labels: "Nucleus" (large purple circle), "Nuclear envelope" (its double outline with pores), "Mitochondrion" (oval with folds), "Rough ER" (folded membranes with dots next to the nucleus), "Golgi" (a stack of four curved flat sacs), "Lysosome" (small round body), "Ribosomes (80S)" (small dots), "Plasma membrane" (cell outline). Check the spelling of "Plasmid" and "Plasma membrane", and that "Golgi" points to the stack of curved sacs.

### Fix 5 · `bio-wk06-proteoglycan.png` (optional: the slides cover this)

A "bottle-brush" model. A long horizontal blue strand across the middle, labelled "Hyaluronic acid". Along it, at regular intervals, six vertical violet stems stick up and down; each stem is one "Core protein". Where each stem meets the blue strand there is a small yellow block; each block is a "Link protein". From each violet stem many short mint bristles stick out on both sides: "Glycosaminoglycan (GAG) chains". Place each label once, with a thin leader line: "Hyaluronic acid" to the blue strand, "Core protein" to one violet stem, "Link protein" to one yellow block, "Glycosaminoglycan (GAG) chains" to one group of mint bristles. A small round inset at the top right shows bristles with water droplets, labelled "GAGs attract water: cushioning". Check: the "Core protein" line ends on a violet stem and the "Link protein" line ends on a yellow block.

### Fix 6 · `mb-lec04-anfinsen.png` (optional: the slides cover this)

Three stages left to right with arrows between them. Stage 1: one long purple-and-blue protein chain neatly folded into a compact knot, held by four short yellow bridges, labelled "Native ribonuclease (4 disulfide bonds), active". Arrow labelled "+ Urea + β-mercaptoethanol". Stage 2: the same single chain now loose and stretched out in long loops, one unbroken line from one end to the other, with the four yellow bridges each split into two open halves, labelled "Denatured, inactive". Arrow labelled "Remove urea and mercaptoethanol". Stage 3: the same compact knot as Stage 1 with four yellow bridges, labelled "Refolds, active again". Caption across the bottom: "The amino acid sequence holds all the information for folding". Check: in Stage 2 the chain is one continuous line with no cuts or gaps (only the yellow bridges are open), and Stage 1 and Stage 3 each show exactly four yellow bridges.
