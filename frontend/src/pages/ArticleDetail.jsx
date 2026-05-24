import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Calendar, Dumbbell, Sun, Moon } from "lucide-react";
import axios from "axios";

export default function ArticleDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    fetchData();
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, [id]);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
  };

  const fetchData = async () => {
    try {
      const [artRes, homeRes] = await Promise.all([
        axios.get(
          `${window.location.protocol}//${window.location.hostname}:3000/api/articles/${id}`,
        ),
        axios.get(
          `${window.location.protocol}//${window.location.hostname}:3000/api/public/home`,
        ),
      ]);
      setArticle(artRes.data);
      setSettings(homeRes.data.settings);
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Sanitasi HTML dari Quill: hapus semua inline style
  const sanitizeQuillHtml = (html) => {
    if (!html) return "";
    return html
      .replace(/\sstyle="[^"]*"/gi, "") // hapus semua inline style
      .replace(/\sclass="ql-[^"]*"/gi, "") // hapus class bawaan quill
      .replace(/&nbsp;/gi, " ") // ganti non-breaking space HTML entity dengan spasi biasa
      .replace(/\u00A0/g, " "); // ganti karakter non-breaking space (U+00A0) dengan spasi biasa
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  if (!article)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        Artikel tidak ditemukan.
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col transition-colors">
      {/* Minimal Header */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Kembali ke Beranda</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 bg-slate-800 rounded-full"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="flex items-center gap-2 opacity-50">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="w-6 h-6 object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <Dumbbell size={20} />
              )}
              <span className="font-bold tracking-wider">
                {settings?.name || "M-GYM"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 box-border">
        <article className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          {article.cover_url && (
            <div className="w-full h-[30vh] sm:h-[50vh] bg-slate-100 dark:bg-slate-700">
              <img
                src={article.cover_url}
                alt="Cover"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            </div>
          )}

          <div className="p-6 sm:p-10 box-border w-full">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 mb-10 pb-6 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                  <User size={16} />
                </div>
                <span className="font-medium">{article.author || "Admin"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <Calendar size={16} />
                </div>
                <span className="font-medium">
                  {new Date(article.CreatedAt).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div
              className="article-body prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-2xl prose-img:shadow-md"
              dangerouslySetInnerHTML={{
                __html: sanitizeQuillHtml(article.content),
              }}
            />
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        &copy; {new Date().getFullYear()} {settings?.name || "M-GYM"}. All
        rights reserved.
      </footer>
    </div>
  );
}
