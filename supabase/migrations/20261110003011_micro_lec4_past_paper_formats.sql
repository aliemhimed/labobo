-- Micro Lec 4 (Gram-Positive Rods): 20 further questions in the formats the
-- GCT IV past papers use but the lecture-written items did not — True/False,
-- EXCEPT / NOT true / incorrect / mismatched stems, "all of the above", and
-- five-option items. Content is the same Week V material (Clostridium,
-- Bacillus, Corynebacterium, Listeria); only the question formats are new.
--
-- Added after the existing maximum ord of 620.

insert into public.gct4_microbiology (ord, topic, q, options, answer, explanation) values

-- True/False, as the past papers phrase them
(621, 'Micro Lec 4: Gram-Positive Rods',
 'True or false: tetanus can be acquired by eating food that contains tetanospasmin.',
 '["True","False"]',
 1,
 'False. Tetanus toxin is rapidly destroyed by intestinal proteases, so the disease follows contamination of a wound, not ingestion.'),

(622, 'Micro Lec 4: Gram-Positive Rods',
 'True or false: all strains of Corynebacterium diphtheriae produce diphtheria toxin.',
 '["True","False"]',
 1,
 'False. Only strains infected with a bacteriophage carrying the toxin gene are toxigenic; non-toxigenic strains also live in the upper respiratory tract.'),

(623, 'Micro Lec 4: Gram-Positive Rods',
 'True or false: in Clostridium difficile colitis, toxin B is the more important cause of actin depolymerisation.',
 '["True","False"]',
 0,
 'True. Toxin A and toxin B are both glucosyltransferases, but toxin B is especially important in depolymerising actin, causing cell rounding and apoptosis.'),

(624, 'Micro Lec 4: Gram-Positive Rods',
 'True or false: Listeria monocytogenes is non-motile, which is what distinguishes it from the corynebacteria.',
 '["True","False"]',
 1,
 'False. It is the other way round: Listeria is motile, showing tumbling motility, and that is what separates it from the non-motile corynebacteria.'),

-- EXCEPT / NOT true / incorrect / mismatched
(625, 'Micro Lec 4: Gram-Positive Rods',
 'All of the following are spore-forming Gram-positive rods EXCEPT:',
 '["Bacillus anthracis","Bacillus cereus","Clostridium perfringens","Corynebacterium diphtheriae","Clostridium tetani"]',
 3,
 'Among the medically important Gram-positive bacteria only Bacillus and Clostridium form spores. Corynebacterium and Listeria do not sporulate.'),

(626, 'Micro Lec 4: Gram-Positive Rods',
 'Which statement about botulinum toxin is NOT true?',
 '["It is destroyed by gastrointestinal enzymes","It blocks the release of acetylcholine","It is inactivated by heating at 100°C","It binds irreversibly to presynaptic terminals"]',
 0,
 'The toxin resists gastrointestinal enzymes, which is why swallowed toxin is absorbed intact. It is heat-labile, binds presynaptic terminals irreversibly and prevents acetylcholine release.'),

(627, 'Micro Lec 4: Gram-Positive Rods',
 'All of the following are features of tetanus EXCEPT:',
 '["Trismus","Risus sardonicus","Opisthotonos","Descending flaccid paralysis","Spasm of the respiratory muscles"]',
 3,
 'Descending flaccid paralysis is botulism. Tetanospasmin blocks inhibitory transmission, so tetanus gives rigidity and spasm rather than flaccid weakness.'),

(628, 'Micro Lec 4: Gram-Positive Rods',
 'Which statement about Clostridium perfringens is incorrect?',
 '["It is a motile rod","It produces a lecithinase","It is part of the normal colonic flora","It grows rapidly under anaerobic conditions"]',
 0,
 'C. perfringens is non-motile. It is a large, square-ended anaerobe that produces alpha toxin, a lecithinase, and is normal flora of the colon and vagina.'),

(629, 'Micro Lec 4: Gram-Positive Rods',
 'Which organism-feature pair is mismatched?',
 '["Clostridium botulinum — spastic paralysis","Clostridium tetani — tennis racket spores","Corynebacterium diphtheriae — Chinese letters","Listeria monocytogenes — tumbling motility"]',
 0,
 'Botulinum toxin blocks acetylcholine release and causes flaccid paralysis; spastic paralysis belongs to tetanus. The other three pairs are correct.'),

(630, 'Micro Lec 4: Gram-Positive Rods',
 'All of the following diseases are caused by a Clostridium species EXCEPT:',
 '["Gas gangrene","Botulism","Pseudomembranous colitis","Diphtheria","Tetanus"]',
 3,
 'Diphtheria is caused by Corynebacterium diphtheriae. The other four are clostridial: C. perfringens, C. botulinum, C. difficile and C. tetani respectively.'),

