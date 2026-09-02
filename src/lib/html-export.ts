import type { Syllabus } from "@/lib/schemas/syllabus";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildHtmlDocument(syllabus: Syllabus, lessonTitles: Map<string, string>): string {
  const overviewHtml = syllabus.courseOverview ? `<p class="overview">${escapeHtml(syllabus.courseOverview)}</p>` : "";

  const outcomesHtml =
    syllabus.learningOutcomes && syllabus.learningOutcomes.length > 0
      ? `<div class="section">
           <p class="section-label">Learning outcomes</p>
           <ul class="plain-list">${syllabus.learningOutcomes.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
         </div>`
      : "";

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
          ${
            mod.references && mod.references.length > 0
              ? `<div class="references">
                   <p class="objectives-label">References</p>
                   <ul class="plain-list">${mod.references.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
                 </div>`
              : ""
          }
        </section>`,
    )
    .join("");

  const materialsHtml = syllabus.materialsAndSafety
    ? `<section class="card">
         <h2 class="card-title">Materials &amp; Safety</h2>
         <div class="two-col">
           ${
             syllabus.materialsAndSafety.materials.length > 0
               ? `<div><p class="section-label">Materials</p><ul class="plain-list">${syllabus.materialsAndSafety.materials
                   .map((m) => `<li>${escapeHtml(m)}</li>`)
                   .join("")}</ul></div>`
               : ""
           }
           ${
             syllabus.materialsAndSafety.safetyNotes.length > 0
               ? `<div><p class="section-label">Safety notes</p><ul class="plain-list">${syllabus.materialsAndSafety.safetyNotes
                   .map((s) => `<li>${escapeHtml(s)}</li>`)
                   .join("")}</ul></div>`
               : ""
           }
         </div>
       </section>`
    : "";

  const milestonesHtml =
    syllabus.projectMilestones && syllabus.projectMilestones.length > 0
      ? `<section class="card">
           <h2 class="card-title">Project milestones</h2>
           ${syllabus.projectMilestones
             .map(
               (m) => `
             <div class="line-item">
               <div class="line-item-header">
                 <p class="line-item-name">${escapeHtml(m.title)}</p>
                 <p class="line-item-weight">Week ${m.week}</p>
               </div>
               <p class="line-item-description">${escapeHtml(m.description)}</p>
             </div>`,
             )
             .join("")}
         </section>`
      : "";

  const rubricHtml =
    syllabus.participationRubric && syllabus.participationRubric.length > 0
      ? `<section class="card">
           <h2 class="card-title">Participation rubric</h2>
           ${syllabus.participationRubric
             .map(
               (c) => `
             <div class="line-item">
               <p class="line-item-name">${escapeHtml(c.criterion)}</p>
               <p class="line-item-description">${escapeHtml(c.description)}</p>
             </div>`,
             )
             .join("")}
         </section>`
      : "";

  const assessmentHtml =
    syllabus.assessment && syllabus.assessment.length > 0
      ? `<section class="card">
           <h2 class="card-title">Assessment</h2>
           ${syllabus.assessment
             .map(
               (a) => `
             <div class="line-item">
               <div class="line-item-header">
                 <p class="line-item-name">${escapeHtml(a.name)}</p>
                 <p class="line-item-weight">${escapeHtml(a.weight)}</p>
               </div>
               <p class="line-item-description">${escapeHtml(a.description)}</p>
             </div>`,
             )
             .join("")}
         </section>`
      : "";

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
  .badges { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .badge {
    display: inline-flex; align-items: center; border-radius: 9999px;
    padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 600;
  }
  .badge-weeks { background: #eef2ff; color: #4338ca; }
  .badge-audience { background: #f5f3ff; color: #6d28d9; }
  .overview { font-size: 0.875rem; line-height: 1.6; color: #475569; margin: 0 0 1.5rem; }
  .section { margin-bottom: 2.5rem; }
  .section-label, .objectives-label {
    font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.03em; color: #94a3b8; margin: 0 0 0.375rem;
  }
  .plain-list { margin: 0; padding-left: 1.25rem; font-size: 0.875rem; line-height: 1.6; color: #334155; }
  .plain-list li { margin-bottom: 0.25rem; }
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
  .objectives { margin: 0 0 0.75rem; padding-left: 1.25rem; font-size: 0.875rem; line-height: 1.6; color: #334155; }
  .objectives li { margin-bottom: 0.25rem; }
  .references { margin-top: 1rem; padding-left: 2.75rem; }
  .requires { margin-top: 0.75rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem; }
  .requires-label { font-size: 0.75rem; font-weight: 500; color: #94a3b8; }
  .pill { display: inline-flex; align-items: center; border-radius: 9999px; background: #f1f5f9; color: #475569; padding: 0.25rem 0.625rem; font-size: 0.75rem; font-weight: 500; }
  .pill-amber { background: #fffbeb; color: #b45309; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; }
  .card-title { margin-bottom: 1rem; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .line-item { margin-bottom: 1rem; }
  .line-item:last-child { margin-bottom: 0; }
  .line-item-header { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
  .line-item-name { font-weight: 600; font-size: 0.9375rem; margin: 0; }
  .line-item-weight { font-weight: 600; font-size: 0.875rem; color: #4338ca; margin: 0; }
  .line-item-description { font-size: 0.875rem; line-height: 1.6; color: #475569; margin: 0.25rem 0 0; }
  @media print {
    body { background: #fff; padding: 0; }
    .module, .card { break-inside: avoid; box-shadow: none; }
  }
  @media (max-width: 480px) {
    .two-col { grid-template-columns: 1fr; }
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
  ${overviewHtml}
  ${outcomesHtml}
  ${modulesHtml}
  ${materialsHtml}
  ${milestonesHtml}
  ${rubricHtml}
  ${assessmentHtml}
</main>
</body>
</html>`;
}
