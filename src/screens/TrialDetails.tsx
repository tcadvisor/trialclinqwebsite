import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getTrialBySlug } from '../lib/trials';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { CalendarIcon, Share2Icon, MapPinIcon, FileTextIcon, CheckCircle2, InfoIcon } from 'lucide-react';
import { useAuth } from '../lib/auth';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }>=({ active, onClick, children })=> (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? 'border-[#1033e5] text-gray-900' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
  >
    {children}
  </button>
);

export default function TrialDetails(): JSX.Element {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const trial = slug ? getTrialBySlug(slug) : undefined;

  if (!trial) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-semibold mb-4">Trial not found</h1>
        <p className="text-gray-600 mb-6">The trial you are looking for does not exist or has been removed.</p>
        <Link to="/search-results"><Button>Back to results</Button></Link>
      </div>
    );
  }

  const ageLabel = `>${trial.minAge}yrs`;
  const [tab, setTab] = React.useState<'description'|'criteria'|'interventions'|'centers'|'report'>('description');

  return (
    <div className="flex flex-col w-full items-center relative bg-white">
      {/* Header */}
      <header className="flex-col w-full justify-center gap-2.5 px-2.5 py-3 bg-gray-25 flex items-center">
        <nav className="w-full max-w-[1200px] justify-between flex items-center">
          <Link to="/">
            <img className="w-[124px] h-[39px]" alt="TrialCliniq Logo" src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png" />
          </Link>
          <div className="inline-flex items-center gap-2">
            <Link to="/search-results"><Button variant="outline" className="rounded-full border-[#1033e5] text-[#1033e5]">Search results</Button></Link>
          </div>
        </nav>
      </header>

      {/* Main */}
      <main className="w-full max-w-[1200px] px-4 py-8">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
          <Link to="/">Home</Link>
          <span>›</span>
          <Link to="/search-results">Eligible Trials</Link>
          <span>›</span>
          <span className="truncate">{trial.title}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <CalendarIcon className="w-4 h-4" />
          <span>Updated on {formatDate(trial.updatedOn)}</span>
        </div>

        <h1 className="text-3xl font-semibold leading-snug mb-4">{trial.title}</h1>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <MapPinIcon className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">{trial.center}</span>
          {trial.otherCentersCount > 0 && (
            <span className="text-sm text-[#1033e5] cursor-default">See other centers</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="secondary">{trial.nctId}</Badge>
          <Badge variant="secondary">{trial.phase}</Badge>
          <Badge variant="secondary">{ageLabel}</Badge>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{trial.status}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-700 mb-6">
          <CheckCircle2 className="w-4 h-4 text-[#1033e5]" />
          {isAuthenticated ? (
            <span>{trial.aiScore}% TrialCliniq AI Score</span>
          ) : (
            <button
              onClick={() => navigate("/patients/volunteer")}
              className="text-[#1033e5] hover:underline font-medium"
            >
              See Matching Score
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 border-b mb-4">
              <TabButton active={tab==='description'} onClick={()=>setTab('description')}>Description</TabButton>
              <TabButton active={tab==='criteria'} onClick={()=>setTab('criteria')}>Criteria</TabButton>
              <TabButton active={tab==='interventions'} onClick={()=>setTab('interventions')}>Interventions</TabButton>
              <TabButton active={tab==='centers'} onClick={()=>setTab('centers')}>Investigation centers <span className="ml-1 text-gray-400">{trial.centers.length}</span></TabButton>
              <TabButton active={tab==='report'} onClick={()=>setTab('report')}>AI Match Report</TabButton>
            </div>

            {tab === 'description' && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <section>
                    <h3 className="text-lg font-semibold mb-2">About this study</h3>
                    {trial.description.map((p, i)=> (
                      <p key={i} className="text-gray-700 mb-3">{p}</p>
                    ))}
                  </section>
                  <section>
                    <h3 className="text-lg font-semibold mb-2">Gender</h3>
                    <p className="text-gray-700">Open to both males and females</p>
                  </section>
                  <section>
                    <h3 className="text-lg font-semibold mb-2">Purpose of Study</h3>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {trial.purpose.map((b, i)=> <li key={i}>{b}</li>)}
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-lg font-semibold mb-2">Participation Benefits</h3>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {trial.benefits.map((b, i)=> <li key={i}>{b}</li>)}
                    </ul>
                  </section>
                  <Separator />
                  <section className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm text-gray-500 mb-1">Sponsored By</h4>
                      <p className="text-gray-800">{trial.sponsor}</p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-500 mb-1">Interventions</h4>
                      <p className="text-gray-800">{trial.interventions.join(' | ')}</p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-500 mb-1">Principal Investigator</h4>
                      <p className="text-gray-800">{trial.principalInvestigator.name}</p>
                      <p className="text-gray-600 text-sm">{trial.principalInvestigator.role}</p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-500 mb-1">Contact Info</h4>
                      <p className="text-gray-800">Name: {trial.contacts.name}</p>
                      <p className="text-gray-800">Phone: {trial.contacts.phone}</p>
                      <p className="text-gray-800">Email: {trial.contacts.email}</p>
                    </div>
                  </section>
                </CardContent>
              </Card>
            )}

            {tab === 'criteria' && (
              <Card>
                <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Inclusion criteria</h3>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {trial.criteria.inclusion.map((c, i)=> <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Exclusion criteria</h3>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {trial.criteria.exclusion.map((c, i)=> <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {tab === 'interventions' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3">Interventions</h3>
                  <ul className="list-disc pl-5 text-gray-700 space-y-1">
                    {trial.interventions.map((i, idx)=> <li key={idx}>{i}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}

            {tab === 'centers' && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-lg font-semibold">Investigation centers</h3>
                  {trial.centers.map((c, i)=> (
                    <div key={i} className="flex items-center gap-2 text-gray-800">
                      <MapPinIcon className="w-4 h-4 text-gray-500" />
                      <span>{c.name} — {c.city}, {c.state}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {tab === 'report' && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start gap-2">
                    <InfoIcon className="w-5 h-5 text-[#1033e5] mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold mb-1">AI Match Report</h3>
                      <p className="text-gray-700">Your AI match score is an estimate based on the eligibility criteria and your profile. Please review criteria and consult the study team for confirmation.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full md:w-72 md:flex-shrink-0">
            <div className="sticky top-4 space-y-3">
              <Button className="w-full bg-gray-900 text-white rounded-full">Contact a study centre</Button>
              <Button variant="outline" className="w-full rounded-full flex items-center justify-center gap-2">
                <Share2Icon className="w-4 h-4" /> Share
              </Button>
              <Card>
                <CardContent className="p-4 text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2"><FileTextIcon className="w-4 h-4 text-gray-500" /><span>NCT ID: {trial.nctId}</span></div>
                  <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-gray-500" /><span>Updated {formatDate(trial.updatedOn)}</span></div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t mt-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-sm text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <span>Terms · Privacy</span>
        </div>
      </footer>
    </div>
  );
}
