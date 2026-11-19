# GCT II Biochemistry: pre-midterm cases

These are the source files for the **Biochemistry — Pre-Midterm Cases** topic in the `gct2_biochemistry` question bank. The topic covers carbohydrate metabolism: glycolysis, gluconeogenesis, glycogen and the storage diseases, the HMP shunt and G6PD, galactose, fructose and sorbitol, and fasting regulation.

The questions go into the bank through `supabase/migrations/20261119200000_gct2_biochem_premid_cases.sql`, which adds 95 questions after the table's current highest `ord`. It only inserts: a question is skipped if the table already has one with the same text, so running it again adds nothing.

## What was used from each file

| File | Used | Not used |
|---|---|---|
| `GCT_2-pre_mid_1_1_2.docx` | Q1–14 | none |
| `1-Glycolysis-cases_1.docx` | Q1, 2, 4–10 | Q3 (duplicate of pre_mid Q1) |
| `Case_study-Glycolysis-2025_2.pptx` | slides 2–16 (15 questions; several slides are pictures) | none |
| `Glycolysis-MCQ_2_4.docx` | Q1, 2, 4, 6, 7, 9, 10 | Q3 (a picture, same as pptx slide 7), Q5 (duplicate of Glycolysis-cases Q8), Q8 (same as pptx slide 6) |
| `MCQ_about_Glycogen_metabolism.docx` | Q1–5, 8–10 | Q6, Q7 (already in the bank) |
| `carbohydrates-lecture_1_2_3_1_1.docx` | six picture questions, plus the myophosphorylase case | Q1 and the glucagon-challenge case (von Gierke duplicates), Q2 (duplicate of cases_for_meeting Q21) |
| `Cases_for_5th_lecture_1.docx` | pictures 1, 3, 5 | picture 2 (Pompe, duplicate of GCT_2 Q11), 4 (von Gierke, duplicate of GCT_2 Q10), 6 (McArdle, duplicate of the carbohydrates-lecture myophosphorylase case) |
| `GCT_2_1.docx` | Q1, 3–17 | Q19 (erythropoietin, outside pre-mid), Q2 (duplicate of cases_for_meeting Q3), Q18 (duplicate of Glycolysis-cases Q1) |
| `cases_for_meeting.docx` | Q1, 3–6, 11, 12, 14, 18, 21, 25–29, 31 | Q2 (duplicate of pre_mid Q2), Q32 (duplicate of GCT_2 Q3), Q30 (already in the bank); the remaining questions are post-midterm |

When I removed a duplicate, I treated a question as one if it had the same scenario, asked the same thing and had the same answer. Questions that test the same fact from a different angle, for example "which enzyme?" and "which reaction?" for McArdle disease, are all kept.

## Already in the bank, so not added

These three ask the same thing, with the same answer, as questions already in the GCT II Biochemistry lecture topics, so they were left out:

- **Glycogen MCQ Q6**: "Which amino acid residue of glycogenin is important for starting glycogen synthesis?" (already asked by question id 94)
- **Glycogen MCQ Q7**: "Which molecule acts as the glucose donor in glycogen synthesis?" (already asked by question id 95)
- **cases for meeting Q30**: "Heinz bodies seen in G6PD deficiency are composed of:" (already asked by question id 287)

## How the questions were edited

- Most files have no answer key. In those, I worked out each answer and wrote an explanation for every question. `cases_for_meeting.docx` has its own key and explanations; I shortened those explanations and checked them.
- Questions that were pictures are typed out as text. Where a question depended on a diagram or graph (pptx slide 11, and the two carbohydrates-lecture questions with a graph and a pathway diagram), the stem or the options now describe it, so the bank needs no pictures.
- Typos were fixed and spelling follows the rest of the bank (American English). Stems were changed only where noted below.

## Please check these

Each item marked ⚠️ in the answer key below is one where the source key looks wrong, the source wording was ambiguous, or more than one answer could be argued. The most important one is **Q14 of cases_for_meeting (the malate shuttle)**: the source key says C, but I keyed B. To change an answer after the migration has run, update that row's `answer` value (0 = A).

## Answer key

### 1. GCT_2-pre_mid Q1

A 4-year-old boy presents with pallor and jaundice. Labs show normocytic anemia and an elevated reticulocyte count. The peripheral smear shows echinocytes. Genetic analysis reveals a defect in an enzyme of glycolysis. Which of the following best explains the source of his hemolytic anemia?

A) Impaired ATP production due to deficient pyruvate kinase  
B) Inhibition of Na⁺/K⁺-ATPase due to lactate accumulation  
C) Accumulation of 2,3-BPG due to hexokinase overactivity  
D) Increased NADH oxidation in mitochondria  
E) Uncoupling of the electron transport chain in red cells

**✅ A** — Red cells have no mitochondria and depend on glycolysis for ATP. In pyruvate kinase deficiency ATP runs short, the membrane pumps fail, the cells lose their shape (echinocytes) and are removed in the spleen. Options about mitochondria cannot apply to mature red cells.

### 2. GCT_2-pre_mid Q2

During prolonged fasting, gluconeogenesis is upregulated. The mitochondrial isoform of a key enzyme requires biotin as a cofactor and is allosterically activated by a TCA cycle substrate. Which of the following correctly matches this enzyme and its regulation?

A) Phosphoenolpyruvate carboxykinase – activated by ATP  
B) Pyruvate carboxylase – activated by acetyl-CoA  
C) Fructose-1,6-bisphosphatase – inhibited by ATP  
D) Glucose-6-phosphatase – activated by glucagon directly  
E) Glycerol kinase – inhibited by fructose-2,6-bisphosphate

**✅ B** — Pyruvate carboxylase is mitochondrial, uses biotin, converts pyruvate to oxaloacetate and is allosterically activated by acetyl-CoA, which rises in fasting from β-oxidation. PEPCK uses GTP and is controlled mainly at the gene level; FBPase-1 is inhibited by AMP and fructose-2,6-bisphosphate, not ATP.

### 3. GCT_2-pre_mid Q3

A novel chemotherapeutic agent inhibits the enzyme that catalyzes the ATP-generating step at the end of anaerobic glycolysis. In cultured tumor cells treated with this drug under hypoxic conditions, which metabolite would most likely accumulate?

A) Glucose-6-phosphate  
B) Fructose-1,6-bisphosphate  
C) 3-Phosphoglycerate  
D) Phosphoenolpyruvate  
E) Lactate

**✅ D** — The last, ATP-generating step of glycolysis is pyruvate kinase (phosphoenolpyruvate → pyruvate). Blocking it makes phosphoenolpyruvate pile up just upstream, while lactate falls because less pyruvate is made.

> ⚠️ **Check:** Source stem said "the ATP-generating step"; phosphoglycerate kinase also makes ATP, so I added "at the end of" to make pyruvate kinase (→ PEP) the only reading.

### 4. GCT_2-pre_mid Q4

A patient ingests arsenate, a toxic compound that uncouples substrate-level phosphorylation in glycolysis. Which step is directly affected, and what is the consequence?

A) Inhibition of enolase; accumulation of 2-phosphoglycerate  
B) Inhibition of phosphoglycerate kinase; no net ATP gain  
C) Arsenate replaces phosphate at the G3P dehydrogenase step; ATP production is bypassed  
D) Activation of pyruvate dehydrogenase; excess acetyl-CoA  
E) Inhibition of hexokinase; glucose entry is blocked

**✅ C** — Arsenate competes with inorganic phosphate at glyceraldehyde-3-phosphate dehydrogenase, forming 1-arseno-3-phosphoglycerate, which hydrolyzes spontaneously to 3-phosphoglycerate. The phosphoglycerate kinase step is skipped, so no ATP is made there. Fluoride, not arsenate, inhibits enolase.

### 5. GCT_2-pre_mid Q5

In a fasting state, glucagon binds to hepatocyte receptors, triggering glycogenolysis. Which of the following post-translational events most directly enhances glycogen breakdown in hepatocytes?

A) Phosphorylation of glycogen phosphorylase, downstream of protein kinase A  
B) Dephosphorylation of phosphorylase kinase by protein phosphatase 1  
C) Allosteric inhibition of glycogen phosphorylase by AMP  
D) Inhibition of adenylate cyclase by insulin signaling

**✅ A** — Glucagon → cAMP → protein kinase A, which phosphorylates and activates phosphorylase kinase; phosphorylase kinase then phosphorylates glycogen phosphorylase into its active a form. Dephosphorylation by protein phosphatase 1 switches breakdown off, and AMP activates (not inhibits) phosphorylase.

> ⚠️ **Check:** Source option A said "phosphorylation of glycogen phosphorylase by protein kinase A". Strictly PKA phosphorylates phosphorylase kinase, which then phosphorylates phosphorylase, so I reworded it to "downstream of protein kinase A".

