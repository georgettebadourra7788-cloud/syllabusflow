"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { Navbar } from "@/components/Navbar";
import type { Syllabus } from "@/lib/schemas/syllabus";

const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

function buildFlow(syllabus: Syllabus): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const knownKeys = new Set<string>();

  syllabus.modules.forEach((mod, moduleIndex) => {
    mod.lessons.forEach((lesson, lessonIndex) => {
      knownKeys.add(lesson.key);
      nodes.push({
        id: lesson.key,
        position: { x: lessonIndex * 240, y: moduleIndex * 150 },
        data: { label: `${mod.title}\n${lesson.title}` },
        style: {
          whiteSpace: "pre-line",
          fontSize: 12,
          width: 200,
          textAlign: "center",
          borderRadius: 12,
          border: "1px solid #c7d2fe",
          background: "#eef2ff",
          color: "#312e81",
          padding: 8,
        },
      });
    });
  });

  const edges: Edge[] = [];
  syllabus.modules.forEach((mod) => {
    mod.lessons.forEach((lesson) => {
      lesson.prerequisiteLessonKeys
        .filter((key) => knownKeys.has(key) && key !== lesson.key)
        .forEach((prereqKey) => {
          edges.push({
            id: `${prereqKey}->${lesson.key}`,
            source: prereqKey,
            target: lesson.key,
            style: { stroke: "#818cf8" },
          });
        });
    });
  });

  return { nodes, edges };
}

function buildMarkdown(syllabus: Syllabus): string {
  const lines: string[] = [
    `# ${syllabus.courseTitle}`,
    "",
    `${syllabus.durationWeeks} weeks · ${syllabus.targetAudience}`,
    "",
  ];

  syllabus.modules.forEach((mod, i) => {
    lines.push(`## ${i + 1}. ${mod.title}`, "");

    mod.lessons.forEach((lesson) => {
      lines.push(`### ${lesson.title}`, "", lesson.summary, "");

      if (lesson.learningObjectives.length > 0) {
        lines.push("**Objectives:**");
        lesson.learningObjectives.forEach((objective) => lines.push(`- ${objective}`));
        lines.push("");
      }

      if (lesson.prerequisiteLessonKeys.length > 0) {
        lines.push(`**Requires:** ${lesson.prerequisiteLessonKeys.join(", ")}`, "");
      }
    });
  });

  return lines.join("\n");
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "syllabus"
  );
}

function buildLessonTitleLookup(syllabus: Syllabus): Map<string, string> {
  const lookup = new Map<string, string>();
  syllabus.modules.forEach((mod) => {
    mod.lessons.forEach((lesson) => {
      lookup.set(lesson.key, lesson.title);
    });
  });
  return lookup;
}

const inputClasses =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

export default function SyllabusPage() {
  const [topic, setTopic] = useState("");
  const [weeks, setWeeks] = useState(6);
  const [skillLevel, setSkillLevel] = useState<(typeof SKILL_LEVELS)[number]>("beginner");
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [busy, setBusy] = useState<"idle" | "generating">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (busy !== "generating") return;
    setElapsedSeconds(0);
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [busy]);

  const flow = useMemo(() => (syllabus ? buildFlow(syllabus) : null), [syllabus]);
  const lessonTitles = useMemo(() => (syllabus ? buildLessonTitleLookup(syllabus) : null), [syllabus]);

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setBusy("generating");
    setError(null);
    setSyllabus(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, weeks, skillLevel }),
      });
      console.log("[generate] response status:", response.status);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error("[generate] error response body:", body);
        throw new Error(
          typeof body.error === "string" && body.error.length > 0
            ? body.error
            : "Couldn't generate a syllabus. Try again.",
        );
      }

      const data = (await response.json()) as Syllabus;
      console.log("[generate] success:", data);
      setSyllabus(data);
    } catch (err) {
      console.error("[generate] caught error:", err);
      setError(err instanceof Error && err.message ? err.message : "Something went wrong");
    } finally {
      setBusy("idle");
    }
  }

  function handleDownload() {
    if (!syllabus) return;

    const blob = new Blob([buildMarkdown(syllabus)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(syllabus.courseTitle)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Syllabus generator
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Describe a course, get a syllabus
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Fill in the topic, length, and skill level. SyllabusFlow drafts the weekly modules,
            lessons, objectives, and prerequisites for you.
          </p>
        </div>

        <form
          onSubmit={handleGenerate}
          className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/60"
        >
          <div className="grid gap-5">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">Topic</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Intro to Machine Learning"
                required
                className={inputClasses}
              />
            </label>

            <div className="grid grid-cols-2 gap-5">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Weeks</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  required
                  className={inputClasses}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">Skill level</span>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as (typeof SKILL_LEVELS)[number])}
                  className={`${inputClasses} capitalize`}
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level} value={level} className="capitalize">
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={busy === "generating"}
              className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
            >
              {busy === "generating" ? `Generating… (${elapsedSeconds}s)` : "Generate syllabus"}
            </button>

            {busy === "generating" && (
              <p className="text-center text-sm text-slate-500">
                This can take up to a minute — the AI is drafting every lesson in detail. Please
                don&apos;t close this tab.
              </p>
            )}
          </div>
        </form>

        {error && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {syllabus && (
          <section className="mt-16">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/60">
              <h2 className="text-2xl font-bold text-slate-900">{syllabus.courseTitle}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {syllabus.durationWeeks} weeks
                </span>
                <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  {syllabus.targetAudience}
                </span>
              </div>
            </div>

            {flow && flow.nodes.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Prerequisite map</h3>
                </div>
                <div style={{ height: 400 }}>
                  <ReactFlow nodes={flow.nodes} edges={flow.edges} fitView>
                    <Background color="#e2e8f0" />
                    <Controls />
                  </ReactFlow>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-6">
              {syllabus.modules.map((mod, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">{mod.title}</h3>
                  </div>

                  <ul className="mt-5 grid gap-5 sm:pl-11">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.key} className="border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
                        <p className="font-medium text-slate-900">{lesson.title}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{lesson.summary}</p>

                        {lesson.learningObjectives.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {lesson.learningObjectives.map((objective, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {objective}
                              </span>
                            ))}
                          </div>
                        )}

                        {lesson.prerequisiteLessonKeys.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-400">Requires:</span>
                            {lesson.prerequisiteLessonKeys.map((key) => (
                              <span
                                key={key}
                                className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                              >
                                {lessonTitles?.get(key) ?? key}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleDownload}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300"
              >
                Download as Markdown
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
