"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const fetchNewsArticles = async (query) => {
  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?` +
        `q=${encodeURIComponent(query)}&` +
        `sortBy=relevancy&` +
        `language=en&` +
        `pageSize=4&` +
        `apiKey=${process.env.NEXT_PUBLIC_NEWS_API_KEY}`
    );
    const data = await response.json();

    if (data.articles) {
      return data.articles.map((article) => ({
        title: article.title,
        source: article.source.name,
        author: article.author,
        image: article.urlToImage,
        url: article.url,
        publishedAt: article.publishedAt,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
};

export default function MainPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sources, setSources] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSources([]);
    try {
      // Fetch AI response
      const genAI = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GEMINI_API_KEY
      );
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const result = await model.generateContent(query);
      const response = await result.response;
      const text = response.text();
      setAnswer(text);

      // Fetch real news sources
      const newsArticles = await fetchNewsArticles(query);
      setSources(newsArticles);
    } catch (error) {
      console.error("Error:", error);
      setAnswer("Sorry, there was an error processing your request.");
    } finally {
      setLoading(false);
    }
  };

  const renderAnswer = (text) => {
    // Split the answer into sections based on headings and code blocks
    const sections = text.split(/(?=\*\*.*?\*\*|```.*?```)/s);
    const formattedSections = [];

    sections.forEach((section, index) => {
      // Handle headings
      if (section.startsWith("**") && section.includes("**")) {
        const headingText = section.replace(/\*\*/g, "").trim();
        formattedSections.push(
          <div
            key={`section-${index}`}
            className="py-12 first:pt-6 border-b border-[#2C2D32]/40 last:border-b-0"
          >
            <h2 className="text-[32px] font-semibold text-[#E6E8EB] mb-6">
              {headingText}
            </h2>
          </div>
        );
      }
      // Handle code blocks
      else if (section.includes("```")) {
        const matches = section.match(/```(\w+)?\s*\n?([\s\S]*?)```/);
        if (matches) {
          const [, language = "javascript", code = ""] = matches;
          const lastSection = formattedSections[formattedSections.length - 1];

          // If the last section is a heading, append the code block to it
          if (lastSection && lastSection.key.startsWith("section-")) {
            const sectionContent = lastSection.props.children;
            formattedSections[formattedSections.length - 1] = (
              <div
                key={lastSection.key}
                className="py-12 first:pt-6 border-b border-[#2C2D32]/40 last:border-b-0"
              >
                {sectionContent}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#6B6C70]" />
                      <div className="text-sm text-[#6B6C70]">{language}</div>
                    </div>
                    <button
                      className="text-[#6B6C70] hover:text-white p-1.5 rounded-md hover:bg-[#2C2D32] transition-colors"
                      onClick={() => navigator.clipboard.writeText(code)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M16 3H4C3.45 3 3 3.45 3 4V16C3 16.55 3.45 17 4 17H16C16.55 17 17 16.55 17 16V4C17 3.45 16.55 3 16 3ZM15 15H5V5H15V15ZM20 7H18V19H6V21C6 21.55 6.45 22 7 22H19C19.55 22 20 21.55 20 21V7Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="bg-[#1A1B1E] rounded-xl p-4 font-mono text-sm">
                    <pre className="whitespace-pre-wrap text-[#E6E8EB]">
                      {code.trim()}
                    </pre>
                  </div>
                </div>
              </div>
            );
          }
        }
      }
      // Handle regular paragraphs with citations
      else if (section.trim()) {
        const paragraphWithCitations = section
          .split(/(\[\d+\])/)
          .map((part, i) => {
            if (part.match(/^\[\d+\]$/)) {
              return (
                <sup
                  key={i}
                  className="text-xs bg-[#404145] px-1.5 py-0.5 rounded ml-0.5"
                >
                  {part.replace(/[\[\]]/g, "")}
                </sup>
              );
            }
            return part;
          });

        formattedSections.push(
          <div
            key={`text-${index}`}
            className="py-6 first:pt-6 border-b border-[#2C2D32]/40 last:border-b-0"
          >
            <p className="text-[#E6E8EB] text-[17px] leading-relaxed">
              {paragraphWithCitations}
            </p>
          </div>
        );
      }
    });

    return <div className="divide-[#2C2D32]/40">{formattedSections}</div>;
  };

  return (
    <main className="min-h-screen bg-[#1A1B1E] text-white">
      <div className="max-w-[850px] mx-auto pt-32 pb-20 px-4">
        {!answer && !loading && (
          <h1 className="text-[40px] font-medium text-center mb-12 text-[#E6E8EB]">
            What do you want to know?
          </h1>
        )}

        <Card className="bg-[#25262B] border-none shadow-xl rounded-2xl">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <div className="flex items-center gap-2 absolute left-4">
              <button
                type="button"
                className="flex items-center gap-2 text-[#6B6C70] hover:text-white text-sm font-medium"
                onClick={() => setFocusMode(!focusMode)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15.65 5.7L10.33 3.3C7.54 2.1 6.14 2.97 6.14 6.05V17.96C6.14 21.04 7.54 21.91 10.33 20.71L15.65 18.31C18.44 17.11 19.83 15.23 19.83 12.01C19.83 8.79 18.44 6.9 15.65 5.7Z"
                    fill="currentColor"
                  />
                </svg>
                Focus
              </button>
            </div>
            <Input
              placeholder="Ask anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-none text-[17px] py-7 pl-24 pr-36 focus:ring-0 placeholder-[#6B6C70]"
            />
            <div className="absolute right-3 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-[#6B6C70] hover:text-white hover:bg-[#2C2D32] h-8 w-8"
              >
                <LinkIcon className="h-[18px] w-[18px]" />
              </Button>
              <div className="w-[1px] h-5 bg-[#404145]" />
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#404145]" />
                <span className="text-[#6B6C70] text-sm font-medium">Pro</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-[#6B6C70] rotate-[270deg]"
                >
                  <path
                    fill="currentColor"
                    d="M9.29 15.88L13.17 12 9.29 8.12c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0l4.59 4.59c.39.39.39 1.02 0 1.41L10.7 17.3c-.39.39-1.02.39-1.41 0-.38-.39-.39-1.03 0-1.42z"
                  />
                </svg>
              </div>
            </div>
          </form>
        </Card>

        {loading && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-2 text-[#E6E8EB] text-lg">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Searching...
            </div>
            <Card className="bg-[#25262B] border-none p-6 rounded-2xl animate-pulse">
              <div className="h-4 bg-[#404145] rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-[#404145] rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-[#404145] rounded w-5/6"></div>
            </Card>
          </div>
        )}

        {answer && !loading && (
          <>
            {sources.length > 0 && (
              <div className="mt-8 mb-4">
                <h2 className="text-[#E6E8EB] text-lg font-medium mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.82 14.26C20.59 12.99 21 11.54 21 10C21 5.03 16.97 1 12 1C7.03 1 3 5.03 3 10C3 14.97 7.03 19 12 19H19C20.1 19 21 18.1 21 17V16.27C21 15.5 20.5 14.77 19.82 14.26ZM12 17C8.13 17 5 13.87 5 10C5 6.13 8.13 3 12 3C15.87 3 19 6.13 19 10C19 10.96 18.81 11.87 18.48 12.72C18.45 12.77 18.42 12.83 18.39 12.88C18.31 13.05 18.23 13.21 18.14 13.37L18.11 13.42C17.99 13.61 17.86 13.8 17.72 13.97L17.66 14.04C17.52 14.21 17.37 14.37 17.21 14.52L17.15 14.57C16.99 14.72 16.82 14.86 16.65 14.99L16.56 15.06C16.39 15.19 16.22 15.31 16.04 15.41L15.98 15.45C15.78 15.57 15.58 15.67 15.38 15.76L15.27 15.81C15.07 15.89 14.87 15.96 14.66 16.02L14.53 16.07C14.32 16.12 14.1 16.17 13.88 16.2L13.76 16.22C13.52 16.25 13.27 16.27 13.02 16.27H13C12.74 16.27 12.49 16.25 12.24 16.22L12.12 16.2C11.9 16.17 11.69 16.13 11.47 16.07L11.34 16.02C11.13 15.96 10.92 15.89 10.73 15.81L10.62 15.76C10.42 15.67 10.22 15.57 10.02 15.45L9.96 15.41C9.78 15.31 9.61 15.19 9.44 15.06L9.35 14.99C9.18 14.86 9.01 14.71 8.85 14.57L8.79 14.52C8.63 14.37 8.48 14.21 8.34 14.04L8.28 13.97C8.14 13.8 8.01 13.61 7.89 13.42L7.86 13.37C7.77 13.21 7.69 13.05 7.61 12.88C7.58 12.83 7.55 12.77 7.52 12.72C7.19 11.87 7 10.96 7 10C7 7.24 9.24 5 12 5C14.76 5 17 7.24 17 10C17 12.76 14.76 15 12 15V17ZM14.17 11.17L12 9L9.83 11.17L11 12.34V15H13V12.34L14.17 11.17Z"
                      fill="currentColor"
                    />
                  </svg>
                  Sources
                </h2>
                <div className="grid grid-cols-12 gap-4">
                  {sources.length > 0 && (
                    <div className="col-span-12 md:col-span-5">
                      <a
                        href={sources[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:opacity-80 transition-opacity"
                      >
                        <Card className="bg-[#25262B] border-none overflow-hidden rounded-xl">
                          <div className="relative h-48">
                            <img
                              src={sources[0].image}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  "https://placehold.co/800x400?text=No+Image";
                              }}
                            />
                          </div>
                          <div className="p-4">
                            <p className="text-[#E6E8EB] text-base font-medium mb-2 line-clamp-2">
                              {sources[0].title}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <img
                                  src={`https://www.google.com/s2/favicons?domain=${
                                    new URL(sources[0].url).hostname
                                  }&sz=32`}
                                  alt=""
                                  className="w-4 h-4 rounded-full"
                                />
                                <span className="text-[#6B6C70] text-sm">
                                  {sources[0].source}
                                </span>
                              </div>
                              {sources[0].author && (
                                <>
                                  <span className="text-[#404145]">•</span>
                                  <span className="text-[#6B6C70] text-sm">
                                    {sources[0].author}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </Card>
                      </a>
                    </div>
                  )}
                  <div className="col-span-12 md:col-span-7">
                    <div className="space-y-3">
                      {sources.slice(1).map((source, index) => (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          key={index}
                          className="block hover:opacity-80 transition-opacity"
                        >
                          <Card className="bg-[#25262B] border-none p-3 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-[#E6E8EB] text-sm font-medium mb-1.5 line-clamp-2">
                                  {source.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <img
                                      src={`https://www.google.com/s2/favicons?domain=${
                                        new URL(source.url).hostname
                                      }&sz=32`}
                                      alt=""
                                      className="w-4 h-4 rounded-full"
                                    />
                                    <span className="text-[#6B6C70] text-sm">
                                      {source.source}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {source.image && (
                                <img
                                  src={source.image}
                                  alt=""
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src =
                                      "https://placehold.co/400x400?text=No+Image";
                                  }}
                                />
                              )}
                            </div>
                          </Card>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Card className="mt-4 bg-[#25262B] border-none p-6 rounded-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="text-[#E6E8EB] text-lg font-medium">
                    Answer
                  </span>
                </div>
                {renderAnswer(answer)}
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