### 6. GCT_2-pre_mid Q6

A 6-month-old infant presents with hepatomegaly, lactic acidosis and fasting hypoglycemia. Liver biopsy reveals enlarged hepatocytes packed with glycogen. Blood glucose does not rise after a glucagon injection. Which of the following is most likely deficient?

A) Liver phosphorylase kinase  
B) Debranching enzyme  
C) Glucose-6-phosphatase  
D) Lysosomal α-1,4-glucosidase

**✅ C** — Von Gierke disease (type Ia): glucose-6-phosphatase is the last step of both glycogenolysis and gluconeogenesis, so glucagon cannot release free glucose and lactate builds up. Debranching enzyme deficiency (Cori) gives milder hypoglycemia without lactic acidosis.

### 7. GCT_2-pre_mid Q7

A 3-year-old girl presents with hepatomegaly and mild hypoglycemia. Lab studies show modest elevation of liver transaminases. Liver biopsy shows glycogen with short outer branches (limit dextrin-like). Which enzyme is deficient?

A) Amylo-α-1,6-glucosidase  
B) Glycogen phosphorylase  
C) Glucose-6-phosphatase  
D) UDP-glucose pyrophosphorylase

**✅ A** — Short outer branches mean phosphorylase trimmed each chain to about four residues from the branch point and could go no further, because the debranching enzyme (amylo-α-1,6-glucosidase) is missing: Cori disease (type III). Phosphorylase deficiency (Hers) leaves normally structured glycogen.

### 8. GCT_2-pre_mid Q8

A mutation is identified in a gene encoding an enzyme required to initiate glycogen synthesis. Affected patients have very low hepatic glycogen content but normal glycogen synthase activity. Which of the following is most likely defective?

A) Glycogen phosphorylase  
B) Glycogenin  
C) Branching enzyme  
D) Hexokinase

**✅ B** — Glycogen synthase can only extend an existing chain. Glycogenin starts synthesis by attaching glucose from UDP-glucose to its own tyrosine and building a short primer, so without it little glycogen is made. Branching enzyme deficiency gives abnormal, long-chained glycogen rather than too little.

### 9. GCT_2-pre_mid Q9

A 2-year-old boy presents with recurrent hypoglycemia, hepatomegaly and lactic acidosis. Metabolic workup shows elevated alanine and lactate but normal β-oxidation. A deficiency of which enzyme would most directly prevent gluconeogenesis from both alanine and lactate?

A) Pyruvate dehydrogenase  
B) Phosphoenolpyruvate carboxykinase  
C) Pyruvate carboxylase  
D) Glucose-6-phosphatase  
E) Malate dehydrogenase

**✅ C** — Lactate (via LDH) and alanine (via ALT) both become pyruvate, and pyruvate carboxylase is the first step taking pyruvate into gluconeogenesis, so its loss blocks both and makes them pile up. Pyruvate dehydrogenase deficiency raises lactate but does not block gluconeogenesis.

> ⚠️ **Check:** No key in source. PEPCK deficiency would also block both substrates; I chose pyruvate carboxylase because it is the first committed step from pyruvate and the raised alanine and lactate point to pyruvate that cannot be carboxylated.

### 10. GCT_2-pre_mid Q10

A neonate develops profound fasting hypoglycemia with hepatomegaly and elevated triglycerides. Gluconeogenesis from lactate and alanine is impaired, but gluconeogenesis from odd-chain fatty acids remains intact. Which enzyme is most likely defective?

A) Glucose-6-phosphatase  
B) Fructose-1,6-bisphosphatase  
C) Phosphoenolpyruvate carboxykinase  
D) Pyruvate carboxylase

**✅ D** — Odd-chain fatty acids give propionyl-CoA → succinyl-CoA, which reaches oxaloacetate through the TCA cycle without pyruvate carboxylase. Lactate and alanine must go through pyruvate → oxaloacetate, so only they are blocked. A PEPCK, FBPase-1 or glucose-6-phosphatase defect would block propionate too.

### 11. GCT_2-pre_mid Q11

A patient with chronic alcohol use presents with confusion and ataxia. Labs show elevated serum lactate, and transketolase activity is decreased in red blood cells. Which of the following best explains the decreased transketolase activity?

A) Inhibition of oxidative phosphorylation  
B) NAD⁺ deficiency  
C) Thiamine pyrophosphate depletion  
D) Acetyl-CoA carboxylase inhibition

**✅ C** — Transketolase needs thiamine pyrophosphate (TPP), and people with alcohol use disorder are often thiamine deficient; low red-cell transketolase activity is the classic test. TPP is also the cofactor of pyruvate dehydrogenase, which explains the raised lactate, and its lack causes Wernicke encephalopathy.

### 12. GCT_2-pre_mid Q12

In the fed state, insulin-stimulated hepatocytes upregulate the oxidative phase of the HMP shunt. Which of the following processes most directly benefits from this shift?

A) Oxidative phosphorylation  
B) Urea synthesis  
C) DNA methylation  
D) De novo fatty acid synthesis  
E) Gluconeogenesis

**✅ D** — The oxidative phase of the HMP shunt produces NADPH, the reducing power for de novo fatty acid (and cholesterol) synthesis in the fed liver. The other processes do not draw on shunt NADPH.

### 13. GCT_2-pre_mid Q13

A 16-year-old boy has a rare mutation in 6-phosphogluconate dehydrogenase. He has no signs of hemolysis, but metabolomic analysis shows reduced flux through the oxidative HMP pathway and decreased ribulose-5-phosphate. Which process is likely impaired?

A) Glutathione recycling in red cells  
B) Nucleotide synthesis in proliferating cells  
C) Acetyl-CoA production in mitochondria  
D) β-oxidation of long-chain fatty acids  
E) Conversion of fumarate to malate

**✅ B** — Ribulose-5-phosphate is isomerized to ribose-5-phosphate, the sugar used to make PRPP and nucleotides, so dividing cells are short of ribose. Glutathione recycling depends on NADPH, mostly from G6PD, and he has no hemolysis.

### 14. GCT_2-pre_mid Q14

A 35-year-old man completes a 72-hour water-only fast. He reports mild fatigue but is alert and oriented, with stable vital signs. Labs: serum glucose 58 mg/dL, insulin low, glucagon high, plasma free fatty acids elevated, lactate 2.8 mmol/L, urine ketones strongly positive. Which enzyme is expected to be most active in hepatocytes to maintain blood glucose at this stage of fasting?

A) Glycogen phosphorylase  
B) Fructose-1,6-bisphosphatase  
C) Hexokinase  
D) Phosphofructokinase-1  
E) Glycogen synthase

**✅ B** — Liver glycogen lasts roughly a day, so after 72 hours blood glucose depends on gluconeogenesis. Glucagon lowers fructose-2,6-bisphosphate, releasing fructose-1,6-bisphosphatase from inhibition. Glycogen phosphorylase dominates only in the early hours of fasting; PFK-1 and glycogen synthase are switched off.

### 15. Glycolysis-cases Q1

A 7-year-old boy has pallor, jaundice and splenomegaly. Labs show normocytic anemia, raised reticulocytes and echinocytes on the smear. Which enzyme defect best explains these findings?

A) Glucose-6-phosphate dehydrogenase  
B) Hexokinase  
C) Phosphofructokinase-1  
D) Pyruvate kinase  
E) Glucose-6-phosphatase

**✅ D** — Echinocytes (burr cells) with chronic non-spherocytic hemolytic anemia and splenomegaly are typical of pyruvate kinase deficiency, the most common glycolytic enzyme defect. G6PD deficiency instead gives bite cells and Heinz bodies after oxidant stress.

### 16. Glycolysis-cases Q2

A 48-year-old man who recently started drinking well water in rural Bangladesh develops confusion, nausea and hyperpigmentation of the palms and soles. He is normoxic but has a lactate of 8 mmol/L. The toxin interferes with ATP generation by substituting for phosphate during glycolysis. Which glycolytic enzyme is most likely affected?

A) Enolase  
B) Hexokinase  
C) Pyruvate kinase  
D) Glyceraldehyde-3-phosphate dehydrogenase (GAPDH)  
E) Aldolase

**✅ D** — Arsenate from contaminated well water replaces phosphate at GAPDH; the product hydrolyzes spontaneously, so the next ATP-producing step is bypassed. Arsenite also inhibits lipoic acid-dependent enzymes such as pyruvate dehydrogenase, which raises lactate.

### 17. Glycolysis-cases Q4

A 22-year-old woman is evaluated for fasting hyperglycemia. She is not obese and has no family history of type 1 diabetes. C-peptide is normal and autoantibodies are negative. Her mother was diagnosed with "mild diabetes" in her 20s. Genetic testing reveals a mutation in the glucokinase gene. What is the most likely pathophysiologic mechanism?

