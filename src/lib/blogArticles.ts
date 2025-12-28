export interface BlogArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedDate: string;
  readTime: number; // in minutes
  category: string;
  image?: string;
}

export const blogArticles: BlogArticle[] = [
  {
    id: "accelerate-recruitment",
    title: "7 tactics to accelerate site recruitment",
    excerpt: "Practical steps sites are using to cut screening times and improve referral quality.",
    author: "Sarah Mitchell",
    publishedDate: "2025-01-15",
    readTime: 8,
    category: "Recruitment",
    content: `
# 7 Tactics to Accelerate Site Recruitment

Recruitment timelines are critical for trial success. Sites that streamline their processes see faster enrollment, higher quality patient matches, and better trial outcomes. Here are seven proven tactics that leading sites are implementing today.

## 1. Implement Pre-Screening Automation

Many sites are now using digital forms to collect preliminary patient information before the site coordinator reviews it. This allows coordinators to quickly identify who meets basic criteria and prioritize follow-ups.

**Impact**: Reduces initial screening time by 40-60% and improves coordinator efficiency.

**How to get started**: Set up an online pre-screening form that captures basic demographics, medical history, and inclusion/exclusion criteria. Use conditional logic to only show relevant questions.

## 2. Optimize Your Referral Network

Sites with diverse referral sources enroll faster. Consider partnering with:
- Primary care physicians in your area
- Specialty practices aligned with the trial indication
- Community health centers
- Digital health platforms and patient registries

**Impact**: Increases eligible referral volume by 50-100%.

**How to get started**: Map out your geographic service area and identify 5-10 key referral partners. Build relationships with their clinical and administrative teams.

## 3. Create a Patient-Centric Onboarding Process

Patients who understand the trial upfront are more likely to complete screening and enroll. Provide:
- Clear, non-medical language explanations of the trial
- Visual flowcharts of the screening process
- Estimates of time commitment for visits and procedures
- Transparent information about compensation (if applicable)

**Impact**: Increases screening completion rates by 30-45% and improves informed consent quality.

**How to get started**: Develop a one-page visual guide explaining your trial's screening process. Share it during the initial phone call and email.

## 4. Use Data Analytics to Identify Bottlenecks

Track metrics at each step:
- Referral source and volume
- Pre-screening completion rates
- Time from referral to first visit
- Screening failure reasons
- Time from eligibility confirmation to enrollment

**Impact**: Helps you focus optimization efforts where they have the biggest impact.

**How to get started**: Use your trial management system or a simple spreadsheet to track these metrics weekly. Look for patterns in where you lose candidates.

## 5. Implement Flexible Scheduling Options

Many potential participants drop out because visit times don't work for them. Offer:
- Weekend or early evening appointments
- Virtual visits for remote assessments
- Flexible rescheduling policies
- Reminder systems (SMS, email, automated calls)

**Impact**: Reduces no-shows by 25-35% and keeps more candidates in the pipeline.

**How to get started**: Survey your patient population about preferred visit times. Train staff on how to accommodate scheduling requests within protocol requirements.

## 6. Develop a Rapid Response Team

Create a protocol-specified process for expedited reviews of borderline candidates. A small team of experienced coordinators can make quick inclusion/exclusion decisions, preventing delays caused by committee approvals.

**Impact**: Reduces time from screening to enrollment by 1-2 weeks per candidate.

**How to get started**: Define clear rapid-response criteria and document approval authority. Train your team on consistent decision-making.

## 7. Build Patient Retention into Your Plan

Enrollment is just the beginning. Sites that focus on retention during screening see better follow-through:
- Regular check-ins with candidates during the screening period
- Personalized communication from a consistent coordinator
- Addressing patient concerns and questions promptly
- Creating a supportive, welcoming environment

**Impact**: Improves conversion from screening eligibility to actual enrollment by 15-25%.

**How to get started**: Assign a primary coordinator to each screening candidate. Have them check in every 3-5 days with updates or questions.

## Measuring Success

Track your improvements over time. Most sites see significant gains within the first 90 days of implementing these tactics. The most effective sites combine multiple tactics tailored to their specific challenges and patient population.

The key to acceleration isn't just speed—it's creating a process that's efficient, patient-friendly, and maintains the quality and integrity of your trial.
    `,
  },
  {
    id: "digital-recruitment-budget",
    title: "Budgeting digital recruitment for 2025",
    excerpt: "How to forecast paid, owned, and partner channels for enrollment milestones.",
    author: "James Chen",
    publishedDate: "2025-01-12",
    readTime: 10,
    category: "Budget & Strategy",
    content: `
# Budgeting Digital Recruitment for 2025: A Strategic Guide

Digital recruitment channels have become essential for clinical trial enrollment. In 2025, sites need a data-driven approach to allocate budgets across owned, paid, and partner channels. This guide helps you build a realistic budget aligned with your enrollment targets.

## Understanding Your Three Channels

### 1. Owned Channels (0-5% of budget)
These are the channels you control directly:
- Your website and landing pages
- Email lists and newsletters
- Social media accounts
- Patient databases and previous trial participants

**Advantage**: Low cost, high conversion for warm audiences
**Challenge**: Limited reach for new patient acquisition

### 2. Paid Channels (40-60% of budget)
Channels where you pay per impression, click, or conversion:
- Google Search Ads
- Facebook/Instagram ads
- LinkedIn campaigns
- Programmatic display ads
- Patient-targeted networks

**Advantage**: Scalable, measurable, audience targeting
**Challenge**: Rising costs per acquisition, competitive bidding

### 3. Partner Channels (35-55% of budget)
Collaborations with healthcare platforms and networks:
- Patient registries and networks
- Healthcare provider platforms
- EHR integration partners
- Telehealth platforms
- Pharmacy networks

**Advantage**: Credible source, pre-qualified patients, high conversion
**Challenge**: Requires contract negotiations, variable costs

## Building Your Budget: A Step-by-Step Approach

### Step 1: Define Your Enrollment Target

Start with your trial's enrollment goal and timeline:
- Total enrollees needed: 500
- Target enrollment period: 12 months
- Target ramp: Month 1-3 (25%), Month 4-9 (50%), Month 10-12 (25%)

This tells you how many patients you need per month (approximately 42/month for steady enrollment).

### Step 2: Calculate Your Cost Per Acquisition (CPA)

Research industry benchmarks for your indication:
- Rare diseases: $800-$2,000 per enrolled patient
- Oncology: $600-$1,200 per enrolled patient
- Chronic diseases: $300-$800 per enrolled patient
- Common conditions: $100-$400 per enrolled patient

Include all costs:
- Media spend
- Personnel (coordinators, marketers)
- Technology and tools
- Patient incentives
- Overhead allocation

### Step 3: Calculate Required Media Spend

Formula: (Total Enrollees × CPA) - (Personnel & Overhead)

**Example**:
- Target: 500 enrollees
- Expected CPA: $500
- Total needed: $250,000
- Personnel/Overhead: $80,000
- Media/Partner budget: $170,000

### Step 4: Allocate Across Channels

Use these allocation percentages as a starting point:

**Conservative sites** (established referral networks):
- Owned: 5%
- Paid: 40%
- Partner: 55%

**Growth-focused sites** (need to build awareness):
- Owned: 3%
- Paid: 60%
- Partner: 37%

**Digital-first sites** (limited traditional referrals):
- Owned: 5%
- Paid: 65%
- Partner: 30%

### Step 5: Monthly Budget Allocation

Don't distribute evenly across 12 months. Align with enrollment targets:

**Month 1-2**: 10% (ramp up, testing phase)
**Month 3-4**: 20% (peak spending)
**Month 5-9**: 60% (sustained high volume)
**Month 10-12**: 10% (wind down)

## Channel-Specific Budget Guidelines

### Google Search (Paid)
- Cost per click: $2-$8
- Conversion rate: 5-15%
- Best for: Patients actively searching for trials
- Recommended spend: 15-20% of paid budget
- Realistic monthly: $3,000-$5,000

### Facebook/Instagram (Paid)
- Cost per click: $0.50-$3
- Conversion rate: 1-5%
- Best for: Targeted awareness and engagement
- Recommended spend: 25-35% of paid budget
- Realistic monthly: $5,000-$8,000

### Patient Registry Partners
- Cost per lead: $50-$300
- Cost per enrolled: $200-$1,000
- Conversion rate: 30-60%
- Best for: Pre-qualified, interested patients
- Recommended spend: 35-50% of partner budget
- Realistic monthly: $4,000-$8,000

### Healthcare Provider Networks
- Cost varies by network
- Cost per enrolled: $300-$1,500
- Conversion rate: 40-70%
- Best for: Trusted referrals, high quality
- Recommended spend: 25-35% of partner budget
- Realistic monthly: $2,500-$5,000

## Sample 2025 Budget: 500-Patient Oncology Trial

**Total Annual Budget**: $250,000

**By Channel**:
- Owned: $8,000 (website optimization, email)
- Paid Digital: $90,000 (Google, Facebook, programmatic)
- Partners: $120,000 (registries, provider networks)
- Contingency: $32,000

**Monthly Breakdown**:
- Jan: $15,000 (testing, setup)
- Feb: $20,000 (ramp up)
- Mar-Aug: $38,000-$42,000 (peak)
- Sep-Oct: $25,000 (sustain)
- Nov-Dec: $10,000 (wind down)

## Pro Tips for Maximizing ROI

1. **Start with warm audiences**: Your existing contacts and databases cost 80% less per conversion than cold audiences.

2. **Test multiple messages**: Different patient segments respond to different value propositions. Test early, scale winners.

3. **Implement attribution tracking**: Know which channels drive enrollments, not just clicks. Use UTM codes and partner integration tracking.

4. **Negotiate partner rates**: Don't accept list prices. Many registry partners negotiate on volume or performance.

5. **Plan for seasonality**: Enrollment typically drops in summer and December. Budget accordingly.

6. **Keep contingency**: Reserve 10-15% of budget for opportunities and unexpected channels that perform well.

7. **Review monthly**: Adjust allocations based on actual performance. What works in month 1 might need adjustment by month 4.

## Red Flags: Signs Your Budget Is Off

- You're hitting click volumes but seeing 0% conversion
- Your cost per acquisition is 3x+ the benchmark
- You're not seeing improvement month-over-month
- One channel is driving 90%+ of volume (unhealthy dependence)
- No measurable attribution from partner channels

If you see these signs, pause and audit your targeting, messaging, and conversion process.

## Looking Ahead

2025 will likely see:
- Increased privacy regulations (third-party cookies declining)
- Higher paid advertising costs (more competition)
- Growing investment in first-party data and owned channels
- More AI-powered patient matching and personalization

Plan your budget with these trends in mind, and allocate resources to build your owned channels for long-term sustainability.

Your budget should flex and flow with real performance data. The sites that succeed are those that monitor metrics weekly and adjust monthly.
    `,
  },
  {
    id: "coordinators-toolkit",
    title: "Coordinators' toolkit: from prescreen to consent",
    excerpt: "Templates and checklists for consistent patient communications and privacy compliance.",
    author: "Jennifer Rodriguez",
    publishedDate: "2025-01-08",
    readTime: 12,
    category: "Best Practices",
    content: `
# Coordinators' Toolkit: From Prescreen to Consent

Patient coordinators are the backbone of successful clinical trials. They manage first impressions, guide patients through screening, and ensure regulatory compliance. This toolkit provides templates and checklists to standardize your process and improve patient experience.

## Phase 1: Pre-Screen (Initial Contact)

### Pre-Screen Call Checklist

**Before the call:**
- [ ] Review referral information
- [ ] Confirm patient contact information is current
- [ ] Have protocol summary accessible
- [ ] Verify coordinator has privacy/HIPAA training current
- [ ] Prepare pre-screen form for documentation

**Opening (first 2 minutes):**
- [ ] Introduce yourself and site
- [ ] Confirm you're reaching the correct person
- [ ] Briefly explain why patient was referred
- [ ] Ask if it's a good time to talk (15 min)
- [ ] Explain confidentiality and how information will be used

**Key questions (5-10 minutes):**
- [ ] Age or birth date?
- [ ] Confirmed diagnosis and date of diagnosis?
- [ ] Current medications and major medical history?
- [ ] Any contraindications you're aware of?
- [ ] Transportation and ability to attend visits?

**Setting expectations:**
- [ ] Explain next steps clearly
- [ ] Provide realistic timeline
- [ ] Discuss what to expect at screening visit
- [ ] Ask about preferred contact method and best times
- [ ] Confirm phone number and/or email for follow-up

**Closing:**
- [ ] Thank patient for their time
- [ ] Confirm you'll send written information
- [ ] Schedule screening visit if eligible
- [ ] Provide site contact information

### Pre-Screen Documentation Template


Patient Name: _________________
DOB: _____/____/_____
Date of Call: _____/_____/_____
Coordinator: _________________

REFERRAL INFORMATION
Referring Provider: _________________
Reason for Referral: _________________

INITIAL ELIGIBILITY ASSESSMENT
Age: _____ (meets inclusion? Y/N)
Diagnosis: _________________
Date of Diagnosis: _____/_____/_____

Current Medications:
1. _________________
2. _________________
3. _________________

Medical History (relevant):
_________________________________

Transportation/Logistics:
Able to attend 4-6 week visits? Y/N
Preferred visit times: _________________

NEXT STEPS
[ ] Schedule screening visit
[ ] Send information packet
[ ] Will follow up: Date _____/_____/_____
[ ] Patient declined - Reason: _________________

NOTES:
_________________________________
```

## Phase 2: Screening Visit

### Screening Visit Coordinator Checklist

**Pre-Visit Preparation (24 hours before):**
- [ ] Confirm appointment with patient (day before)
- [ ] Prepare all screening forms and consent template
- [ ] Review all pre-screen documentation
- [ ] Ensure all required lab/imaging order forms are ready
- [ ] Verify patient has received study information
- [ ] Check that physician is available for any questions

**Day of Visit - Reception:**
- [ ] Greet patient warmly and on time
- [ ] Offer water/refreshment
- [ ] Have patient sign in
- [ ] Verify insurance information (if applicable)
- [ ] Provide patient with study summary one-pager

**Informed Consent Review (20-30 minutes):**
- [ ] In private setting with minimal interruptions
- [ ] Explain informed consent purpose and process
- [ ] Read through document together (don't just hand it over)
- [ ] Pause frequently to check understanding
- [ ] Encourage questions
- [ ] Answer honestly, don't oversell
- [ ] Ensure patient has time to decide (no pressure)
- [ ] If consenting: Ensure proper signatures and initials
- [ ] If declining: Document reason, thank them, maintain relationship

**Screening Assessment:**
- [ ] Complete vital signs
- [ ] Confirm current medications
- [ ] Review systems checklist
- [ ] Perform any protocol-specified assessments
- [ ] Collect baseline labs/imaging per protocol
- [ ] Document any adverse events or medical changes

**Patient Education:**
- [ ] Explain study procedures clearly
- [ ] Provide written schedule of visits
- [ ] Discuss time commitment realistically
- [ ] Review compensation (if applicable)
- [ ] Explain confidentiality and HIPAA protections
- [ ] Answer questions about trial specifics
- [ ] Discuss contact information and after-hours protocols

**Closing:**
- [ ] Confirm enrollment status (if eligible and consented)
- [ ] Schedule next visit before patient leaves
- [ ] Provide emergency contact card
- [ ] Give copy of consent form to patient
- [ ] Document any special instructions
- [ ] Thank patient for participation

### Informed Consent Communication Template

**Key points to cover verbally:**

"I want to walk through this consent form with you carefully. This explains the study in detail—what you'll do, what we'll do, and any potential risks. Please let me know if any part is unclear.

**The study is testing**: [Brief explanation of what drug/intervention does]

**Your participation involves**: [List key procedures, frequency, time commitment]

**Potential benefits**: [What might happen - honest, not oversold]

**Potential risks**: [Include both common and rare but serious risks]

**Your rights as a participant**:
- You can ask questions anytime
- You can withdraw at any time without penalty
- Your privacy is protected by federal law (HIPAA)
- We won't tell your regular doctor unless you want us to or it's a safety issue
- Your medical records will be kept confidential

**Compensation**: [If applicable, explain amount and conditions]

**Next steps**: [What happens if you enroll, timeline, contacts]

Do you have any questions before we proceed?"

## Phase 3: Enrollment & Baseline

### Enrollment Visit Checklist

**Day of Visit:**
- [ ] Welcome returning patient
- [ ] Review any medical changes since screening
- [ ] Confirm continued willingness to participate
- [ ] Perform baseline labs/imaging
- [ ] Administer first study drug/intervention
- [ ] Provide dosing instructions (written and verbal)
- [ ] Discuss activity restrictions
- [ ] Review diary/log requirements
- [ ] Schedule follow-up visit
- [ ] Provide emergency contact procedures

### Ongoing Patient Communication Template

**Weekly Check-in (if applicable):**

"Hi [Name], this is [Coordinator] from [Site]. I'm calling to check in on how you're doing with the study. Do you have a few minutes to talk?

- How are you feeling overall?
- Any side effects or concerns since we last spoke?
- Any questions about the study procedures?
- Are you able to continue with the visits as scheduled?
- Is there anything we can do to make participation easier?"

**Document:**
- Date and time of contact
- Patient status (doing well, side effects, concerns)
- Any medical changes reported
- Action items or follow-ups needed

## Privacy & HIPAA Compliance Reminders

### Before Every Patient Interaction

**Secure Communication:**
- [ ] Use HIPAA-secure phone lines or video (not personal cell, not open WiFi)
- [ ] Call from private location
- [ ] Avoid using patient names in hallways
- [ ] Use patient ID number, not name, in common areas

**Documentation:**
- [ ] Use only acronyms or patient ID in shared communications
- [ ] Store all documents in locked files
- [ ] Electronic records stored securely, password protected
- [ ] Share information only on "need to know" basis

**Patient Consent:**
- [ ] Confirm consent to contact at specific phone number
- [ ] Ask how patient prefers to be contacted
- [ ] Respect patient's privacy preferences
- [ ] Document all consent-related preferences

## Common Coordinator Challenges & Solutions

### Challenge: Patient Not Available for Appointment

**Solution**:
1. Call at least 3 times at different times/days
2. Leave voicemail with your number and study name
3. Send email reminder (if patient agreed to email)
4. Text reminder (if patient agreed to SMS)
5. Reach out to referral source if multiple missed attempts
6. Document all attempts

### Challenge: Patient Questions About Risks

**Solution**:
1. Listen fully without interrupting
2. Acknowledge the concern as valid
3. Provide accurate, honest information
4. Don't downplay or oversell safety
5. If unsure, say "Let me find the exact answer and get back to you"
6. Never guarantee safety or outcomes
7. Document question and your response

### Challenge: Patient Wants to Withdraw

**Solution**:
1. Ask for reasons (valuable feedback)
2. Don't pressure them to stay
3. Ensure they understand they can withdraw anytime
4. Complete exit visit if protocol-required
5. Ask if they want to be contacted about future studies
6. Maintain professional, supportive relationship
7. Document reason for withdrawal

## Monthly Coordinator Meeting Template

**Agenda** (30 minutes):

1. **Enrollment updates** (5 min)
   - Total enrolled this month
   - On track for target?

2. **Quality metrics** (10 min)
   - Consent completion rate
   - Screening failure reasons
   - Patient satisfaction (any complaints?)
   - Protocol deviations

3. **Challenges** (10 min)
   - What's working well?
   - What's challenging?
   - Brainstorm solutions together

4. **Training/Compliance** (5 min)
   - HIPAA updates
   - Protocol clarifications
   - New procedures

## Your Success Metrics

Track these weekly:
- Pre-screens completed: ___
- Screening visits scheduled: ___
- Screening visits completed: ___
- Enrollments: ___
- Withdrawal reasons: ___

Review these monthly:
- Screening-to-enrollment conversion rate: ___% (target: 60-80%)
- Average time screen to enrollment: ___ days (target: <14 days)
- Patient satisfaction score: ___/10
- Protocol deviations: ___

## Final Tips

1. **Be a patient advocate**: Your role bridges the trial and the patient. Care about their experience.

2. **Consistency matters**: Use these templates every time. Consistency builds trust and ensures compliance.

3. **Document everything**: Detailed notes protect you, the patient, and the trial. "If it wasn't documented, it didn't happen."

4. **Communicate changes**: If protocols change, explain them clearly to patients.

5. **Celebrate milestones**: Acknowledge when patients reach study endpoints. It builds goodwill.

6. **Train new coordinators**: Document what you do so knowledge isn't lost. Help your team succeed.

The patient coordinators who excel do so because they treat every patient interaction as if that patient's experience matters—because it does. This toolkit helps you do that consistently and with confidence.
    `,
  },
];

export function getArticleById(id: string): BlogArticle | undefined {
  return blogArticles.find(article => article.id === id);
}

export function getAllArticles(): BlogArticle[] {
  return blogArticles;
}