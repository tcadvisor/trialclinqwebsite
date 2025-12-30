import React from "react";
import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";

export default function TeamPage() {
  const teamMembers = [
    {
      name: "Dr. Jontel Pierce, MD",
      role: "Founder & CEO",
      description:
        "Neurologist and clinical researcher with expertise in Alzheimer's disease and patient recruitment.",
      linkedin: "https://www.linkedin.com/in/jontelpierce/",
    },
    {
      name: "Chandler Stevenson",
      role: "Technical Advisor",
      description:
        "Software engineer and Princeton University PhD candidate with expertise in neural networks and AI.",
      linkedin: "https://www.linkedin.com/in/chandler-stevenson-717436202/",
    },
    {
      name: "Kiara Lee, PhD",
      role: "Clinical Trials Lead",
      description:
        "Background in biomedical engineering, global public health and health equity.",
      linkedin: "https://www.linkedin.com/in/kiara-lee7/",
    },
    {
      name: "Janette Obi",
      role: "Legal Counsel",
      description:
        "Corporate attorney with expertise in privacy and data security, cloud, IP, product development, and global commercial transactions.",
      linkedin: "https://linkedin.com",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
              alt="TrialClinIQ"
              className="h-8 w-auto"
            />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="/#features" className="text-gray-700 hover:text-gray-900">
              Features
            </a>
            <a href="/#about" className="text-gray-700 hover:text-gray-900">
              About
            </a>
            <a href="/#sponsors-form" className="text-gray-700 hover:text-gray-900">
              For Sponsors & Sites
            </a>
            <a href="/team" className="text-gray-700 hover:text-gray-900">
              Team
            </a>
            <a href="/#contact" className="text-gray-700 hover:text-gray-900">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              to="/app"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Go to App
            </Link>
          </div>
        </div>
      </header>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Our Team
            </h1>
            <p className="text-lg text-gray-600">
              Meet the experts driving innovation in clinical research
            </p>
          </div>

          <div className="space-y-4">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-8 flex items-start justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-blue-600 font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {member.description}
                  </p>
                </div>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-6 text-blue-600 hover:text-blue-700 flex-shrink-0"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2024 TrialClinIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Users icon since it's not imported
function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}