A) Defective GLUT4 transporter in skeletal muscle  
B) Overactivity of PFK-1 in pancreatic β-cells  
C) Impaired glucose sensing → decreased insulin secretion  
D) Decreased ATP production due to hexokinase deficiency  
E) Impaired GLUT2 transporter in hepatocytes

**✅ C** — Glucokinase is the glucose sensor of the β-cell. A heterozygous loss-of-function mutation (MODY2) raises the glucose level needed to trigger insulin release, giving mild, stable fasting hyperglycemia inherited as an autosomal dominant trait.

### 18. Glycolysis-cases Q5

A malnourished 54-year-old man with alcohol use disorder develops generalized weakness after IV glucose is started. His serum phosphate is 0.3 mmol/L (reference 0.81–1.45 mmol/L), and the ECG shows decreased QRS amplitude. Which metabolic process is most directly impaired?

A) Gluconeogenesis  
B) Fatty acid β-oxidation  
C) The glyceraldehyde-3-phosphate dehydrogenase reaction of glycolysis  
D) Pyruvate carboxylase activity  
E) Ketone body formation

**✅ C** — This is refeeding hypophosphatemia: glucose and insulin drive phosphate into cells. GAPDH uses inorganic phosphate as a substrate to make 1,3-bisphosphoglycerate, so very low phosphate slows that step and ATP production, causing muscle weakness and cardiac dysfunction.

### 19. Glycolysis-cases Q6

A 25-year-old athlete runs 400 meters at maximum speed. Shortly afterwards he has intense burning in his legs and fatigue, which subside with rest. What mechanism best explains his symptoms?

A) Accumulation of CO₂ in skeletal muscle  
B) Lactate production → ↓ intracellular pH → inhibition of PFK-1  
C) Accumulation of acetyl-CoA  
D) ATP depletion due to a pyruvate kinase defect  
E) Inhibition of LDH

**✅ B** — In a sprint, muscle makes ATP anaerobically and regenerates NAD⁺ by reducing pyruvate to lactate. The accompanying H⁺ lowers intracellular pH, which inhibits PFK-1 and causes burning and fatigue; lactate is cleared at rest (Cori cycle).

### 20. Glycolysis-cases Q7

A 35-year-old man eats a carbohydrate-rich meal. Insulin rises and stimulates hepatic glycolysis. Which molecule mediates this stimulation?

A) Pyruvate  
B) Fructose-2,6-bisphosphate  
C) Citrate  
D) NADH  
E) ATP

**✅ B** — Insulin dephosphorylates the bifunctional PFK-2/FBPase-2 so its kinase activity makes fructose-2,6-bisphosphate, the most potent activator of hepatic PFK-1 (and an inhibitor of FBPase-1). Citrate and ATP inhibit PFK-1.

### 21. Glycolysis-cases Q8

A patient with chronic anemia has elevated 2,3-bisphosphoglycerate levels. Which physiological advantage does this adaptation confer?

A) Increases hemoglobin's oxygen affinity  
B) Facilitates oxygen release from hemoglobin to tissues  
C) Promotes ATP formation in red cells  
D) Stimulates erythropoietin synthesis  
E) Inhibits the glycolytic rate

**✅ B** — 2,3-BPG binds deoxyhemoglobin and lowers its oxygen affinity (right shift of the dissociation curve), so more oxygen is unloaded in the tissues. This compensates for anemia and high altitude.

### 22. Glycolysis-cases Q9

A 7-year-old child is evaluated after mild fasting hyperglycemia (110–130 mg/dL) was found on several occasions. The child is otherwise healthy, with no polyuria, polydipsia or weight loss. The father also has lifelong mild fasting hyperglycemia that has never needed treatment. What is the most likely cause of this condition?

A) Autoimmune destruction of pancreatic β-cells  
B) Insulin resistance in skeletal muscle and fat  
C) Heterozygous mutation in the glucokinase gene  
D) Deficiency of hepatic glucose-6-phosphatase

**✅ C** — Mild, stable, lifelong fasting hyperglycemia in a well child with an affected parent (autosomal dominant) fits MODY2: a heterozygous glucokinase mutation raises the glucose set point for insulin release. Type 1 diabetes is symptomatic, and glucose-6-phosphatase deficiency causes hypoglycemia.

> ⚠️ **Check:** The source question has no answer options; I wrote the four options.

### 23. Glycolysis-cases Q10

A 43-year-old man with uncontrolled type 1 diabetes is admitted with DKA. Serum glucose is 550 mg/dL, bicarbonate 10 mEq/L, and urine is positive for ketones. Which hepatic enzyme is most inhibited in this metabolic state?

A) Pyruvate carboxylase  
B) Glucose-6-phosphatase  
C) Hexokinase  
D) Phosphofructokinase-1  
E) Pyruvate kinase

**✅ D** — With no insulin and high glucagon, hepatic fructose-2,6-bisphosphate falls and PFK-1, the rate-limiting enzyme of glycolysis, loses its main activator. Pyruvate carboxylase and glucose-6-phosphatase are active, driving gluconeogenesis.

> ⚠️ **Check:** No key in source. Hepatic pyruvate kinase is also switched off by glucagon (phosphorylation), so E is arguable; I chose PFK-1 as the key control point.

### 24. Case study pptx slide 2

Maturity-onset diabetes of the young (MODY) type 2 is caused by a defect in a pancreatic enzyme that normally acts as a glucose sensor, resulting in mild hyperglycemia that is especially exacerbated during pregnancy. Which reaction does this enzyme catalyze?

A) Glucose → glucose-6-phosphate  
B) Glucose-6-phosphate → fructose-6-phosphate  
C) Fructose-6-phosphate → fructose-1,6-bisphosphate  
D) Glyceraldehyde-3-phosphate → 1,3-bisphosphoglycerate  
E) Phosphoenolpyruvate → pyruvate

**✅ A** — The β-cell glucose sensor is glucokinase, which phosphorylates glucose to glucose-6-phosphate. Its high Km means its rate follows blood glucose, which sets the threshold for insulin release.

### 25. Case study pptx slide 3

A mother brings her newborn son to the pediatrician because his skin looks yellow. His lactate dehydrogenase is elevated, haptoglobin is decreased, and the blood smear shows echinocytes (burr cells). He is found to have a decreased ability to convert phosphoenolpyruvate to pyruvate. Which metabolic change is most likely to occur in this patient?

A) Left shift of the oxyhemoglobin curve  
B) Right shift of the oxyhemoglobin curve  
C) Broadening of the oxyhemoglobin curve  
D) Narrowing of the oxyhemoglobin curve  
E) Increased ATP availability

**✅ B** — In pyruvate kinase deficiency upstream intermediates back up, and more 1,3-BPG is diverted into 2,3-BPG (Rapoport–Luebering shunt). 2,3-BPG lowers hemoglobin's oxygen affinity, shifting the curve to the right. ATP availability falls, not rises.

### 26. Case study pptx slide 4

An investigator is measuring the activity of enzymes of intermediary metabolism (glycolysis, TCA cycle, etc.). The activity of one enzyme is greatly decreased compared with reference values. The assay buffer contains sodium citrate. The activity of which enzyme will most likely be directly affected by the citrate?

A) Fructose-2,6-bisphosphatase  
B) Isocitrate dehydrogenase  
C) Phosphofructokinase-1  
D) Pyruvate carboxylase

**✅ C** — Citrate is an allosteric inhibitor of PFK-1: it signals that the TCA cycle is well supplied, so glycolysis slows. Pyruvate carboxylase is activated by acetyl-CoA, and citrate is the precursor of isocitrate rather than an inhibitor of its dehydrogenase.

### 27. Case study pptx slide 5

A 27-year-old man completes a 10K race and drinks a 16-oz sugar-containing drink. His blood glucose rises transiently and insulin is released, which then increases glucose uptake by skeletal muscle. Which glucose transporter is principally involved in this latter process?

A) GLUT1  
B) GLUT2  
C) GLUT3  
D) GLUT4  
E) GLUT5

**✅ D** — Insulin moves GLUT4 from intracellular vesicles to the plasma membrane of skeletal muscle and adipose tissue. GLUT1 and GLUT3 give basal uptake, GLUT2 serves liver, β-cells and kidney, and GLUT5 carries fructose.

### 28. Case study pptx slide 6 (also Glycolysis-MCQ Q8)

Glucose enters human cells through two families of carriers: the facilitative glucose transporters (GLUT) and the sodium-coupled glucose transporters (SGLT). If a patient has a defect in the non-sodium-coupled glucose transporters, which cells are still able to take up glucose?

A) Adipocytes  
B) Enterocytes  
C) Erythrocytes  
D) Hepatocytes  
E) Myocytes

