import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Plan } from "@/lib/plan";

export const EXPORT_TYPES = ["pdf", "html", "slide-outline", "quiz-outline", "outcomes-xlsx"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

// One doc per export-button click, in `exportEvents`. Deliberately raw
// events rather than a denormalized per-user rollup — "did this free user
// ever click PDF/HTML in addition to Slide outline" is a query over this
// collection (group by uid, check which exportTypes appear) rather than
// state that needs to be kept in sync on every click.
//
// Fire-and-forget: logging a click should never delay or fail the
// download it's attached to.
export function logExportEvent(uid: string, exportType: ExportType, tier: Plan): void {
  addDoc(collection(getFirebaseDb(), "exportEvents"), {
    uid,
    exportType,
    tier,
    createdAt: serverTimestamp(),
  }).catch((err) => {
    console.error("Failed to log export event:", err);
  });
}
