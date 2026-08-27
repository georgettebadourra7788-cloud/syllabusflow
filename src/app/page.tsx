import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const STEPS = [
  {
    title: "Describe your course",
    description: "Give a topic, duration, and skill level — that's all SyllabusFlow needs to get started.",
  },
  {
    title: "AI drafts the structure",
    description: "Gemini generates weekly modules, lessons, objectives, and prerequisites as structured data.",
  },
  {
    title: "Review & save",
    description: "See the syllabus and its prerequisite map, then save it straight to Firestore.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center blur-3xl"
        >
          <div className="h-[480px] w-[480px] rounded-full bg-gradient-to-tr from-indigo-300 via-violet-300 to-blue-200 opacity-40" />
        </div>

        <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-24 pt-24 text-center sm:pt-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            AI-powered course design
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Turn any topic into a{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              structured syllabus
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-slate-600">
            SyllabusFlow generates week-by-week course syllabi — modules, lessons, learning
            objectives, and prerequisites — from nothing but a topic and a skill level.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/syllabus"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300"
            >
              Generate a syllabus
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-slate-200 bg-white px-8 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              See how it works
            </a>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