**✅ B** — Enterocytes absorb glucose across their apical membrane by the sodium-coupled SGLT1, so they can still take it up when GLUTs fail. Adipocytes and myocytes (GLUT4), hepatocytes (GLUT2) and erythrocytes (GLUT1) all rely on GLUTs.

### 29. Case study pptx slide 7 (also Glycolysis-MCQ Q3)

A 45-year-old obese man has nocturia and is constantly thirsty and hungry. He is diagnosed with type 2 diabetes mellitus. If the problem is at the level of glucose transporters, which tissue would be most affected?

A) Liver  
B) Red blood cells  
C) Muscle and adipose tissue  
D) Brain tissue  
E) Small intestine

**✅ C** — Insulin-dependent glucose uptake happens through GLUT4, found in skeletal muscle and adipose tissue, so insulin resistance hits these tissues. Liver (GLUT2), red cells (GLUT1) and brain (GLUT1/GLUT3) take up glucose independently of insulin.

### 30. Case study pptx slide 8

A 24-year-old woman is training for her first marathon. Her coach tells her to keep a pace that keeps her below her anaerobic threshold. Under these conditions pyruvate does not accumulate, because it is converted to:

A) Ethanol  
B) Lactic acid  
C) Acetyl-CoA  
D) Alanine  
E) Oxaloacetate

**✅ C** — Below the anaerobic threshold there is enough oxygen for mitochondria to reoxidize NADH, so pyruvate enters the mitochondria and pyruvate dehydrogenase converts it to acetyl-CoA for the TCA cycle. Lactate forms when energy demand outpaces oxygen supply; human cells do not make ethanol.

### 31. Case study pptx slide 9

A patient has dizziness, fatigue and tremors. A fingerstick blood glucose is 45 mg/dL, and glucagon is released. Which change in an allosteric modifier of PFK-1 would be most effective in switching off glycolysis?

A) Low level of citrate  
B) Low level of fructose-2,6-bisphosphate  
C) Low level of ATP  
D) Low level of NAD⁺  
E) Low level of glucose-6-phosphate

**✅ B** — Glucagon raises cAMP; PKA phosphorylates PFK-2/FBPase-2 so the phosphatase activity dominates and fructose-2,6-bisphosphate falls. Losing this strongest activator of PFK-1 switches hepatic glycolysis off and frees FBPase-1 for gluconeogenesis. Low citrate or low ATP would relieve PFK-1 inhibition instead.

### 32. Case study pptx slide 10

A 24-year-old man has shortness of breath, weakness and fatigue. His hemoglobin is 7 g/dL. Red blood cells isolated from him have an abnormally low level of lactate. Deficiency of which enzyme is the most likely cause of his anemia?

A) Phosphoglucose isomerase  
B) Phosphofructokinase  
C) Hexokinase  
D) Glucokinase  
E) Pyruvate kinase

**✅ E** — Low red-cell lactate means glycolysis is running slowly, and pyruvate kinase deficiency is by far the most common glycolytic enzyme defect causing hemolytic anemia. Glucokinase is not present in red cells; the other enzyme deficiencies are much rarer.

> ⚠️ **Check:** No key in source. Hexokinase, PFK and phosphoglucose isomerase deficiencies would also lower red-cell lactate; pyruvate kinase is chosen as the most common cause.

### 33. Case study pptx slide 11

Which TCA cycle intermediate, when it builds up, inhibits the rate-limiting enzyme of glycolysis?

A) α-Ketoglutarate  
B) Citrate  
C) Malate  
D) Oxaloacetate  
E) Succinyl-CoA

**✅ B** — When energy is plentiful, citrate (formed from acetyl-CoA and oxaloacetate) leaves the mitochondria and allosterically inhibits PFK-1, the rate-limiting enzyme of glycolysis.

> ⚠️ **Check:** The slide asks this using a lettered TCA-cycle diagram (B = citrate). I rewrote the options as named intermediates so no picture is needed.

### 34. Case study pptx slide 12

Which of the following cells are completely dependent on anaerobic glycolysis?

A) Heart muscle cells  
B) Liver cells  
C) Adipose cells  
D) Red blood cells

**✅ D** — Mature red blood cells have no mitochondria, so they depend entirely on anaerobic glycolysis and release lactate. Heart, liver and fat cells have mitochondria and oxidize fuels aerobically.

### 35. Case study pptx slide 13

Which enzyme catalyzes the reaction that traps glucose inside the cell?

A) Phosphoglucose isomerase  
B) Aldolase  
C) Hexokinase  
D) Phosphofructokinase

**✅ C** — Hexokinase (glucokinase in the liver) phosphorylates glucose to glucose-6-phosphate. The charged phosphate cannot cross the membrane and there is no transporter for it, so glucose is trapped.

### 36. Case study pptx slide 14

Which statement about glycolysis is correct?

A) Glycolysis is the only source of energy for brain cells  
B) Glycolysis stops under anaerobic conditions  
C) Glycolysis takes place in the mitochondria  
D) Glycolysis is negatively regulated by ATP

**✅ D** — ATP allosterically inhibits PFK-1 and pyruvate kinase, so a high energy charge slows glycolysis. Glycolysis runs in the cytosol, continues anaerobically by making lactate, and the brain can also use ketone bodies in starvation.

### 37. Case study pptx slide 15

Which glycolytic enzyme catalyzes an oxidation–reduction reaction?

A) Glyceraldehyde-3-phosphate dehydrogenase  
B) Phosphofructokinase-1  
C) Phosphoglycerate mutase  
D) Aldolase

**✅ A** — GAPDH oxidizes glyceraldehyde-3-phosphate to 1,3-bisphosphoglycerate while reducing NAD⁺ to NADH, the only redox step of glycolysis. The others are a kinase, a mutase and a lyase.

### 38. Case study pptx slide 16

Which of the following can cause inhibition of glycolysis?

A) High blood insulin levels  
B) High intracellular ATP levels  
C) Low blood glucagon levels  
D) All of the above

**✅ B** — High ATP inhibits PFK-1 and pyruvate kinase. Insulin stimulates glycolysis (it raises fructose-2,6-bisphosphate and induces glucokinase) and low glucagon has the same effect, so "all of the above" is wrong.

> ⚠️ **Check:** No key in source. "All of the above" may have been the intended answer, but insulin and low glucagon stimulate glycolysis, so only B is correct.

### 39. Glycolysis-MCQ Q1

Which of the following enzymes catalyzes a rate-controlling step of glycolysis?

A) Enolase  
B) Glucokinase  
C) Citrate synthase  
D) Malate dehydrogenase

**✅ B** — PFK-1 is the main rate-limiting enzyme of glycolysis, but of the options only glucokinase (hexokinase IV) catalyzes an irreversible, regulated step of glycolysis. Enolase is a reversible step, and citrate synthase and malate dehydrogenase belong to the TCA cycle.

> ⚠️ **Check:** Source stem asked for "the rate limiting step"; PFK-1 is not among the options, so I changed it to "a rate-controlling step" so glucokinase is correct.

### 40. Glycolysis-MCQ Q2

Which glycolytic enzyme is inhibited by citrate?

A) Hexokinase  
B) Glucokinase  
C) PFK-1  
D) Pyruvate kinase

**✅ C** — Citrate leaving the mitochondria signals plentiful fuel and allosterically inhibits PFK-1, reinforcing ATP inhibition. Hexokinase is inhibited by glucose-6-phosphate, and pyruvate kinase by ATP and alanine.

### 41. Glycolysis-MCQ Q4

Which glucose transporter is found in red blood cells?

A) GLUT1  
B) GLUT2  
C) GLUT5  
D) GLUT4

**✅ A** — Red blood cells take up glucose independently of insulin through GLUT1, which is very abundant in their membrane. GLUT2 is in liver, β-cells and kidney, GLUT4 in muscle and fat, and GLUT5 transports fructose.

### 42. Glycolysis-MCQ Q6

Which of the following enzymes generates ATP during glycolysis?

A) Glucokinase  
B) Enolase  
C) Aldolase  
D) Pyruvate kinase

**✅ D** — Pyruvate kinase transfers phosphate from phosphoenolpyruvate to ADP, a substrate-level phosphorylation (phosphoglycerate kinase is the other ATP-producing step). Glucokinase consumes ATP; enolase and aldolase neither use nor make it.

### 43. Glycolysis-MCQ Q7

Which of the following is an activator of pyruvate kinase?

A) ATP  
B) GTP  
C) Citrate  
D) Fructose-1,6-bisphosphate

**✅ D** — Fructose-1,6-bisphosphate, the product of PFK-1, feed-forward activates pyruvate kinase so the lower half of glycolysis keeps pace. ATP and alanine inhibit pyruvate kinase.

