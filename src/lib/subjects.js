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

const BS_TOPIC_MAP = {
  terminology: 'Anatomical Terminology',
  bones: 'Bones & Skeletal System',
  joints: 'Joints & Articulations',
  thoracic: 'Thoracic Anatomy',
  upper_limb: 'Upper Limb',
  viscerocranium: 'Viscerocranium & Face',
  cranial: 'Cranial Anatomy',
  vertebral: 'Vertebral Column',
  lower_limb: 'Lower Limb',
  functional_org: 'Functional Organization',
  nerve_muscle: 'Nerve & Muscle',
  fluids: 'Body Fluids',
  transport: 'Membrane Transport',
  tissue: 'Tissue Physiology',
  cell: 'Cell Physiology',
  temperature: 'Temperature Regulation',
  imaging_upper: 'Upper Limb Imaging',
  imaging_general: 'General Radiology',
  imaging_thoracic: 'Thoracic Imaging',
  imaging_lower: 'Lower Limb Imaging',
  imaging_pelvis: 'Pelvis & Abdomen Imaging',
  imaging_spine: 'Spine Imaging',
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
    description: 'Molecular Biology, Biochemistry, Histology & Medical Genetics — Semester 2',
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
    description: 'Anatomy, Physiology & Medical Imaging — Semester 2',
    docTitle: 'Body Systems II — Studywith Labobo',
    storagePrefix: 'bs2',
    leaderboardSubject: 'Body Systems II',
    sessionSubject: 'Body Systems II',
    semester: '2',
    examLengths: [30, 60, 90, 120, 150, 180, 210],
    ratio: { Anatomy: 5, Physiology: 3, 'Medical Imaging': 2 },
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
    description: 'Semester 2 clinical & professional skills — content coming soon',
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

  'medicine-art-2': {
    path: 'medicine-art-2',
    title: 'Medicine & Art II',
    description: 'Semester 2 medicine & art — content coming soon',
    docTitle: 'Medicine & Art II — Studywith Labobo',
    storagePrefix: 'medart2',
    leaderboardSubject: 'Medicine & Art II',
    sessionSubject: 'Medicine & Art II',
    semester: '2',
    examLengths: [10, 20, 30, 45, 60, 90, 120, 180, 240],
    ratio: { 'Medicine & Art II': 1 },
    imageBase: '/images/medart/',
    sources: [{ table: 'medicine_art_2', subject: 'Medicine & Art II' }],
  },
};

/* The midterm review page has its own (simpler) engine but pulls from
   the same kind of tables. */
export const MIDTERM = {
  semester: '1',
  title: 'Midterm Review',
  description: 'Biochemistry, Molecular Biology, Genetics & Histology',
  storagePrefix: 'midterm',
  sources: [
    { table: 'midterm_biochemistry', subject: 'Biochemistry' },
    { table: 'midterm_molecular_biology', subject: 'Molecular Biology' },
    { table: 'midterm_genetics', subject: 'Genetics' },
    { table: 'midterm_histology', subject: 'Histology' },
  ],
};

/* Every table the question API is allowed to read. The allowlist in
   netlify/functions/questions.js must match this list. */
export const ALL_QUESTION_TABLES = [
  ...Object.values(SUBJECTS).flatMap((s) => s.sources.map((x) => x.table)),
  ...MIDTERM.sources.map((x) => x.table),
];

export function getSubject(key) {
  return SUBJECTS[key] || null;
}
