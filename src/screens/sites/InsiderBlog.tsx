import React from "react";
import { Link } from "react-router-dom";
import { Calendar, User, Clock } from "lucide-react";
import HomeHeader from "../../components/HomeHeader";
import { getAllArticles } from "../../lib/blogArticles";

export default function InsiderBlog(): JSX.Element {
  const articles = getAllArticles();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Insider Blog</h1>
        <p className="text-gray-600 mb-8">Industry trends, site management tips, and recruitment insights.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {articles.map((article) => {
            const formattedDate = new Date(article.publishedDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <article key={article.id} className="rounded-2xl border p-6 bg-white hover:shadow-lg transition-shadow">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {article.readTime} min
                  </span>
                </div>
                <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
                <p className="text-gray-600 text-sm mb-4">{article.excerpt}</p>
                
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 pb-4 border-t">
                  <div className="flex items-center gap-1 mt-4">
                    <User className="w-3 h-3" />
                    <span>{article.author}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-4">
                    <Calendar className="w-3 h-3" />
                    <span>{formattedDate}</span>
                  </div>
                </div>

                <Link
                  to={`/sites/blog/${article.id}`}
                  className="inline-block text-sm text-blue-700 hover:text-blue-800 font-medium hover:underline"
                >
                  Read article →
                </Link>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