### 44. Glycolysis-MCQ Q9

Deficiency of which enzyme leads to hemolytic anemia?

A) Glucokinase  
B) Pyruvate kinase  
C) Phosphoglucomutase  
D) Phosphofructokinase

**✅ B** — Red cells rely on glycolysis for ATP, and pyruvate kinase deficiency is the most common glycolytic enzyme defect causing chronic hemolytic anemia. Glucokinase is not expressed in red cells, and phosphoglucomutase belongs to glycogen metabolism.

### 45. Glycolysis-MCQ Q10

A 32-year-old woman who is 30 weeks pregnant has a blood glucose of 180 mg/dL (normal below 110). She has no symptoms of hyperglycemia and feels well. Her physician suspects deficiency of an enzyme of glucose metabolism. Which enzyme is probably deficient?

A) Pyruvate kinase  
B) Glucokinase  
C) Glucose-6-phosphate dehydrogenase  
D) Aldolase B

**✅ B** — Asymptomatic mild hyperglycemia unmasked by the insulin resistance of pregnancy suggests MODY2: heterozygous loss of the β-cell glucose sensor glucokinase raises the glucose threshold for insulin release. Pyruvate kinase and G6PD defects cause hemolysis; aldolase B deficiency causes fructose intolerance.

### 46. Glycogen MCQ Q1

Which of the following is important for lysosomal glycogen degradation?

A) Glycogen phosphorylase  
B) Glucocerebrosidase  
C) Galactocerebrosidase  
D) α(1→4)-Glucosidase  
E) Acid lactase

**✅ D** — Lysosomal acid α(1→4)-glucosidase (acid maltase) degrades glycogen taken into lysosomes; its deficiency is Pompe disease (type II). Glucocerebrosidase and galactocerebrosidase are sphingolipid enzymes (Gaucher and Krabbe diseases).

### 47. Glycogen MCQ Q2

Which enzyme cleaves α(1→4) glycosidic bonds of glycogen during glycogenolysis?

A) Glycogen synthase  
B) Glycogen phosphorylase  
C) Glycogen debranching enzyme  
D) Glycogen carboxylase  
E) Glycogen kinase

**✅ B** — Glycogen phosphorylase breaks α(1→4) bonds by phosphorolysis, releasing glucose-1-phosphate until four residues from a branch point. Debranching enzyme moves a short chain and hydrolyzes the α(1→6) bond; glycogen synthase makes α(1→4) bonds.

### 48. Glycogen MCQ Q3

Which of the following enzymes is absent in skeletal muscle?

A) Hexokinase  
B) Pyruvate carboxylase  
C) Pyruvate kinase  
D) Glucose-6-phosphatase  
E) Branching enzyme

**✅ D** — Skeletal muscle lacks glucose-6-phosphatase, so glucose-6-phosphate from its glycogen stays in the muscle for its own glycolysis and cannot be released into the blood.

### 49. Glycogen MCQ Q4

An 18-year-old man has exercise intolerance. His muscles become stiff or weak during exercise, he sometimes cramps, and at times his urine is reddish-brown afterwards. An ischemic forearm exercise test shows very low lactate production. Which enzyme defect is most likely?

A) Muscle glycogen phosphorylase  
B) Liver glycogen phosphorylase  
C) Liver PFK-1  
D) Muscle glucose-6-phosphatase

**✅ A** — Cramps, myoglobinuria and no lactate rise on ischemic exercise point to McArdle disease (type V): muscle glycogen phosphorylase is missing, so muscle glycogen cannot feed glycolysis. Muscle has no glucose-6-phosphatase anyway, and liver enzymes do not affect muscle.

### 50. Glycogen MCQ Q5

Which enzyme is deficient in von Gierke disease?

A) Glucose-6-phosphatase  
B) Debranching enzyme  
C) Glycogen phosphorylase  
D) Galactocerebrosidase  
E) Branching enzyme

**✅ A** — Von Gierke disease (type Ia) is glucose-6-phosphatase deficiency, causing severe fasting hypoglycemia, lactic acidosis, hyperuricemia, hyperlipidemia and hepatomegaly. Debranching enzyme deficiency is Cori disease, branching enzyme Andersen disease, and liver phosphorylase Hers disease.

### 51. Glycogen MCQ Q8

Which enzyme releases the first free glucose during glycogenolysis?

A) Glycogen phosphorylase  
B) Glycogen phosphatase  
C) Debranching enzyme  
D) Glucose-6-phosphatase  
E) Branching enzyme

**✅ C** — Phosphorylase releases glucose-1-phosphate, not free glucose. The α(1→6)-glucosidase activity of debranching enzyme hydrolyzes the single glucose left at each branch point, releasing free glucose directly from glycogen.

### 52. Glycogen MCQ Q9

Deficiency of which enzyme is associated with hyperuricemia, lactic acidosis and hyperalaninemia?

A) Muscle glycogen phosphorylase  
B) Very-long-chain acyl-CoA dehydrogenase  
C) Lysosomal acid maltase  
D) Glucose-6-phosphatase  
E) Glycogen debranching enzyme

**✅ D** — In von Gierke disease glucose-6-phosphate cannot be released as glucose, so it is pushed into glycolysis (lactate, pyruvate → alanine) and the pentose phosphate pathway (more purine turnover → uric acid). Lactate also competes with urate for renal excretion.

### 53. Glycogen MCQ Q10

Which of the following glycogen storage diseases is muscle-specific?

A) Von Gierke disease  
B) Pompe disease  
C) Cori disease  
D) McArdle disease  
E) Hers disease

**✅ D** — McArdle disease (type V), deficiency of muscle glycogen phosphorylase, affects only skeletal muscle. Von Gierke, Cori and Hers diseases involve the liver, and Pompe disease is lysosomal and affects heart and muscle throughout the body.

### 54. carbohydrates-lecture image Q1

A 45-year-old man has newly diagnosed diabetes mellitus. His endocrinologist recommends a medication that alters hepatic glucose metabolism by increasing the concentration of fructose-2,6-bisphosphate in hepatocytes. Which conversion will be inhibited by high intracellular levels of this metabolite?

A) Acetyl-CoA → fatty acids  
B) Alanine → glucose  
C) Fructose-6-phosphate → fructose-1,6-bisphosphate  
D) Glucose → glycogen  
E) NAD⁺ → NADH

**✅ B** — Fructose-2,6-bisphosphate activates PFK-1 and inhibits fructose-1,6-bisphosphatase, so high levels suppress gluconeogenesis, including making glucose from alanine, and lower hepatic glucose output. The fructose-6-phosphate → fructose-1,6-bisphosphate step is stimulated, not inhibited.

### 55. carbohydrates-lecture image Q2

A 31-year-old fitness trainer lifts weights recreationally. The rate of glycogenolysis in myocytes increases several hundredfold during active skeletal muscle contraction. Which substance is most likely responsible for increasing the reaction rate during active contraction?

A) ATP  
B) Ca²⁺  
C) cAMP  
D) Glucose-6-phosphate  
E) Lactate

**✅ B** — Ca²⁺ released from the sarcoplasmic reticulum during contraction binds calmodulin, a subunit of phosphorylase kinase, and activates it without any hormone, so glycogenolysis keeps pace with contraction. ATP and glucose-6-phosphate inhibit muscle phosphorylase.

### 56. carbohydrates-lecture image Q3

Researchers count the glucose transporters on the surface of two cell types at increasing serum insulin concentrations. In the first cell type (circles) the number of surface transporters rises steeply as insulin rises; in the second (triangles) it stays the same at every insulin concentration. Which cell types are most likely represented by the circles and the triangles, respectively?

A) Adipocytes and skeletal muscle cells  
B) Hepatocytes and cortical pyramidal cells  
C) Hepatocytes and renal tubular cells  
D) Pancreatic β-cells and intestinal epithelial cells  
E) Skeletal muscle cells and renal tubular cells

**✅ E** — Only skeletal muscle and adipose tissue move GLUT4 to the surface in response to insulin, so the circles must be one of these. Renal tubular cells take up glucose through SGLT and GLUT2 independently of insulin. Option A has two insulin-responsive cell types; the other pairs have none.

> ⚠️ **Check:** The source shows the results as a graph; I described the graph in the stem so no picture is needed.

### 57. carbohydrates-lecture image Q4

An 8-year-old boy has fatigue, muscle pain and cramps during exercise and severe stiffness after strenuous activity. On an ischemic forearm exercise test, blood lactate does not rise. A muscle biopsy shows absent lactate dehydrogenase activity. In this patient, strenuous exercise inhibits glycolysis in skeletal muscle because of intracellular depletion of which substance?

A) AMP  
B) Carnitine  
C) Citrate  
D) FADH₂  
E) NAD⁺  
F) Pyruvate

