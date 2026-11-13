/* ============================================================
   SUBJECT REGISTRY
   ------------------------------------------------------------
   One entry per quiz page. Everything that used to differ between
   the six copy-pasted HTML engines lives here; the engine itself
   is now shared.

   `sources` maps a Supabase table to the subject label shown in
   the UI. `topicMap` renames raw topic keys for display — only
   needed where the table stores slugs (bs_*). clinical_skills
   carries its own `display_topic` column, which the loader
   prefers automatically.
   ============================================================ */

/* Body Systems I lectures, numbered by the syllabus week (weeks 1 to 7 are
   lectures 1 to 7; after the midterm, weeks 10 to 17 are lectures 8 to 15),
   so the Midterm / After the midterm shortcuts can tell the halves apart. */
const BS_TOPIC_MAP = {
  // Anatomy
  terminology: 'Lec 1: Anatomical Terminology',
  bones: 'Lec 1: Bones & Skeletal System',
  joints: 'Lec 1: Joints & Articulations',
  vertebral: 'Lec 2: Vertebral Column',
  cranial: 'Lec 3: Cranial Bones',
  viscerocranium: 'Lec 4: Facial Bones (Viscerocranium)',
  thoracic: 'Lec 5: Thoracic Skeleton',
  upper_limb: 'Lec 6: Upper Limb Skeleton & Joints',
  lower_limb: 'Lec 7: Lower Limb Skeleton & Joints',
  muscles_head: 'Lec 8: Muscles of the Head & Face',
  muscles_neck: 'Lec 9: Muscles of the Neck',
  muscles_thorax: 'Lec 10: Thoracic Muscles & Diaphragm',
  muscles_back: 'Lec 11: Muscles of the Back',
  muscles_abdomen: 'Lec 12: Abdominal Muscles & Inguinal Canal',
  muscles_upper: 'Lec 13: Muscles of the Upper Limb',
  muscles_lower: 'Lec 14: Muscles of the Pelvis & Lower Limb',
  // Physiology
  functional_org: 'Lec 1: Functional Organization',
  cell: 'Lec 2: The Cell & Its Functions',
  tissue: 'Lec 3: The Primary Tissues',
  transport: 'Lec 4: Membrane Transport',
  fluids: 'Lec 5: Body Fluids & Edema',
  temperature: 'Lec 7: Temperature Regulation & Fever',
  nervous_org: 'Lec 8: Organization of the Nervous System',
  membrane_ap: 'Lec 9: Membrane & Action Potentials',
  synapse_nmj: 'Lec 10: Synaptic & Neuromuscular Transmission',
  skeletal_excitation: 'Lec 11: Excitation of Skeletal Muscle',
  skeletal_contraction: 'Lec 12: Contraction of Skeletal Muscle',
  smooth_muscle: 'Lec 13: Smooth Muscle',
  cardiac_muscle: 'Lec 14: Cardiac Muscle',
  muscle_metabolism: 'Lec 15: Muscle Metabolism',
  nerve_muscle: 'Lec 9: Nerve & Muscle',
  // Medical Imaging
  imaging_general: 'Lec 1: Imaging Methods',
  imaging_spine: 'Lec 2: Spine Imaging',
  imaging_thoracic: 'Lec 5: Thoracic Skeleton Imaging',
  imaging_upper: 'Lec 6: Upper Limb Imaging',
  imaging_lower: 'Lec 7: Lower Limb Imaging',
  imaging_pelvis: 'Lec 8: Pelvis Imaging',
  imaging_muscles: 'Lec 9: Muscle Radiology & Techniques',
  imaging_head_neck: 'Lec 10: Skull & Neck Muscles (CT, MRI)',
  imaging_back: 'Lec 11: Back Muscles (CT, MRI)',
  imaging_trunk: 'Lec 12: Chest, Abdominal & Pelvic Muscles',
  imaging_upper_muscles: 'Lec 13: Upper Limb Muscles (CT, MRI)',
  imaging_lower_muscles: 'Lec 14: Lower Limb Muscles (CT, MRI, US)',
};

