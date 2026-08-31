import { Navbar } from "@/components/Navbar";
import { FREE_MAX_WEEKS, FREE_MONTHLY_GENERATIONS, PRO_PRICE_LABEL } from "@/lib/plan";

const CONTACT_EMAIL = "georgettebadourra7788@gmail.com";
const WHISH_MONEY_DETAILS = "96181080347";

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Upgrade
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Get unlimited access</h1>
          <p className="mx-auto mt-3 max-w-md text-slate-600">
            The free plan includes {FREE_MONTHLY_GENERATIONS} syllabus generations a month, capped at{" "}
            {FREE_MAX_WEEKS} weeks each. Upgrade for unlimited generations and courses of any length.
          </p>
        </div>

        <div className="mx-auto mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/60">
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900">{PRO_PRICE_LABEL}</p>
            <p className="mt-1 text-sm text-slate-500">Billed once a year</p>
          </div>

          <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-600">✓</span>
              Unlimited syllabus generations
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-600">✓</span>
              Courses of any length (up to 52 weeks)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-600">✓</span>
              Richer syllabi: fuller lesson descriptions, real academic references, an
              assessment/grading breakdown, and a course overview
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-600">✓</span>
              No watermark on exported PDFs, plus multiple premium templates
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-600">✓</span>
              PDF and HTML export, prerequisite map — everything free already gets
            </li>
          </ul>

          <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
            <p className="text-sm font-semibold text-slate-900">How to upgrade</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-slate-700">
              <li>
                Send {PRO_PRICE_LABEL} via Whish Money to <strong>{WHISH_MONEY_DETAILS}</strong>
              </li>
              <li>
                Email <strong>{CONTACT_EMAIL}</strong> with your payment confirmation and the email
                address you signed in with
              </li>
              <li>Your account will be upgraded within 24 hours</li>
            </ol>
          </div>

          <a
            href={`mailto:${CONTACT_EMAIL}?subject=SyllabusFlow%20upgrade`}
            className="mt-6 block rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300"
          >
            Email to upgrade
          </a>
        </div>
      </main>
    </div>
  );
}