**✅ E** — Without lactate dehydrogenase, muscle cannot reoxidize NADH by reducing pyruvate to lactate during anaerobic exercise. Cytosolic NAD⁺ runs out and the GAPDH step of glycolysis stops, which is also why lactate does not rise.

### 58. carbohydrates-lecture image Q5

A 15-year-old boy has poor exercise endurance: after a few weightlifting repetitions his arms "feel like jelly", and he sometimes has severe cramps and discolored urine after intense effort. His exercise tolerance improves greatly if he drinks an oral glucose solution beforehand. He is most likely deficient in an enzyme that catalyzes which conversion?

A) Muscle glycogen → glucose-1-phosphate  
B) Glucose-1-phosphate ⇌ glucose-6-phosphate  
C) Glucose-6-phosphate → glucose  
D) Glucose-6-phosphate → 6-phosphogluconate  
E) Glucose-6-phosphate ⇌ fructose-6-phosphate

**✅ A** — Cramps and myoglobinuria with early fatigue that improves with oral glucose fit McArdle disease: muscle glycogen phosphorylase cannot release glucose-1-phosphate from glycogen, but glucose from the blood can still feed glycolysis.

> ⚠️ **Check:** The source labels the conversions A–E on a diagram; I wrote each conversion into its option so no picture is needed.

### 59. carbohydrates-lecture image Q6

A healthy 34-year-old coal miner is trapped underground after a tunnel collapse. He has water but has eaten nothing for over 30 hours, and rescue takes 2 days. He feels dizzy and weak; fingerstick glucose is 78 mg/dL. Which reaction is most likely responsible for maintaining his current blood glucose?

A) Acetoacetyl-CoA → 3-hydroxy-3-methylglutaryl-CoA  
B) Acetyl-CoA → palmitic acid  
C) Fructose-6-phosphate → fructose-1,6-bisphosphate  
D) Glycogen → glucose-1-phosphate  
E) Oxaloacetate → phosphoenolpyruvate

**✅ E** — After more than 30 hours without food, liver glycogen is largely used up, so blood glucose is maintained by gluconeogenesis, of which PEP carboxykinase (oxaloacetate → phosphoenolpyruvate) is a bypass step. HMG-CoA formation is ketogenesis, and palmitate synthesis and PFK-1 are fed-state reactions.

### 60. carbohydrates-lecture Q (myophosphorylase)

A 12-year-old boy has two days of tea-colored urine that began with his first day of junior high football practice, where he tired quickly and had muscle pain after drills. Creatine kinase and myoglobin are elevated. A muscle biopsy shows large glycogen deposits and absent myophosphorylase activity. Which reaction is not occurring in this patient?

A) Converting glucose-6-phosphate to glucose  
B) Breaking down glycogen to glucose-1-phosphate  
C) Cleaving α-1,6 glycosidic bonds of glycogen  
D) Creating α-1,6 glycosidic bonds in glycogen

**✅ B** — Myophosphorylase (McArdle disease) normally breaks α(1→4) bonds by phosphorolysis, releasing glucose-1-phosphate from glycogen. Cleaving α-1,6 bonds is the debranching enzyme, creating them is the branching enzyme, and glucose-6-phosphatase is absent from muscle anyway.

### 61. Cases for 5th lecture image 1

A 45-year-old man comes for a routine examination. He drinks 5–6 alcoholic drinks per day. His plasma glucose is 40 mg/dL. Which metabolic alteration is most likely a consequence of his alcohol consumption?

A) Increased conversion of glycerol-3-phosphate to dihydroxyacetone phosphate  
B) Increased conversion of malate to oxaloacetate  
C) Increased conversion to ketone bodies  
D) Increased conversion of pyruvate to lactate  
E) Increased oxidation of fatty acids

**✅ D** — Ethanol metabolism by alcohol and aldehyde dehydrogenases raises the cytosolic NADH/NAD⁺ ratio. Excess NADH pushes pyruvate to lactate, oxaloacetate to malate and DHAP to glycerol-3-phosphate, draining gluconeogenic substrates and causing hypoglycemia. Options A and B run in the opposite direction, and high NADH inhibits fatty acid oxidation.

### 62. Cases for 5th lecture image 3

A 38-year-old man collapses while running a marathon. His wife says he is not in shape but decided to run anyway. Arterial blood gas on room air shows PO₂ 100 mm Hg, PCO₂ 42 mm Hg and pH 7.30, with a high anion gap metabolic acidosis. Increased activity of which pathway is the basis of these findings?

A) Anaerobic glycolysis  
B) β-Oxidation of fatty acids  
C) Citric acid cycle  
D) Mitochondrial oxidative phosphorylation  
E) Pentose phosphate shunt

**✅ A** — Normal PO₂ with a high anion gap acidosis after exhausting exercise in an unfit man is lactic acidosis: muscle outran its oxygen supply and relied on anaerobic glycolysis, reducing pyruvate to lactate. β-oxidation, the citric acid cycle and oxidative phosphorylation need oxygen and do not make lactate.

### 63. Cases for 5th lecture image 5

A 38-year-old obese man has been on a strict diet with very little carbohydrate to lose weight. His examination is normal and his blood glucose is low-normal. What is the source of most of his newly synthesized glucose?

A) Amino acids from protein degradation  
B) Ethanol synthesized by bacteria  
C) Fatty acids from fat breakdown  
D) Glycerol from fat breakdown  
E) Purine catabolism

**✅ A** — With carbohydrate restricted, most new glucose is made from amino acids (mainly alanine and glutamine) released by protein breakdown. Glycerol from triglycerides contributes a smaller share, and even-chain fatty acids give no net glucose because acetyl-CoA cannot be converted to pyruvate.

> ⚠️ **Check:** No key in source. Glycerol (D) is also a real substrate; amino acids are chosen as the largest source, as in the usual board answer.

### 64. GCT_2 Q1

A 6-month-old infant is brought in for poor feeding and delayed motor development, with increasing weakness and episodes of pallor. Examination shows hypotonia and diminished deep tendon reflexes. Labs reveal hemolytic anemia with raised reticulocytes and indirect bilirubin. Dihydroxyacetone phosphate (DHAP) accumulates because it cannot be converted to glyceraldehyde-3-phosphate. Progressive neurodegeneration is expected. Which enzyme deficiency is the most likely cause?

A) Pyruvate kinase  
B) Triosephosphate isomerase  
C) Glucokinase  
D) Succinate dehydrogenase

**✅ B** — Triosephosphate isomerase interconverts DHAP and glyceraldehyde-3-phosphate. Its deficiency makes DHAP pile up and halves glycolytic ATP yield, causing hemolytic anemia with progressive neuromuscular disease in infancy. Pyruvate kinase deficiency causes hemolysis without neurodegeneration.

### 65. GCT_2 Q3

A 2-month-old boy has poor feeding, recurrent vomiting, progressive lethargy and poor weight gain on regular formula. Examination shows jaundice, hepatomegaly and bilateral lens clouding, with poor visual tracking. Blood cultures grow Escherichia coli. Labs show raised transaminases and reducing substances in the urine despite a negative urine glucose test. Which enzyme deficiency is the most likely cause?

A) Aldolase B  
B) Galactokinase  
C) Galactose-1-phosphate uridyltransferase  
D) Fructokinase  
E) Glucose-6-phosphatase

**✅ C** — Liver disease, cataracts, E. coli sepsis and urinary reducing sugar that is not glucose in a milk-fed infant are classic galactosemia from GALT deficiency; galactose-1-phosphate accumulates and damages the liver, brain and kidney. Galactokinase deficiency causes cataracts only, and aldolase B deficiency appears after fructose or sucrose.

### 66. GCT_2 Q4

During prolonged fasting, adipose tissue releases glycerol into the blood. In the liver, glycerol must first be converted into which molecule before entering gluconeogenesis?

A) Dihydroxyacetone phosphate  
B) Glycerol-3-phosphate  
C) Pyruvate  
D) Acetyl-CoA

**✅ B** — Hepatic glycerol kinase (absent from adipose tissue) first phosphorylates glycerol to glycerol-3-phosphate; glycerol-3-phosphate dehydrogenase then oxidizes it to DHAP, which enters gluconeogenesis.

### 67. GCT_2 Q5

Which statement best describes the glucose–alanine cycle?

A) Alanine carries oxygen from the liver to muscle  
B) Alanine carries fatty acids to muscle  
C) Muscle sends alanine to the liver for gluconeogenesis and nitrogen disposal  
D) The liver sends alanine to adipose tissue for ketogenesis

**✅ C** — Muscle transaminates pyruvate to alanine, which carries both carbon and amino nitrogen to the liver. There the carbon is used for gluconeogenesis and the nitrogen goes into urea; the glucose returns to muscle.

