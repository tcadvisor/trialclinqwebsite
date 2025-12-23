import React from "react";
import { Link } from "react-router-dom";
import HomeHeader from "../../components/HomeHeader";

export default function InsiderBlog(): JSX.Element {
  const posts = [
    {
      title: "7 tactics to accelerate site recruitment",
      excerpt: "Practical steps sites are using to cut screening times and improve referral quality.",
    },
    {
      title: "Budgeting digital recruitment for 2025",
      excerpt: "How to forecast paid, owned, and partner channels for enrollment milestones.",
    },
    {
      title: "Coordinators’ toolkit: from prescreen to consent",
      excerpt: "Templates and checklists for consistent patient communications and privacy compliance.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Insider Blog</h1>
        <p className="text-gray-600 mb-8">Industry trends, site management tips, and recruitment insights.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {posts.map((p) => (
            <article key={p.title} className="rounded-2xl border p-6 bg-white">
              <h2 className="text-xl font-semibold mb-2">{p.title}</h2>
              <p className="text-gray-600 text-sm">{p.excerpt}</p>
              <button className="mt-4 text-sm text-blue-700 hover:underline">Read article</button>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