export const SUBJECTS = {
  gct: {
    path: 'gct',
    title: 'GCT I MCQ',
    description: 'Molecular Biology, Biochemistry, Histology & Medical Genetics',
    docTitle: 'GCT I — Studywith Labobo',
    storagePrefix: 'gct',
    leaderboardSubject: 'GCT',
    semester: '1',
    sessionSubject: 'GCT',
    examLengths: [30, 60, 90, 120, 150, 180, 210],
    ratio: {
      Biochemistry: 3,
      'Medical Genetics': 3,
      'Molecular Biology': 2,
      Histology: 2,
    },
    sources: [
      { table: 'gct_biochemistry', subject: 'Biochemistry' },
      { table: 'gct_genetics', subject: 'Medical Genetics' },
      { table: 'gct_molecular_biology', subject: 'Molecular Biology' },
      { table: 'gct_histology', subject: 'Histology' },
    ],
  },

  'body-systems': {
    path: 'body-systems',
    title: 'Body Systems MCQ',
    description: 'Anatomy, Physiology & Medical Imaging',
    docTitle: 'Body Systems — Studywith Labobo',
    storagePrefix: 'bs',
    leaderboardSubject: 'Body Systems',
    semester: '1',
    sessionSubject: 'Body Systems',
    examLengths: [30, 60, 90, 120, 150, 180, 210],
    ratio: { Anatomy: 5, Physiology: 3, 'Medical Imaging': 2 },
    topicMap: BS_TOPIC_MAP,
    sources: [
      { table: 'bs_anatomy', subject: 'Anatomy' },
      { table: 'bs_physiology', subject: 'Physiology' },
      { table: 'bs_imaging', subject: 'Medical Imaging' },
    ],
  },

  chemistry: {
    path: 'chemistry',
    title: 'Medical Chemistry MCQ',
    description: 'Matter & Atoms, Thermodynamics, Kinetics, Solutions, Acids & Bases',
    docTitle: 'Medical Chemistry — Studywith Labobo',
    storagePrefix: 'chem',
    leaderboardSubject: 'Medical Chemistry',
    semester: '1',
    sessionSubject: 'Medical Chemistry',
    examLengths: [10, 20, 30, 45, 60, 90, 120, 172],
    ratio: { 'Medical Chemistry': 1 },
    sources: [{ table: 'medical_chemistry', subject: 'Medical Chemistry' }],
  },

  physics: {
    path: 'physics',
    title: 'Medical Physics MCQ',
    description: 'Biomechanics, Waves, Sound, Hydrodynamics & more',
    docTitle: 'Medical Physics — Studywith Labobo',
    storagePrefix: 'phys',
    leaderboardSubject: 'Medical Physics',
    semester: '1',
    sessionSubject: 'Medical Physics',
    examLengths: [10, 20, 30, 45, 60, 75, 90],
    ratio: { 'Medical Physics': 1 },
    sources: [{ table: 'medical_physics', subject: 'Medical Physics' }],
  },

  clinical: {
    path: 'clinical',
    title: 'Clinical & Professional Skills 1',
    description: 'Injections, Infection Control, Drug Administration, Vital Signs & more',
    docTitle: 'Clinical & Professional Skills — Studywith Labobo',
    storagePrefix: 'clin',
    leaderboardSubject: 'Clinical & Professional Skills',
    semester: '1',
    sessionSubject: 'Clinical & Professional Skills',
    examLengths: [10, 20, 30, 45, 60, 75, 90, 120, 180, 203],
    ratio: { 'Clinical & Professional Skills': 1 },
    sources: [
      // this table keeps a curated display_topic alongside the raw topic
      { table: 'clinical_skills', subject: 'Clinical & Professional Skills', displayTopic: true },
    ],
  },

  'medicine-art': {
    path: 'medicine-art',
    title: 'Medicine & Art',
    description: 'Art & Anatomy, Doctors in Art, History of Medicine, Photography, AIDS & more',
    docTitle: 'Medicine & Art — Studywith Labobo',
    storagePrefix: 'medart',
    leaderboardSubject: 'Medicine & Art',
    semester: '1',
    sessionSubject: 'Medicine & Art',
    examLengths: [10, 20, 30, 45, 60, 90, 120, 180, 240],
    ratio: { 'Medicine & Art': 1 },
    // bare filenames in the `images` column resolve against this folder
    imageBase: '/images/medart/',
    sources: [{ table: 'medicine_art', subject: 'Medicine & Art' }],
  },

  'gct-2': {
    path: 'gct-2',
    title: 'GCT II MCQ',
    description: 'Molecular Biology, Biochemistry, Histology & Medical Genetics',
    docTitle: 'GCT II — Studywith Labobo',
    storagePrefix: 'gct2',
    leaderboardSubject: 'GCT II',
    sessionSubject: 'GCT II',
    semester: '2',
    examLengths: [30, 60, 90, 120, 150, 180, 210],
    ratio: {
      Biochemistry: 3,
      'Medical Genetics': 3,
      'Molecular Biology': 2,
      Histology: 2,
    },
    sources: [
      { table: 'gct2_biochemistry', subject: 'Biochemistry' },
      { table: 'gct2_genetics', subject: 'Medical Genetics' },
      { table: 'gct2_molecular_biology', subject: 'Molecular Biology' },
      { table: 'gct2_histology', subject: 'Histology' },
    ],
  },

  'body-systems-2': {
    path: 'body-systems-2',
    title: 'Body Systems II MCQ',
    description: 'Anatomy, Physiology & Medical Imaging',
    docTitle: 'Body Systems II — Studywith Labobo',
    storagePrefix: 'bs2',
    leaderboardSubject: 'Body Systems II',
    sessionSubject: 'Body Systems II',
    semester: '2',
    examLengths: [30, 60, 90, 120, 150, 180, 210],
    ratio: { Anatomy: 2, Physiology: 2, 'Medical Imaging': 1 },
    topicMap: BS_TOPIC_MAP,
    sources: [
      { table: 'bs2_anatomy', subject: 'Anatomy' },
      { table: 'bs2_physiology', subject: 'Physiology' },
      { table: 'bs2_imaging', subject: 'Medical Imaging' },
    ],
  },

  'clinical-2': {
    path: 'clinical-2',
    title: 'Clinical & Professional Skills 2',
    description: 'Clinical procedures, communication & professional practice',
    docTitle: 'Clinical & Professional Skills II — Studywith Labobo',
    storagePrefix: 'clin2',
    leaderboardSubject: 'Clinical & Professional Skills II',
    sessionSubject: 'Clinical & Professional Skills II',
    semester: '2',
    examLengths: [10, 20, 30, 45, 60, 75, 90, 120, 180, 203],
    ratio: { 'Clinical & Professional Skills II': 1 },
    sources: [
      { table: 'clinical_skills_2', subject: 'Clinical & Professional Skills II', displayTopic: true },
    ],
  },

  'scientific-reasoning': {
    path: 'scientific-reasoning',
    title: 'Scientific Reasoning MCQ',
    description: 'The Health Research Process',
    docTitle: 'Scientific Reasoning — Studywith Labobo',
    storagePrefix: 'sr',
    leaderboardSubject: 'Scientific Reasoning',
    sessionSubject: 'Scientific Reasoning',
    semester: '2',
    examLengths: [10, 20, 30, 45, 60, 75, 90],
    ratio: { 'Scientific Reasoning': 1 },
    sources: [{ table: 'scientific_reasoning', subject: 'Scientific Reasoning' }],
  },

  'gct-4': {
    path: 'gct-4',
    title: 'GCT IV MCQ',
    description: 'Immunology & Microbiology',
    docTitle: 'GCT IV — Studywith Labobo',
    storagePrefix: 'gct4',
    leaderboardSubject: 'GCT IV',
    sessionSubject: 'GCT IV',
    semester: '4',
    examLengths: [30, 60, 90, 120, 150, 180, 210],
    ratio: { Immunology: 1, Microbiology: 1 },
    sources: [
      { table: 'gct4_immunology', subject: 'Immunology' },
      { table: 'gct4_microbiology', subject: 'Microbiology' },
    ],
  },

  'body-systems-4': {
    path: 'body-systems-4',
    title: 'Body Systems IV MCQ',
    description: 'Endocrine, Renal & Reproductive — Anatomy, Physiology & Medical Imaging',
    docTitle: 'Body Systems IV — Studywith Labobo',
    storagePrefix: 'bs4',
    leaderboardSubject: 'Body Systems IV',
    sessionSubject: 'Body Systems IV',
    semester: '4',
    examLengths: [30, 60, 90, 120, 150, 180, 210],
    ratio: { Anatomy: 2, Physiology: 2, 'Medical Imaging': 1 },
    sources: [
      { table: 'bs4_anatomy', subject: 'Anatomy' },
      { table: 'bs4_physiology', subject: 'Physiology' },
      { table: 'bs4_imaging', subject: 'Medical Imaging' },
    ],
  },

  // Listed in both semesters: one bank, one progress store and one
  // leaderboard, shown on the home page of either semester.
  'history-of-medicine': {
    path: 'history-of-medicine',
    title: 'History of Medicine MCQ',
    description: 'Prehistoric, Mesopotamia, Egypt, India, China & Greece',
    docTitle: 'History of Medicine — Studywith Labobo',
    storagePrefix: 'hom',
    leaderboardSubject: 'History of Medicine',
    sessionSubject: 'History of Medicine',
    semester: ['1', '2'],
    examLengths: [10, 20, 30, 45, 60, 90, 120, 180],
    ratio: { 'History of Medicine': 1 },
    sources: [{ table: 'history_of_medicine', subject: 'History of Medicine' }],
  },
};

/* Every table the question API is allowed to read. The allowlist in
   netlify/functions/questions.js must match this list. */
export const ALL_QUESTION_TABLES = Object.values(SUBJECTS).flatMap((s) => s.sources.map((x) => x.table));

/** `semester` is one id, or a list for a subject shared between semesters. */
export function inSemester(cfg, semester) {
  return [].concat(cfg.semester).includes(semester);
}

export function getSubject(key) {
  return SUBJECTS[key] || null;
}