### 68. GCT_2 Q6

In hyperglycemia, excess glucose is converted to sorbitol in certain tissues. Which enzyme catalyzes this reaction?

A) Sorbitol dehydrogenase  
B) Aldose reductase  
C) Hexokinase  
D) Glucokinase

**✅ B** — Aldose reductase reduces glucose to sorbitol using NADPH; sorbitol dehydrogenase then oxidizes sorbitol to fructose.

### 69. GCT_2 Q7

Accumulation of sorbitol in the lens leads most directly to which complication?

A) Retinal detachment  
B) Cataracts  
C) Glaucoma  
D) Macular degeneration

**✅ B** — Sorbitol cannot cross cell membranes, so where it accumulates in the lens it draws in water osmotically, causing swelling and opacity: cataract.

### 70. GCT_2 Q8

Why does sorbitol accumulate in the lens during chronic hyperglycemia?

A) High sorbitol dehydrogenase activity  
B) Lack of aldose reductase  
C) Low sorbitol dehydrogenase activity  
D) Increased insulin levels

**✅ C** — The lens, retina, Schwann cells and kidney have aldose reductase but little sorbitol dehydrogenase, so sorbitol made during hyperglycemia cannot be converted on to fructose and is trapped.

### 71. GCT_2 Q9

A 40-year-old man with alcohol use disorder presents with hypoglycemia after a 48-hour fast. His liver function is normal. Which of the following is a common intermediate in the conversion of both glycerol and lactate to glucose?

A) Pyruvate  
B) Oxaloacetate  
C) Malate  
D) Fructose-6-phosphate

**✅ D** — Glycerol enters gluconeogenesis at DHAP and lactate at pyruvate. Their paths join at the triose phosphates, so everything from fructose-1,6-bisphosphate onward, including fructose-6-phosphate, is shared; pyruvate, oxaloacetate and malate lie only on the lactate route.

> ⚠️ **Check:** No key in source. I dropped the source sentence "Gluconeogenesis is impaired due to depletion of a key substrate" because it does not lead to any option.

### 72. GCT_2 Q10

A 4-year-old girl has a protuberant abdomen and episodes of lethargy, and often wakes up irritable and sweaty. Examination reveals massive hepatomegaly without splenomegaly. Labs show severe fasting hypoglycemia, lactic acidosis, hyperuricemia and hypertriglyceridemia. Which enzyme deficiency is most likely responsible?

A) Glucose-6-phosphatase  
B) Muscle glycogen phosphorylase  
C) Liver glycogen phosphorylase  
D) Debranching enzyme

**✅ A** — Fasting hypoglycemia with lactic acidosis, hyperuricemia, hypertriglyceridemia and massive hepatomegaly is von Gierke disease (glucose-6-phosphatase deficiency). Liver phosphorylase or debranching enzyme deficiency gives milder hypoglycemia without lactic acidosis or hyperuricemia.

### 73. GCT_2 Q11 (also Cases for 5th lecture image 2)

A 3-month-old boy has progressive muscle weakness, hypotonia, cardiomegaly and hypertrophic cardiomyopathy. He has a "floppy baby" appearance and difficulty feeding. Which enzyme is deficient in this disorder?

A) Glucose-6-phosphatase  
B) Acid maltase  
C) Liver phosphorylase  
D) Muscle phosphorylase  
E) Debranching enzyme

**✅ B** — Infantile Pompe disease (type II): lysosomal acid maltase (acid α-1,4-glucosidase) is missing, so glycogen builds up in lysosomes of heart and skeletal muscle, causing cardiomegaly and hypotonia. Blood glucose is normal because cytosolic glycogen breakdown still works.

### 74. GCT_2 Q12

A 4-year-old girl with hereditary fructose intolerance accidentally eats a candy containing sucrose. Which metabolite would be expected to accumulate in her liver?

A) Fructose-6-phosphate  
B) Fructose-1,6-bisphosphate  
C) Fructose-1-phosphate  
D) Glucose-1-phosphate

**✅ C** — Sucrose is split into glucose and fructose. Without aldolase B, fructose-1-phosphate made by fructokinase accumulates, trapping phosphate, depleting ATP and inhibiting glycogenolysis and gluconeogenesis, which causes hypoglycemia.

### 75. GCT_2 Q13

A newborn has poor feeding, vomiting, jaundice, hepatomegaly and failure to thrive after starting milk-based formula. A urine dipstick is negative for glucose but positive for reducing substances. Which enzyme deficiency is most likely?

A) Galactokinase  
B) Galactose-1-phosphate uridyltransferase (GALT)  
C) UDP-galactose-4-epimerase  
D) Aldolase B

**✅ B** — Symptoms beginning with milk feeding, with liver involvement and urinary reducing sugar that is not glucose, are classic galactosemia from GALT deficiency. Galactokinase deficiency causes only cataracts, and aldolase B deficiency is triggered by fructose.

### 76. GCT_2 Q14

Which of the following is a gluconeogenic substrate in humans?

A) Acetyl-CoA derived from palmitate  
B) Glycerol  
C) Acetoacetate  
D) Cholesterol

**✅ B** — Glycerol from triglyceride breakdown is converted to DHAP and gives net glucose. Acetyl-CoA from even-chain fatty acids, ketone bodies and cholesterol cannot, because the pyruvate dehydrogenase reaction is irreversible.

### 77. GCT_2 Q15

Which enzyme uses ATP in the first step of glycolysis in the liver?

A) Hexokinase  
B) Glucokinase  
C) Enolase  
D) Phosphoglycerate kinase

**✅ B** — In hepatocytes glucose is phosphorylated by glucokinase (hexokinase IV), using ATP. Hexokinases I–III serve most other tissues; phosphoglycerate kinase makes ATP rather than using it, and enolase does not involve ATP.

> ⚠️ **Check:** Source asked "which liver enzyme is ATP dependent during glycolysis"; hexokinase is also ATP-dependent, so I made the stem specific to the first step in the liver.

### 78. GCT_2 Q16

A researcher studies glycolysis in isolated hepatocytes under anaerobic conditions, measuring intermediates and cofactors. Which step of glycolysis directly generates NADH?

A) Fructose-6-phosphate → fructose-1,6-bisphosphate  
B) Glyceraldehyde-3-phosphate → 1,3-bisphosphoglycerate  
C) 3-Phosphoglycerate → 2-phosphoglycerate  
D) Phosphoenolpyruvate → pyruvate

**✅ B** — Glyceraldehyde-3-phosphate dehydrogenase oxidizes glyceraldehyde-3-phosphate to 1,3-bisphosphoglycerate and reduces NAD⁺ to NADH, the only NADH-producing step of glycolysis. Under anaerobic conditions LDH reoxidizes this NADH.

### 79. GCT_2 Q17

A 2-week-old infant has poor feeding, vomiting and jaundice after starting milk-based formula, and bilateral cataracts. Classic galactosemia due to GALT deficiency is diagnosed. Galactitol formation in the lens depletes which cofactor?

A) ATP  
B) NADPH  
C) FADH₂  
D) Coenzyme A

**✅ B** — Aldose reductase reduces galactose to galactitol using NADPH. In galactosemia this drains lens NADPH (needed to keep glutathione reduced) while galactitol draws in water, and both contribute to cataracts.

### 80. cases for meeting Q1

A 22-year-old medical student on a ketogenic diet for two weeks has fatigue and difficulty concentrating. Labs show mild fasting hypoglycemia and a markedly decreased serum serine. Which glycolytic intermediate is most likely depleted, reducing serine synthesis?

A) Fructose-1,6-bisphosphate  
B) Glucose-6-phosphate  
C) 3-Phosphoglycerate  
D) Phosphoenolpyruvate  
E) Pyruvate

**✅ C** — Serine is made from the glycolytic intermediate 3-phosphoglycerate (oxidation, transamination, then dephosphorylation). With carbohydrate restricted, less 3-phosphoglycerate is available for serine synthesis.

### 81. cases for meeting Q3

A 32-year-old African American man develops fatigue, dark urine and jaundice after starting sulfamethoxazole–trimethoprim. The peripheral smear shows Heinz bodies. Which enzyme is most likely deficient?

A) Pyruvate kinase  
B) Glucose-6-phosphate dehydrogenase (G6PD)  
C) Fructokinase  
D) Transketolase

**✅ B** — G6PD makes the NADPH that keeps glutathione reduced. Oxidant drugs such as sulfonamides then damage red cells, giving Heinz bodies (denatured hemoglobin) and bite cells. Pyruvate kinase deficiency causes hemolysis without Heinz bodies, and fructokinase deficiency is benign fructosuria.

### 82. cases for meeting Q4

A 45-year-old man with alcohol use disorder has confusion, ataxia and ophthalmoplegia. MRI shows hyperintense mammillary bodies. Deficiency of the cofactor of which enzyme impairs two-carbon transfer in the pentose phosphate pathway?