-- "All of the above", as the past papers use it
(631, 'Micro Lec 4: Gram-Positive Rods',
 'Clostridium difficile infection can be confirmed by:',
 '["Stool toxin ELISA","A cytotoxicity assay on cultured cells","PCR for the toxin genes","All of the above"]',
 3,
 'ELISA detects toxins A and B, the cytotoxicity assay shows toxin-induced death of cultured cells, and PCR for the toxin genes is highly sensitive.'),

(632, 'Micro Lec 4: Gram-Positive Rods',
 'Management of severe tetanus may include:',
 '["Tetanus immune globulin","Diazepam for muscle spasms","A secure airway with respiratory support","All of the above"]',
 3,
 'Immune globulin neutralises unbound toxin, benzodiazepines control rigidity and spasm, and airway protection with ventilation addresses the main cause of death.'),

(633, 'Micro Lec 4: Gram-Positive Rods',
 'Listeria monocytogenes may reach a newborn through:',
 '["Soft cheese eaten by the mother","Transplacental spread","The birth canal","All of these routes"]',
 3,
 'Maternal infection follows contaminated food such as soft cheese, and the organism reaches the baby transplacentally after haematogenous spread or in the birth canal, as group B streptococci do.'),

-- five-option items, including vignettes
(634, 'Micro Lec 4: Gram-Positive Rods',
 'A 25-year-old is admitted a day after a farm injury. The wound crepitates, the skin is discoloured with haemorrhagic bullae, and Gram stain shows large non-motile Gram-positive rods. What is the cause?',
 '["Bacillus anthracis","Bacillus cereus","Clostridium perfringens","Clostridium tetani","Listeria monocytogenes"]',
 2,
 'Crepitus with bronze discoloration and haemorrhagic bullae after a contaminated wound is gas gangrene, caused by the large non-motile anaerobe C. perfringens.'),

(635, 'Micro Lec 4: Gram-Positive Rods',
 'A never-immunised 6-year-old has fever, sore throat and a grey adherent pharyngeal membrane. Culture on tellurite agar grows black colonies. Which organism is responsible?',
 '["Bacillus anthracis","Clostridium perfringens","Corynebacterium diphtheriae","Listeria monocytogenes","Streptococcus pyogenes"]',
 2,
 'A grey adherent pharyngeal membrane in an unimmunised child, with black colonies on tellurite agar from reduction of tellurite to tellurium, is diphtheria.'),

(636, 'Micro Lec 4: Gram-Positive Rods',
 'A 68-year-old develops profuse watery diarrhoea during clindamycin therapy, and sigmoidoscopy shows yellow-white mucosal plaques. Which organism is responsible?',
 '["Clostridioides difficile","Clostridium perfringens","Listeria monocytogenes","Salmonella enterica","Shigella dysenteriae"]',
 0,
 'Antibiotic therapy disrupts the colonic flora and lets C. difficile overgrow; its toxins produce pseudomembranous colitis with the characteristic plaques.'),

(637, 'Micro Lec 4: Gram-Positive Rods',
 'Which toxin acts by inhibiting the release of glycine and GABA?',
 '["Alpha toxin","Botulinum toxin","Diphtheria toxin","Tetanospasmin","Toxin B"]',
 3,
 'Tetanospasmin blocks release of the inhibitory transmitters glycine and GABA from interneurons, leaving motor neurons continuously active.'),

(638, 'Micro Lec 4: Gram-Positive Rods',
 'Which medium is used to demonstrate alpha toxin production?',
 '["Blood agar","Egg yolk agar","Loeffler''s medium","MacConkey agar","Tinsdale agar"]',
 1,
 'Egg yolk agar is rich in lecithin, so alpha toxin digests it and produces the opaque halo of Nagler''s reaction, abolished on the half treated with antitoxin.'),

(639, 'Micro Lec 4: Gram-Positive Rods',
 'Which organism is identified by tumbling motility and a narrow zone of beta-haemolysis on blood agar?',
 '["Bacillus anthracis","Clostridium botulinum","Clostridium difficile","Listeria monocytogenes","Corynebacterium diphtheriae"]',
 3,
 'Small grey colonies with narrow beta-haemolysis, Gram-positive rods resembling diphtheroids, and tumbling motility identify Listeria monocytogenes.'),

(640, 'Micro Lec 4: Gram-Positive Rods',
 'For which of these organisms is diagnosis primarily clinical, with no reliable microbiological or serological test?',
 '["Clostridium tetani","Bacillus anthracis","Clostridium difficile","Corynebacterium diphtheriae","Listeria monocytogenes"]',
 0,
 'Tetanus is diagnosed clinically: the organism is rarely isolated from the wound and its detection correlates poorly with severity. The others are confirmed by culture or toxin detection.');
