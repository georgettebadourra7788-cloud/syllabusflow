"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { doc, getDoc } from "firebase/firestore";
import { signInWithPopup } from "firebase/auth";
import { Navbar } from "@/components/Navbar";
import { getFirebaseAuth, getFirebaseDb, googleAuthProvider } from "@/lib/firebase";
import { useAuthUser } from "@/lib/useAuthUser";
import { FREE_MAX_WEEKS, FREE_MONTHLY_GENERATIONS, type UsageDoc } from "@/lib/plan";
import type { Syllabus } from "@/lib/schemas/syllabus";
import { SyllabusDocument } from "@/lib/pdf/SyllabusDocument";
import { PDF_TEMPLATES, PREMIUM_TEMPLATES, type PdfTemplate } from "@/lib/pdf/templates";

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlDocument(syllabus: Syllabus, lessonTitles: Map<string, string>): string {
  const modulesHtml = syllabus.modules
    .map(
      (mod, i) => `
        <section class="module">
          <div class="module-header">
            <span class="module-number">${i + 1}</span>
            <h2>${escapeHtml(mod.title)}</h2>
          </div>
          <div class="lessons">
            ${mod.lessons
              .map(
                (lesson) => `
              <div class="lesson">
                <h3 class="lesson-title">${escapeHtml(lesson.title)}</h3>
                <p class="lesson-summary">${escapeHtml(lesson.summary)}</p>
                ${
                  lesson.learningObjectives.length > 0
                    ? `<p class="objectives-label">Objectives</p>
                       <ul class="objectives">${lesson.learningObjectives
                        .map((o) => `<li>${escapeHtml(o)}</li>`)
                        .join("")}</ul>`
                    : ""
                }
                ${
                  lesson.prerequisiteLessonKeys.length > 0
                    ? `<div class="requires"><span class="requires-label">Requires:</span> ${lesson.prerequisiteLessonKeys
                        .map(
                          (key, idx) =>
                            `<span class="pill pill-amber">${escapeHtml(lessonTitles.get(key) ?? key)}${
                              idx < lesson.prerequisiteLessonKeys.length - 1 ? "," : ""
                            }</span>`,
                        )
                        .join("")}</div>`
                    : ""
                }
              </div>`,
              )
              .join("")}
          </div>
        </section>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(syllabus.courseTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 3rem 1.5rem;
    background: #f8fafc;
    color: #0f172a;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.875rem; font-weight: 700; margin: 0 0 0.75rem; }
  h2 { font-size: 1.125rem; font-weight: 600; margin: 0; }
  h3.lesson-title { font-size: 1rem; font-weight: 600; margin: 0 0 0.375rem; }
  .badges { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 2.5rem; }
  .badge {
    display: inline-flex; align-items: center; border-radius: 9999px;
    padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 600;
  }
  .badge-weeks { background: #eef2ff; color: #4338ca; }
  .badge-audience { background: #f5f3ff; color: #6d28d9; }
  .module { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; }
  .module-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
  .module-number {
    display: flex; align-items: center; justify-content: center;
    width: 2rem; height: 2rem; border-radius: 9999px; flex-shrink: 0;
    background: #eef2ff; color: #4338ca; font-weight: 600; font-size: 0.875rem;
  }
  .lessons { display: flex; flex-direction: column; gap: 1.25rem; padding-left: 2.75rem; }
  .lesson { border-top: 1px solid #f1f5f9; padding-top: 1.25rem; }
  .lesson:first-child { border-top: none; padding-top: 0; }
  .lesson-summary { font-size: 0.875rem; line-height: 1.6; color: #475569; margin: 0 0 0.75rem; }
  .objectives-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; margin: 0 0 0.375rem; }
  .objectives { margin: 0 0 0.75rem; padding-left: 1.25rem; font-size: 0.875rem; line-height: 1.6; color: #334155; }
  .objectives li { margin-bottom: 0.25rem; }
  .pills { display: flex; flex-wrap: wrap; gap: 0.375rem; }
  .requires { margin-top: 0.75rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem; }
  .requires-label { font-size: 0.75rem; font-weight: 500; color: #94a3b8; }
  .pill { display: inline-flex; align-items: center; border-radius: 9999px; background: #f1f5f9; color: #475569; padding: 0.25rem 0.625rem; font-size: 0.75rem; font-weight: 500; }
  .pill-amber { background: #fffbeb; color: #b45309; }
  @media print {
    body { background: #fff; padding: 0; }
    .module { break-inside: avoid; box-shadow: none; }
  }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(syllabus.courseTitle)}</h1>
  <div class="badges">
    <span class="badge badge-weeks">${syllabus.durationWeeks} weeks</span>
    <span class="badge badge-audience">${escapeHtml(syllabus.targetAudience)}</span>
  </div>
  ${modulesHtml}
</main>
</body>
</html>`;
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
  const { user, loading: authLoading } = useAuthUser();
  const [usage, setUsage] = useState<UsageDoc | null>(null);
  const [topic, setTopic] = useState("");
  const [weeks, setWeeks] = useState(6);
  const [skillLevel, setSkillLevel] = useState<(typeof SKILL_LEVELS)[number]>("beginner");
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [busy, setBusy] = useState<"idle" | "generating">("idle");
  const [error, setError] = useState<string | null>(null);
  const [limitCode, setLimitCode] = useState<"WEEKS_LIMIT" | "GENERATIONS_LIMIT" | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [template, setTemplate] = useState<PdfTemplate>("basic");
  const [pdfBusy, setPdfBusy] = useState(false);

  const isPaid = usage?.plan === "paid";
  const maxWeeks = isPaid ? 52 : FREE_MAX_WEEKS;
  const effectiveTemplate = isPaid ? template : "basic";
  const theme = PDF_TEMPLATES[effectiveTemplate];
  // Mirrors the PDF's fontFamily choice so the on-page preview matches what
  // gets downloaded — the PDF's built-in Times-Roman isn't a web font, so
  // map it to an equivalent serif stack here.
  const previewFontFamily =
    theme.fontFamily === "Times-Roman" ? "Georgia, 'Times New Roman', Times, serif" : undefined;

  useEffect(() => {
    if (busy !== "generating") return;
    setElapsedSeconds(0);
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [busy]);

  async function refreshUsage(uid: string) {
    try {
      const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
      setUsage(snap.exists() ? (snap.data() as UsageDoc) : null);
    } catch (err) {
      console.error("Failed to load usage:", err);
    }
  }

  useEffect(() => {
    if (user) refreshUsage(user.uid);
    else setUsage(null);
  }, [user]);

  const flow = useMemo(() => (syllabus ? buildFlow(syllabus) : null), [syllabus]);
  const lessonTitles = useMemo(() => (syllabus ? buildLessonTitleLookup(syllabus) : null), [syllabus]);

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setBusy("generating");
    setError(null);
    setLimitCode(null);
    setSyllabus(null);

    try {
      // Force a refresh rather than trusting the SDK's cached token — on
      // mobile, backgrounding the tab throttles Firebase's proactive
      // refresh timer, so a signed-in user can still be holding an
      // already-expired cached token that only surfaces as a 401 here.
      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ topic, weeks, skillLevel }),
      });
      console.log("[generate] response status:", response.status);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error("[generate] error response body:", body);
        if (body.code === "WEEKS_LIMIT" || body.code === "GENERATIONS_LIMIT") {
          setLimitCode(body.code);
        }
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
      refreshUsage(user.uid);
    }
  }

  async function handleSignIn() {
    try {
      await signInWithPopup(getFirebaseAuth(), googleAuthProvider);
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
  }

  function handleDownloadHtml() {
    if (!syllabus || !lessonTitles) return;

    const blob = new Blob([buildHtmlDocument(syllabus, lessonTitles)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(syllabus.courseTitle)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    if (!syllabus || !lessonTitles) return;

    setPdfBusy(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <SyllabusDocument
          syllabus={syllabus}
          lessonTitles={lessonTitles}
          template={effectiveTemplate}
          watermark={!isPaid}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(syllabus.courseTitle)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("Couldn't generate the PDF. Please try again.");
    } finally {
      setPdfBusy(false);
    }
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
            {user && (
              <p className="text-center text-xs font-medium text-slate-500">
                {isPaid
                  ? "Unlimited generations — Pro plan"
                  : `${Math.max(0, FREE_MONTHLY_GENERATIONS - (usage?.generationsThisMonth ?? 0))} of ${FREE_MONTHLY_GENERATIONS} free generations left this month`}
              </p>
            )}

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
                <span className="text-sm font-medium text-slate-700">
                  Weeks {!isPaid && <span className="font-normal text-slate-400">(max {FREE_MAX_WEEKS} on free)</span>}
                </span>
                <input
                  type="number"
                  min={1}
                  max={maxWeeks}
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

            {user ? (
              <button
                type="submit"
                disabled={busy === "generating"}
                className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
              >
                {busy === "generating" ? `Generating… (${elapsedSeconds}s)` : "Generate syllabus"}
              </button>
            ) : (
              <button
                type="button"
                disabled={authLoading}
                onClick={handleSignIn}
                className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300 disabled:opacity-60"
              >
                Sign in to generate
              </button>
            )}

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
            {limitCode && (
              <Link href="/upgrade" className="mt-2 block font-semibold text-red-800 underline">
                Upgrade to remove this limit →
              </Link>
            )}
          </div>
        )}

        {syllabus && (
          <section className="mt-16" style={{ fontFamily: previewFontFamily }}>
            <div
              className={`rounded-2xl border bg-white shadow-sm shadow-slate-200/60 ${
                effectiveTemplate === "modern" ? "p-10" : "p-8"
              } ${theme.titleAlign === "center" ? "text-center" : ""}`}
              style={{ borderColor: theme.border }}
            >
              <h2 className="text-2xl font-bold" style={{ color: theme.text }}>
                {syllabus.courseTitle}
              </h2>
              <div className={`mt-3 flex flex-wrap gap-2 ${theme.titleAlign === "center" ? "justify-center" : ""}`}>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
                >
                  {syllabus.durationWeeks} weeks
                </span>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
                >
                  {syllabus.targetAudience}
                </span>
              </div>

              {syllabus.courseOverview && (
                <p className="mt-4 text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                  {syllabus.courseOverview}
                </p>
              )}

              {syllabus.learningOutcomes && syllabus.learningOutcomes.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Learning outcomes
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {syllabus.learningOutcomes.map((outcome, idx) => (
                      <li key={idx}>{outcome}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {flow && flow.nodes.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Prerequisite map</h3>
                </div>
                <div style={{ height: 400 }}>
                  <ReactFlow
                    nodes={flow.nodes}
                    edges={flow.edges}
                    fitView
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background color="#e2e8f0" />
                    <Controls />
                  </ReactFlow>
                </div>
              </div>
            )}

            <div className={`mt-6 grid ${effectiveTemplate === "modern" ? "gap-8" : "gap-6"}`}>
              {syllabus.modules.map((mod, i) => (
                <div
                  key={i}
                  className={
                    theme.formalDividers
                      ? `border-y-2 py-6 ${effectiveTemplate === "modern" ? "px-10" : "px-6"}`
                      : `rounded-2xl border bg-white shadow-sm shadow-slate-200/60 ${
                          effectiveTemplate === "modern" ? "p-8" : "p-6"
                        }`
                  }
                  style={theme.formalDividers ? { borderColor: theme.accent } : { borderColor: theme.border }}
                >
                  {theme.formalDividers ? (
                    <h3 className="text-center text-lg font-semibold uppercase tracking-wide" style={{ color: theme.text }}>
                      {mod.title}
                    </h3>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                        style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
                      >
                        {i + 1}
                      </span>
                      <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
                        {mod.title}
                      </h3>
                    </div>
                  )}

                  <ul className="mt-5 grid gap-5 sm:pl-11">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.key} className="border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
                        <h4 className="font-semibold text-slate-900">{lesson.title}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{lesson.summary}</p>

                        {lesson.learningObjectives.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Objectives
                            </p>
                            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
                              {lesson.learningObjectives.map((objective, idx) => (
                                <li key={idx}>{objective}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {lesson.prerequisiteLessonKeys.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-400">Requires:</span>
                            {lesson.prerequisiteLessonKeys.map((key, idx) => (
                              <span
                                key={key}
                                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                                style={{ backgroundColor: theme.pillBg, color: theme.pillText }}
                              >
                                {lessonTitles?.get(key) ?? key}
                                {idx < lesson.prerequisiteLessonKeys.length - 1 ? "," : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {mod.references && mod.references.length > 0 && (
                    <div className="mt-5 sm:pl-11">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        References
                      </p>
                      <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                        {mod.references.map((ref, idx) => (
                          <li key={idx}>{ref}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {syllabus.assessment && syllabus.assessment.length > 0 && (
              <div
                className={`mt-6 rounded-2xl border bg-white shadow-sm shadow-slate-200/60 ${
                  effectiveTemplate === "modern" ? "p-8" : "p-6"
                }`}
                style={{ borderColor: theme.border }}
              >
                <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
                  Assessment
                </h3>
                <div className="mt-4 grid gap-4">
                  {syllabus.assessment.map((component, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-semibold" style={{ color: theme.text }}>
                          {component.name}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: theme.accent }}>
                          {component.weight}
                        </p>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                        {component.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              {isPaid && (
                <div className="mx-auto mb-4 flex max-w-md flex-col items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">PDF template</span>
                  <div className="flex gap-2">
                    {(["basic", ...PREMIUM_TEMPLATES] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTemplate(id)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                          effectiveTemplate === id
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {PDF_TEMPLATES[id].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={handleDownloadPdf}
                  disabled={pdfBusy}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
                >
                  {pdfBusy ? "Preparing PDF…" : "Download as PDF"}
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >
                  Download as HTML
                </button>
              </div>
              {!isPaid && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  Free PDFs include a SyllabusFlow watermark.{" "}
                  <Link href="/upgrade" className="font-semibold text-indigo-600 underline">
                    Upgrade
                  </Link>{" "}
                  to remove it and unlock premium templates.
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
