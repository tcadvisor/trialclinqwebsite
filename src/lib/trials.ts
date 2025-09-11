export type Trial = {
  slug: string;
  nctId: string;
  title: string;
  updatedOn: string;
  center: string;
  otherCentersCount: number;
  location: string;
  phase: string;
  minAge: number;
  maxAge: number;
  status: 'Now Recruiting' | 'Completed' | 'Active' | 'Not Recruiting';
  aiScore: number; // percent
  type: 'Interventional' | 'Observational';
  description: string[]; // paragraphs
  gender: 'All' | 'Male' | 'Female';
  purpose: string[]; // bullet points
  benefits: string[]; // bullet points
  sponsor: string;
  principalInvestigator: { name: string; role: string };
  interventions: string[];
  contacts: { name: string; phone: string; email: string };
  centers: { name: string; city: string; state: string }[];
  criteria: { inclusion: string[]; exclusion: string[] };
};

const makeSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export const trials: Trial[] = [
  {
    title: 'Agorain, New Treatment for Chronic Neuropathy Pain',
    slug: makeSlug('Agorain, New Treatment for Chronic Neuropathy Pain'),
    nctId: 'NCT06084521',
    updatedOn: '2025-06-07',
    center: 'Amherst Clinical Research Unit',
    otherCentersCount: 3,
    location: 'Amherst, NY - Multiple locations',
    phase: 'Phase II',
    minAge: 18,
    maxAge: 80,
    status: 'Now Recruiting',
    aiScore: 80,
    type: 'Interventional',
    description: [
      'This clinical trial is evaluating the safety and effectiveness of Agorain, an investigational oral medication, for the treatment of chronic neuropathic pain in adults. Chronic neuropathic pain is a long-term condition caused by nerve damage or dysfunction, leading to persistent discomfort or pain.',
      'If you\'ve been diagnosed with chronic nerve-related pain, you may be eligible to participate in this research study and help advance new treatment options for others living with the same condition.'
    ],
    gender: 'All',
    purpose: [
      'Assess whether Agorain reduces pain intensity in individuals with chronic neuropathy pain',
      'Evaluate the safety and tolerability of different doses of Agorain',
      'Monitor changes in quality of life and daily functioning'
    ],
    benefits: [
      'Study-related care at no cost',
      'Potential access to an investigational treatment before it\'s widely available',
      'Travel compensation may be available',
      'Contribution to advancing medical knowledge in neuropathic pain treatment'
    ],
    sponsor: 'NeuroVance Therapeutics, Inc.',
    principalInvestigator: {
      name: 'Dr. Hannah Greene, MD',
      role: 'Neurology & Pain Management Specialist, Buffalo Clinical Research Center'
    },
    interventions: [
      'Agorain 50mg / 100mg oral daily vs. placebo'
    ],
    contacts: {
      name: 'Sarah Lawson, Study Coordinator',
      phone: '+1 (716) 555-0198',
      email: 'trials@neurovance.com'
    },
    centers: [
      { name: 'Amherst Clinical Research Unit', city: 'Amherst', state: 'NY' },
      { name: 'Buffalo Clinical Research Center', city: 'Buffalo', state: 'NY' },
      { name: 'Rochester Medical Research', city: 'Rochester', state: 'NY' }
    ],
    criteria: {
      inclusion: [
        'Adults aged 18 to 80 years',
        'Documented diagnosis of chronic neuropathic pain for ≥ 6 months',
        'Stable pain management regimen for ≥ 30 days prior to screening',
        'Willingness to comply with study visits and procedures'
      ],
      exclusion: [
        'Severe uncontrolled psychiatric disorder',
        'Current opioid dependence',
        'Pregnancy or breastfeeding',
        'Known hypersensitivity to study medication components'
      ]
    }
  },
  {
    title: 'Mindfulness-Based Therapy for Chronic Pain Relief',
    slug: makeSlug('Mindfulness-Based Therapy for Chronic Pain Relief'),
    nctId: 'NCT06110234',
    updatedOn: '2025-05-21',
    center: 'Niagara Wellness Institute',
    otherCentersCount: 0,
    location: 'Niagara Falls, NY',
    phase: 'Phase I',
    minAge: 18,
    maxAge: 40,
    status: 'Now Recruiting',
    aiScore: 72,
    type: 'Interventional',
    description: [
      'This study evaluates the effect of mindfulness-based cognitive therapy on chronic pain perception and daily function.'
    ],
    gender: 'All',
    purpose: [
      'Measure change in self-reported pain scores',
      'Assess adherence and feasibility of at-home practices'
    ],
    benefits: [
      'No cost participation',
      'Access to therapist-guided sessions'
    ],
    sponsor: 'Niagara Wellness Institute',
    principalInvestigator: { name: 'Dr. Emily Rhodes, PhD', role: 'Clinical Psychologist' },
    interventions: ['8-week MBCT program vs. waitlist control'],
    contacts: { name: 'James Park', phone: '+1 (716) 555-2233', email: 'info@niagarawellness.org' },
    centers: [ { name: 'Niagara Wellness Institute', city: 'Niagara Falls', state: 'NY' } ],
    criteria: {
      inclusion: ['Ages 18-40', 'Chronic pain for ≥ 3 months'],
      exclusion: ['Active psychosis', 'Concurrent structured psychotherapy']
    }
  },
  {
    title: 'Chronic Neuropathic Pain Study Using Non-Invasive Nerve Stimulation',
    slug: makeSlug('Chronic Neuropathic Pain Study Using Non-Invasive Nerve Stimulation'),
    nctId: 'NCT06050012',
    updatedOn: '2025-03-12',
    center: 'Buffalo Clinical Research Center',
    otherCentersCount: 1,
    location: 'Buffalo, NY',
    phase: 'Phase II',
    minAge: 45,
    maxAge: 80,
    status: 'Active',
    aiScore: 76,
    type: 'Observational',
    description: ['Observational study monitoring outcomes of non-invasive nerve stimulation in neuropathic pain.'],
    gender: 'All',
    purpose: ['Track functional improvements', 'Assess device tolerability'],
    benefits: ['Travel support may be available'],
    sponsor: 'Buffalo Clinical Research Center',
    principalInvestigator: { name: 'Dr. Raj Patel, MD', role: 'Principal Investigator' },
    interventions: ['Transcutaneous nerve stimulation (observational)'],
    contacts: { name: 'Clinic Desk', phone: '+1 (716) 555-0100', email: 'contact@buffaloresearch.org' },
    centers: [ { name: 'Buffalo Clinical Research Center', city: 'Buffalo', state: 'NY' } ],
    criteria: { inclusion: ['Ages 45-80'], exclusion: ['Pacemaker'] }
  },
  {
    title: 'Investigating the impact of a plant-based CBD therapy on quality of life and pain levels in patients with chronic musculoskeletal and neuropathic pain.',
    slug: makeSlug('Investigating the impact of a plant-based CBD therapy on quality of life and pain levels in patients with chronic musculoskeletal and neuropathic pain.'),
    nctId: 'NCT06120001',
    updatedOn: '2025-04-02',
    center: 'Rochester Medical Research',
    otherCentersCount: 0,
    location: 'Rochester, NY',
    phase: 'Phase II',
    minAge: 30,
    maxAge: 80,
    status: 'Now Recruiting',
    aiScore: 69,
    type: 'Interventional',
    description: ['Randomized study assessing CBD therapy in chronic pain patients.'],
    gender: 'All',
    purpose: ['Pain reduction', 'Quality of life changes'],
    benefits: ['Investigational product at no cost'],
    sponsor: 'Rochester Medical Research',
    principalInvestigator: { name: 'Dr. L. Monroe, MD', role: 'Clinical Investigator' },
    interventions: ['CBD oral capsules vs. placebo'],
    contacts: { name: 'Enrollment Team', phone: '+1 (585) 555-7721', email: 'enroll@rochester-med.org' },
    centers: [ { name: 'Rochester Medical Research', city: 'Rochester', state: 'NY' } ],
    criteria: { inclusion: ['Ages 30-80'], exclusion: ['Severe liver disease'] }
  },
  {
    title: 'Mobile Health Coaching App for Chronic Pain Self-Management',
    slug: makeSlug('Mobile Health Coaching App for Chronic Pain Self-Management'),
    nctId: 'NCT06140055',
    updatedOn: '2025-02-18',
    center: 'Lockport Digital Health Lab',
    otherCentersCount: 0,
    location: 'Lockport, NY',
    phase: 'Phase II',
    minAge: 20,
    maxAge: 60,
    status: 'Now Recruiting',
    aiScore: 60,
    type: 'Observational',
    description: ['Evaluating a mobile coaching app to support pain self-management.'],
    gender: 'All',
    purpose: ['Assess app engagement', 'Correlate app usage with symptom change'],
    benefits: ['App access provided during study period'],
    sponsor: 'Lockport Digital Health Lab',
    principalInvestigator: { name: 'Dr. K. Nguyen, PhD', role: 'Behavioral Scientist' },
    interventions: ['Mobile coaching app (observational)'],
    contacts: { name: 'Study Desk', phone: '+1 (716) 555-4419', email: 'studies@lockport-digital.org' },
    centers: [ { name: 'Lockport Digital Health Lab', city: 'Lockport', state: 'NY' } ],
    criteria: { inclusion: ['Ages 20-60'], exclusion: ['Inability to use smartphone'] }
  }
];

export const getTrialBySlug = (slug: string) => trials.find((t) => t.slug === slug);
