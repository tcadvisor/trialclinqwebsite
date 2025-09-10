import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ChevronDownIcon, MapPinIcon, ClockIcon, UsersIcon, GridIcon, HelpCircleIcon, ShieldIcon, UserPlusIcon, LogInIcon } from "lucide-react";

const navigationItems = [
  { label: "Patients and Families", hasDropdown: true },
  { label: "Sites & Investigators", hasDropdown: true },
  { label: "Contact Us", hasDropdown: false },
  { label: "About Us", hasDropdown: false },
];

const trialResults = [
  {
    title: "Agorain, New Treatment for Chronic Neuropathy Pain",
    location: "Amherst, NY - Multiple locations",
    phase: "Phase II",
    ageRange: "35-80 yrs",
    type: "Interventional",
  },
  {
    title: "Mindfulness-Based Therapy for Chronic Pain Relief",
    location: "Niagara Falls, NY",
    phase: "Phase I",
    ageRange: "18-40 yrs",
    type: "Interventional",
  },
  {
    title: "Chronic Neuropathic Pain Study Using Non-Invasive Nerve Stimulation",
    location: "Buffalo, NY",
    phase: "Phase II",
    ageRange: "45-80 yrs",
    type: "Observational",
  },
  {
    title:
      "Investigating the impact of a plant-based CBD therapy on quality of life and pain levels in patients with chronic musculoskeletal and neuropathic pain.",
    location: "Rochester, NY",
    phase: "Phase II",
    ageRange: "30-80 yrs",
    type: "Interventional",
  },
  {
    title: "Mobile Health Coaching App for Chronic Pain Self-Management",
    location: "Lockport, NY",
    phase: "Phase II",
    ageRange: "20-60 yrs",
    type: "Observational",
  },
];

const solutionsLinks = ["Find a study", "More about trials", "How TrialCliniq help", "Blog"];

const companyLinks = ["Terms of Conditions", "Contact Us", "About Us", "Privacy Policy"];

