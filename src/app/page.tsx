import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1>SyllabusFlow</h1>
      <p>Generate a structured, AI-written course syllabus.</p>
      <Link href="/syllabus">Get started →</Link>
    </main>
  );
}
