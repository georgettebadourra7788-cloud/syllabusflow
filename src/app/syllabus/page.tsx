"use client";

import { useMemo, useState, type FormEvent } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { getFirebaseDb } from "@/lib/firebase";
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
          });
        });
    });
  });

  return { nodes, edges };
}

export default function SyllabusPage() {
  const [topic, setTopic] = useState("");
  const [weeks, setWeeks] = useState(6);
  const [skillLevel, setSkillLevel] = useState<(typeof SKILL_LEVELS)[number]>("beginner");
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [busy, setBusy] = useState<"idle" | "generating" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const flow = useMemo(() => (syllabus ? buildFlow(syllabus) : null), [syllabus]);

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setBusy("generating");
    setError(null);
    setSavedId(null);
    setSyllabus(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, weeks, skillLevel }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "Couldn't generate a syllabus. Try again.",
        );
      }

      setSyllabus((await response.json()) as Syllabus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy("idle");
    }
  }

  async function handleSave() {
    if (!syllabus) return;
    setBusy("saving");
    setError(null);

    try {
      const docRef = await addDoc(collection(getFirebaseDb(), "syllabi"), {
        ...syllabus,
        createdAt: serverTimestamp(),
      });
      setSavedId(docRef.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save to Firebase");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1>SyllabusFlow</h1>
      <p>Describe a course and get a structured, week-by-week syllabus.</p>

      <form
        onSubmit={handleGenerate}
        style={{ display: "grid", gap: "1rem", maxWidth: 420, marginBottom: "2rem" }}
      >
        <label style={{ display: "grid", gap: "0.25rem" }}>
          Topic
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Intro to Machine Learning"
            required
            style={{ padding: "0.5rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          Weeks
          <input
            type="number"
            min={1}
            max={52}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            required
            style={{ padding: "0.5rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          Skill level
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value as (typeof SKILL_LEVELS)[number])}
            style={{ padding: "0.5rem" }}
          >
            {SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={busy === "generating"} style={{ padding: "0.6rem" }}>
          {busy === "generating" ? "Generating…" : "Generate syllabus"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {syllabus && (
        <section>
          <h2>{syllabus.courseTitle}</h2>
          <p>
            {syllabus.durationWeeks} weeks · {syllabus.targetAudience}
          </p>

          {flow && flow.nodes.length > 0 && (
            <div style={{ height: 400, border: "1px solid #ddd", marginBottom: "2rem" }}>
              <ReactFlow nodes={flow.nodes} edges={flow.edges} fitView>
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          )}

          {syllabus.modules.map((mod, i) => (
            <div key={i} style={{ marginBottom: "1.5rem" }}>
              <h3>{mod.title}</h3>
              <ul>
                {mod.lessons.map((lesson) => (
                  <li key={lesson.key} style={{ marginBottom: "0.75rem" }}>
                    <strong>{lesson.title}</strong>
                    <p style={{ margin: "0.25rem 0" }}>{lesson.summary}</p>
                    <p style={{ margin: "0.25rem 0" }}>
                      <em>Objectives:</em> {lesson.learningObjectives.join("; ")}
                    </p>
                    {lesson.prerequisiteLessonKeys.length > 0 && (
                      <p style={{ margin: "0.25rem 0" }}>
                        <em>Prerequisites:</em> {lesson.prerequisiteLessonKeys.join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button onClick={handleSave} disabled={busy === "saving"} style={{ padding: "0.6rem" }}>
            {busy === "saving" ? "Saving…" : "Save to Firebase"}
          </button>
          {savedId && <p>Saved as {savedId}</p>}
        </section>
      )}
    </main>
  );
}