export const SearchResults = (): JSX.Element => {
  const [openMenu, setOpenMenu] = useState<null | "patients" | "sites">(null);
  const [minAge, setMinAge] = useState<number>(0);
  const [maxAge, setMaxAge] = useState<number>(100);

  const dropdownItems = [
    {
      icon: GridIcon,
      title: "Find a clinical trial",
      description: "Search active clinical trials near you by using filters and get matched instantly.",
      to: "/patients/find-trial",
    },
    {
      icon: HelpCircleIcon,
      title: "Frequently Asked Questions",
      description: "Find answers to common questions and resources for navigating your clinical trial journey.",
      to: "/patients/faq",
    },
    {
      icon: ShieldIcon,
      title: "Consent & Data Privacy",
      description: "Learn how your personal health data is securely collected, protected, and used for clinical trial matching.",
      to: "/patients/privacy",
    },
    {
      icon: UserPlusIcon,
      title: "Become a clinical trial volunteer",
      description: "Sign up to receive personalized clinical trial matches based on your health profile and location.",
      to: "/patients/volunteer",
    },
    {
      icon: LogInIcon,
      title: "Participant Login",
      description: "Manage your trial matches and track your enrollment progress.",
      to: "/patients/login",
    }
  ];

  const dropdownItemsSites = [
    { icon: NewspaperIcon, title: "Insider Blog", description: "Industry trends, site management tips, and recruitment insights.", to: "/sites/blog" },
    { icon: MegaphoneIcon, title: "Visibility/ Marketing Options", description: "Boost your trial listings and site visibility to eligible patients.", to: "/sites/visibility" },
    { icon: Building2Icon, title: "Multicenter Listings", description: "View and manage your active multicenter trial sites.", to: "/sites/multicenter" },
    { icon: HelpCircleIcon, title: "TrialCliniq Support Center", description: "Contact support or access onboarding guides for investigators.", to: "/sites/support" },
    { icon: UserPlusIcon, title: "Create Provider Account", description: "Access your investigator or site admin dashboard.", to: "/sites/create-account" },
    { icon: LogInIcon, title: "Provider Login", description: "Access your investigator or site admin dashboard.", to: "/sites/login" },
  ];

  const parseAgeRange = (range: string): { min: number; max: number } => {
    const match = range.match(/(\d+)\s*-\s*(\d+)/);
    if (!match) return { min: 0, max: 120 };
    return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
  };

  const filteredTrials = trialResults.filter((t) => {
    const { min, max } = parseAgeRange(t.ageRange);
    return min <= maxAge && max >= minAge;
  });



  const RangeSlider: React.FC<{ min: number; max: number; onChange: (a: number, b: number) => void } > = ({ min, max, onChange }) => {
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const [dragging, setDragging] = useState<null | 'min' | 'max'>(null);

    const percent = (v: number) => Math.min(100, Math.max(0, ((v - 0) / (100 - 0)) * 100));

    const setFromClientX = (x: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ratio = (x - rect.left) / rect.width;
      const val = Math.round(Math.min(100, Math.max(0, ratio * 100)));
      if (dragging === 'min') {
        onChange(Math.min(val, max - 1), max);
      } else if (dragging === 'max') {
        onChange(min, Math.max(val, min + 1));
      } else {
        const distToMin = Math.abs(val - min);
        const distToMax = Math.abs(val - max);
        if (distToMin <= distToMax) onChange(Math.min(val, max - 1), max);
        else onChange(min, Math.max(val, min + 1));
      }
    };

    const onPointerMove = (e: PointerEvent) => setFromClientX(e.clientX);
    const stopDrag = () => setDragging(null);

    React.useEffect(() => {
      if (dragging) {
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', stopDrag, { once: true });
        return () => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', stopDrag as any);
        };
      }
    }, [dragging, min, max]);

    return (
      <div
        className="relative h-8 select-none"
        ref={trackRef}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(null);
          setFromClientX(e.clientX);
        }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-gray-200 rounded" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 bg-blue-500 rounded"
          style={{ left: `${percent(min)}%`, width: `${Math.max(0, percent(max) - percent(min))}%` }}
        />
        <button
          type="button"
          aria-label="Minimum age"
          className="absolute top-1/2 -translate-y-1/2 -mt-1.5 w-4 h-4 rounded-full bg-white border border-gray-400 shadow cursor-pointer"
          style={{ left: `calc(${percent(min)}% - 8px)` }}
          onPointerDown={(e) => { e.stopPropagation(); setDragging('min'); }}
        />
        <button
          type="button"
          aria-label="Maximum age"
          className="absolute top-1/2 -translate-y-1/2 -mt-1.5 w-4 h-4 rounded-full bg-white border border-gray-400 shadow cursor-pointer"
          style={{ left: `calc(${percent(max)}% - 8px)` }}
          onPointerDown={(e) => { e.stopPropagation(); setDragging('max'); }}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full items-center relative bg-[#ffffff]">
      <header className="flex-col w-full justify-center gap-2.5 px-2.5 py-3 bg-gray-25 flex items-center relative flex-[0_0_auto]">
        <nav className="w-full max-w-[1200px] justify-between flex items-center relative flex-[0_0_auto]">
          <Link to="/">
            <img
              className="relative w-[124px] h-[39px] cursor-pointer hover:opacity-80 transition-opacity"
              alt="TrialCliniq Logo"
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
            />
          </Link>
          <div className="inline-flex items-center justify-center gap-2 relative flex-[0_0_auto]">
            {navigationItems.map((item, index) => (
              <div
                key={index}
                className="inline-flex items-center justify-center gap-1 px-4 py-2 relative flex-[0_0_auto] rounded"
                onMouseEnter={() => item.label === "Patients and Families" && setIsDropdownOpen(true)}
                onClick={() => item.label === "Patients and Families" && setIsDropdownOpen((v) => !v)}
              >
                <div className="relative w-fit mt-[-1.00px] font-text-lg-medium font-[number:var(--text-lg-medium-font-weight)] text-[#181d27] text-[length:var(--text-lg-medium-font-size)] text-center tracking-[var(--text-lg-medium-letter-spacing)] leading-[var(--text-lg-medium-line-height)] whitespace-nowrap [font-style:var(--text-lg-medium-font-style)] cursor-pointer">
                  {item.label}
                </div>
                {item.hasDropdown && (
                  <div className="relative w-4 h-4 bg-[#dde1fd] rounded-[99px] overflow-hidden cursor-pointer">
                    <ChevronDownIcon className="absolute w-4 h-4 top-0 left-0" />
                  </div>
                )}

                {/* Dropdown Menu */}
                {item.label === "Patients and Families" && isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-4">
                      {dropdownItems.map((dropdownItem, dropdownIndex) => (
                        <Link
                          key={dropdownIndex}
                          to={dropdownItem.to as string}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {(() => {
                              const Icon = dropdownItem.icon;
                              return <Icon className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />;
                            })()}
                          </div>

                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">
                              {dropdownItem.title}
                            </h4>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {dropdownItem.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="inline-flex items-center justify-center gap-2 relative flex-[0_0_auto]">
            <Link to="/">
              <Button
                variant="outline"
                className="h-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 relative flex-[0_0_auto] rounded-[50px] overflow-hidden border border-solid border-[#1033e5] shadow-shadow-xs"
              >
                <div className="relative w-fit mt-[-1.00px] font-text-md-semibold font-[number:var(--text-md-semibold-font-weight)] text-[#1033e5] text-[length:var(--text-md-semibold-font-size)] tracking-[var(--text-md-semibold-letter-spacing)] leading-[var(--text-md-semibold-line-height)] whitespace-nowrap [font-style:var(--text-md-semibold-font-style)]">
                  Home
                </div>
              </Button>
            </Link>
          </div>
        </nav>
      </header>
      <main className="w-full max-w-[1200px] px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Home</span>
          <span className="text-sm text-gray-500">&gt;</span>
          <span className="text-sm text-gray-500">Search results</span>
        </div>
        <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Chronic Pain</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm">10950, Niagara falls, USA</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Within 50 miles</span>
          </div>
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm">All</span>
          </div>
          <Button size="sm" className="ml-auto bg-[#1033e5] text-white rounded-full">
            Search
          </Button>
        </div>
        <h1 className="text-2xl font-semibold mb-8">We found {filteredTrials.length} clinical trial{filteredTrials.length === 1 ? '' : 's'} that match your search.</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Refine Your Results</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Eligibility</h4>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Accepts healthy volunteers</span>
                    </label>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Age Range</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{minAge}yr</span>
                      <span className="text-xs text-gray-500">to</span>
                      <span className="text-sm">{maxAge}yr</span>
                    </div>
                    <RangeSlider
                      min={minAge}
                      max={maxAge}
                      onChange={(a, b) => { setMinAge(a); setMaxAge(b); }}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Study Phase</h4>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Any phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phase1">Phase I</SelectItem>
                        <SelectItem value="phase2">Phase II</SelectItem>
                        <SelectItem value="phase3">Phase III</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Trial Type</h4>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interventional">Interventional</SelectItem>
                        <SelectItem value="observational">Observational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
          <div className="lg:col-span-3 space-y-6">
            {filteredTrials.map((trial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-[#1033e5] mb-2">{trial.title}</h3>
                    <Button size="sm" className="bg-gray-900 text-white rounded-full">
                      Check my eligibility
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPinIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{trial.location}</span>
                  </div>
                  <div className="flex gap-4">
                    <Badge variant="secondary">{trial.phase}</Badge>
                    <Badge variant="secondary">{trial.ageRange}</Badge>
                    <Badge variant="secondary">{trial.type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-center items-center gap-2 mt-8">
              <Button variant="outline" size="sm">
                <ChevronDownIcon className="w-4 h-4 rotate-90" />
              </Button>
              <Button variant="outline" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <span className="text-gray-500">...</span>
              <Button variant="outline" size="sm">
                9
              </Button>
              <Button variant="outline" size="sm">
                10
              </Button>
              <Button variant="outline" size="sm">
                <ChevronDownIcon className="w-4 h-4 -rotate-90" />
              </Button>
            </div>
          </div>
        </div>
      </main>
      <footer className="relative w-full bg-gray-50 mt-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-20">
          <div className="flex w-full items-start justify-between">
            <div className="flex flex-col w-[282px] items-start gap-4 relative">
              <img
                className="relative w-[124px] h-[39px]"
                alt="TrialCliniq Logo"
                src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2-1.png"
              />
              <p className="relative self-stretch font-text-sm-regular font-[number:var(--text-sm-regular-font-weight)] text-gray-500 text-[length:var(--text-sm-regular-font-size)] tracking-[var(--text-sm-regular-letter-spacing)] leading-[var(--text-sm-regular-line-height)] [font-style:var(--text-sm-regular-font-style)]">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et lacinia mi.
              </p>
              <img
                className="relative flex-[0_0_auto]"
                alt="Social media links"
                src="https://c.animaapp.com/mf3cenl8GIzqBa/img/socials.svg"
              />
            </div>
            <div className="inline-flex items-center gap-12 relative flex-[0_0_auto]">
              <div className="flex flex-col w-[180px] items-start gap-8 relative">
                <h4 className="relative self-stretch mt-[-1.00px] font-text-lg-regular font-[number:var(--text-lg-regular-font-weight)] text-gray-300 text-[length:var(--text-lg-regular-font-size)] tracking-[var(--text-lg-regular-letter-spacing)] leading-[var(--text-lg-regular-line-height)] [font-style:var(--text-lg-regular-font-style)]">
                  Solutions
                </h4>
                <div className="flex flex-col items-start gap-4 self-stretch w-full relative flex-[0_0_auto]">
                  {solutionsLinks.map((link, index) => (
                    <div key={index} className="relative w-[180px] h-7">
                      <div className="absolute w-[180px] h-7 -top-px left-0 font-text-lg-regular font-[number:var(--text-lg-regular-font-weight)] text-[#414651] text-[length:var(--text-lg-regular-font-size)] tracking-[var(--text-lg-regular-letter-spacing)] leading-[var(--text-lg-regular-line-height)] [font-style:var(--text-lg-regular-font-style)]">
                        {link}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col w-[180px] items-start gap-8 relative">
                <h4 className="relative self-stretch mt-[-1.00px] font-text-lg-regular font-[number:var(--text-lg-regular-font-weight)] text-gray-300 text-[length:var(--text-lg-regular-font-size)] tracking-[var(--text-lg-regular-letter-spacing)] leading-[var(--text-lg-regular-line-height)] [font-style:var(--text-lg-regular-font-style)]">
                  Company
                </h4>
                <div className="flex flex-col items-start gap-4 self-stretch w-full relative flex-[0_0_auto]">
                  {companyLinks.map((link, index) => (
                    <div key={index} className="relative w-[180px] h-7">
                      <div className="absolute w-[180px] h-7 -top-px left-0 font-text-lg-regular font-[number:var(--text-lg-regular-font-weight)] text-[#414651] text-[length:var(--text-lg-regular-font-size)] tracking-[var(--text-lg-regular-letter-spacing)] leading-[var(--text-lg-regular-line-height)] [font-style:var(--text-lg-regular-font-style)]">
                        {link}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Separator className="w-full max-w-[1200px] mx-auto" />
        <div className="flex w-full max-w-[1200px] mx-auto px-4 items-center justify-between py-4">
          <div className="relative w-[282px] mt-[-1.00px] font-text-xs-medium font-[number:var(--text-xs-medium-font-weight)] text-[#717680] text-[length:var(--text-xs-medium-font-size)] tracking-[var(--text-xs-medium-letter-spacing)] leading-[var(--text-xs-medium-line-height)] [font-style:var(--text-xs-medium-font-style)]">
            Copyright © 2025 TrialCliniq.
          </div>
          <div className="inline-flex items-center justify-center gap-6 relative flex-[0_0_auto]">
            <div className="relative w-[180px] mt-[-1.00px] font-text-xs-medium font-[number:var(--text-xs-medium-font-weight)] text-[#717680] text-[length:var(--text-xs-medium-font-size)] tracking-[var(--text-xs-medium-letter-spacing)] leading-[var(--text-xs-medium-line-height)] [font-style:var(--text-xs-medium-font-style)]">
              Website by Apperr
            </div>
          </div>
          <div className="inline-flex items-center justify-center gap-6 relative flex-[0_0_auto]">
            <div className="relative w-[180px] mt-[-1.00px] font-text-xs-medium font-[number:var(--text-xs-medium-font-weight)] text-[#717680] text-[length:var(--text-xs-medium-font-size)] tracking-[var(--text-xs-medium-letter-spacing)] leading-[var(--text-xs-medium-line-height)] [font-style:var(--text-xs-medium-font-style)]">
              Back to top
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
