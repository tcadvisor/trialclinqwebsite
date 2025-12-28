import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock } from "lucide-react";
import HomeHeader from "../../components/HomeHeader";
import { getArticleById } from "../../lib/blogArticles";

export default function BlogArticle(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const article = id ? getArticleById(id) : null;

  if (!article) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <HomeHeader />
        <main className="max-w-3xl mx-auto px-4 py-10">
          <button
            onClick={() => navigate("/sites/blog")}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </button>
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700 font-medium">Article not found</p>
            <p className="text-red-600 text-sm mt-2">
              The article you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const formattedDate = new Date(article.publishedDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate("/sites/blog")}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </button>

        <article className="prose prose-sm max-w-none">
          <div className="mb-8">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full mb-4">
              {article.category}
            </span>
            <h1 className="text-4xl font-bold mb-4">{article.title}</h1>

            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{article.readTime} min read</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-8">
            <div className="prose prose-sm max-w-none space-y-6">
              {article.content.split("\n").map((line, idx) => {
                // Headers
                if (line.startsWith("# ")) {
                  return (
                    <h1 key={idx} className="text-3xl font-bold mt-8 mb-4">
                      {line.replace(/^# /, "")}
                    </h1>
                  );
                }
                if (line.startsWith("## ")) {
                  return (
                    <h2 key={idx} className="text-2xl font-bold mt-6 mb-3">
                      {line.replace(/^## /, "")}
                    </h2>
                  );
                }
                if (line.startsWith("### ")) {
                  return (
                    <h3 key={idx} className="text-xl font-bold mt-5 mb-2">
                      {line.replace(/^### /, "")}
                    </h3>
                  );
                }

                // Bold text
                if (line.includes("**")) {
                  const parts = line.split(/(\*\*[^*]+\*\*)/);
                  return (
                    <p key={idx} className="text-gray-700 leading-relaxed">
                      {parts.map((part, i) =>
                        part.startsWith("**") ? (
                          <strong key={i}>{part.replace(/\*\*/g, "")}</strong>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  );
                }

                // Lists
                if (line.startsWith("- ")) {
                  return (
                    <div key={idx} className="flex gap-3 text-gray-700">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{line.replace(/^- /, "")}</span>
                    </div>
                  );
                }

                // Numbered lists
                if (line.match(/^\d+\. /)) {
                  const match = line.match(/^(\d+)\. (.+)$/);
                  if (match) {
                    return (
                      <div key={idx} className="flex gap-3 text-gray-700">
                        <span className="text-blue-600 font-bold">{match[1]}.</span>
                        <span>{match[2]}</span>
                      </div>
                    );
                  }
                }

                // Regular paragraphs
                if (line.trim()) {
                  return (
                    <p key={idx} className="text-gray-700 leading-relaxed">
                      {line}
                    </p>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </article>

        <div className="mt-12 pt-8 border-t">
          <h3 className="text-lg font-semibold mb-4">More Articles</h3>
          <Link
            to="/sites/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Articles
          </Link>
        </div>
      </main>
    </div>
  );
}