A) Transaldolase  
B) G6PD  
C) Transketolase  
D) Lactate dehydrogenase

**✅ C** — This is Wernicke encephalopathy from thiamine deficiency. Thiamine pyrophosphate is the cofactor of transketolase, which transfers two-carbon units in the non-oxidative HMP shunt; transaldolase transfers three-carbon units and needs no TPP.

### 83. cases for meeting Q5

A medical student drinks high-fructose corn syrup daily for 4 weeks, and her serum triglycerides rise. Fructose metabolism bypasses which key regulatory enzyme of glycolysis, leading to unregulated lipogenesis?

A) Hexokinase  
B) Pyruvate kinase  
C) Phosphofructokinase-1 (PFK-1)  
D) Enolase

**✅ C** — In the liver fructose → fructose-1-phosphate → DHAP and glyceraldehyde, which enter glycolysis below PFK-1. Skipping this main control point gives unregulated flux to acetyl-CoA and de novo lipogenesis, raising triglycerides.

### 84. cases for meeting Q6

A 4-month-old infant develops vomiting, lethargy and hypoglycemia 2 hours after drinking fruit juice. Examination shows jaundice and hepatomegaly, and liver biopsy shows fructose-1-phosphate accumulation. What is the diagnosis?

A) Essential fructosuria  
B) Hereditary fructose intolerance  
C) Fructose-1,6-bisphosphatase deficiency  
D) Galactosemia

**✅ B** — Hereditary fructose intolerance (aldolase B deficiency): fructose-1-phosphate accumulates, traps phosphate and depletes ATP, blocking glycogenolysis and gluconeogenesis. Essential fructosuria (fructokinase deficiency) is benign, and galactosemia is triggered by lactose.

### 85. cases for meeting Q11

A 4-month-old infant has severe hypoglycemia, lactic acidosis and hepatomegaly. Liver biopsy shows massive glycogen accumulation. Which pair of pathways is most directly disrupted?

A) Glycogenolysis and gluconeogenesis  
B) Glycolysis and gluconeogenesis  
C) Urea cycle and TCA cycle  
D) Heme synthesis and bilirubin metabolism

**✅ A** — This is von Gierke disease (glucose-6-phosphatase deficiency). Glucose-6-phosphate → glucose is the final step of both glycogenolysis and gluconeogenesis, so both fail, causing severe fasting hypoglycemia, lactic acidosis, hyperuricemia and hyperlipidemia.

### 86. cases for meeting Q12

A 55-year-old man with diabetes accidentally overdoses on insulin and develops severe hypoglycemia. His liver activates gluconeogenesis. Which molecule favors fructose-1,6-bisphosphatase (FBPase-1) activity to promote gluconeogenesis?

A) NADPH  
B) Fructose-2,6-bisphosphate  
C) ATP  
D) GMP

**✅ C** — A high energy charge (high ATP, low AMP) favors gluconeogenesis: AMP inhibits FBPase-1, and ATP inhibits PFK-1. Fructose-2,6-bisphosphate does the opposite, inhibiting FBPase-1 and activating PFK-1.

> ⚠️ **Check:** Key in source: ATP. Strictly ATP is not a classic allosteric activator of FBPase-1 (the textbook regulators are inhibition by AMP and fructose-2,6-bisphosphate). I kept ATP as the best of the options and softened "activates" to "favors".

### 87. cases for meeting Q14

What is the function of the malate shuttle in gluconeogenesis?

A) To transfer NADH and oxaloacetate into the mitochondria  
B) To transfer NADH and oxaloacetate out of the mitochondria  
C) To transfer NADH in and oxaloacetate out of the mitochondria  
D) To transfer NADH out and oxaloacetate into the mitochondria

**✅ B** — Oxaloacetate made by pyruvate carboxylase cannot cross the inner mitochondrial membrane, so it is reduced to malate, which leaves and is reoxidized to oxaloacetate in the cytosol. That also produces cytosolic NADH for the GAPDH step, so both oxaloacetate and reducing equivalents move out. The malate–aspartate shuttle of aerobic glycolysis runs the other way, bringing NADH equivalents in.

> ⚠️ **Check:** THE SOURCE KEY SAYS C ("NADH in and oxaloacetate out"). I think that mixes two different shuttles, so I keyed B and added "in gluconeogenesis" to the stem. Please confirm or change it to C.

### 88. cases for meeting Q18

A dentist applies topical fluoride to prevent caries. Which glycolytic enzyme does fluoride inhibit?

A) Hexokinase  
B) Enolase  
C) Pyruvate kinase  
D) Glyceraldehyde-3-phosphate dehydrogenase

**✅ B** — Fluoride inhibits enolase (2-phosphoglycerate → phosphoenolpyruvate), which reduces acid production by oral bacteria. It is also why blood glucose samples are collected in fluoride tubes. Arsenate acts at GAPDH.

### 89. cases for meeting Q21

A 36-year-old Mediterranean man develops hemolysis after starting rifampin and isoniazid. The peripheral smear shows bite cells and Heinz bodies. What is the primary biochemical defect?

A) Failure of the Rapoport–Luebering shunt  
B) Inability to maintain reduced glutathione (GSH)  
C) Deficiency of pyruvate kinase  
D) Impaired α-globin chain synthesis

**✅ B** — This is G6PD deficiency. Without G6PD the red cell cannot make enough NADPH to keep glutathione reduced, so oxidant drugs damage hemoglobin and membranes, producing Heinz bodies and bite cells.

### 90. cases for meeting Q25

Which glucose transporter has the lowest affinity for glucose (highest Km)?

A) GLUT1  
B) GLUT2  
C) GLUT3  
D) GLUT4  
E) GLUT5

**✅ B** — GLUT2 has the highest Km (about 15–20 mM), so it works in proportion to glucose levels in the liver and pancreatic β-cells. GLUT1 and GLUT3 have high affinity, GLUT4 is insulin-regulated, and GLUT5 transports fructose.

### 91. cases for meeting Q26

A 45-year-old man with alcohol use disorder and hepatitis has elevated aldolase. In glycolysis, aldolase cleaves which intermediate into two triose phosphates?

A) Fructose-6-phosphate  
B) Fructose-1,6-bisphosphate  
C) Glyceraldehyde-3-phosphate  
D) Dihydroxyacetone phosphate

**✅ B** — Aldolase cleaves fructose-1,6-bisphosphate into glyceraldehyde-3-phosphate and dihydroxyacetone phosphate. Fructose-6-phosphate is the substrate of PFK-1, and the triose phosphates are aldolase's products.

### 92. cases for meeting Q27

A marathon runner develops lactic acidosis. Converting pyruvate to lactate regenerates which cofactor essential for glycolysis?

A) ATP  
B) FAD  
C) NAD⁺  
D) Coenzyme A

**✅ C** — Lactate dehydrogenase reduces pyruvate to lactate using NADH, regenerating the NAD⁺ that the GAPDH step needs. Without it, anaerobic glycolysis would stop.

### 93. cases for meeting Q28

During fasting, what is the main source of the NADH and ATP that power gluconeogenesis?

A) Amino acid oxidation  
B) Fatty acid oxidation (β-oxidation)  
C) Glycolysis  
D) Pentose phosphate pathway  
E) TCA cycle

**✅ B** — In fasting, hepatic β-oxidation supplies the ATP and NADH that gluconeogenesis consumes, and its acetyl-CoA activates pyruvate carboxylase. Amino acids mainly provide carbon skeletons, glycolysis is suppressed, and the pentose phosphate pathway makes NADPH.

### 94. cases for meeting Q29

A patient with type 1 diabetes stops insulin and develops DKA. Hepatic fructose-2,6-bisphosphate is low. Which enzymatic change increases glucose production?

A) Activation of pyruvate kinase  
B) Inhibition of PEPCK  
C) Activation of fructose-1,6-bisphosphatase (FBPase-1)  
D) Inhibition of glucose-6-phosphatase

**✅ C** — Low fructose-2,6-bisphosphate removes the inhibition of FBPase-1 (and the activation of PFK-1), so flux turns towards gluconeogenesis. In this state pyruvate kinase is inhibited, while PEPCK and glucose-6-phosphatase are active.

### 95. cases for meeting Q31

A 2-week-old infant with galactosemia has bilateral cataracts. The cataracts are due to accumulation of:

A) Galactose  
B) Galactose-1-phosphate  
C) Galactitol  
D) Sorbitol

**✅ C** — Excess galactose is reduced by aldose reductase to galactitol, which is trapped in the lens and draws in water, causing cataracts. Galactose-1-phosphate causes the liver, kidney and brain toxicity; sorbitol accumulates in diabetes.

