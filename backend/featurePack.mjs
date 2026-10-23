// Deterministic feature pack: list filtering, export, and offline insights over saved records. No provider calls.
export function filterRecords(rows, { q = "", status = "", risk = "" } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  return (rows || []).filter((row) => {
    if (status && row.status !== status) return false;
    if (risk && row.risk !== risk) return false;
    if (!needle) return true;
    const hay = [row.reference, row.title, row.status, row.owner, row.risk, JSON.stringify(row.payload ?? {})].join(" ").toLowerCase();
    return hay.includes(needle);
  });
}
function cell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value); // preserves false and 0
}
export function recordsToCsv(rows, columns) {
  const cols = columns && columns.length ? columns : ["id","reference","title","status","owner","risk","due_date","amount","payload"];
  const esc = (v) => { const s = cell(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.join(","), ...(rows || []).map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}
export function exportRecords(rows, format = "json") {
  if (String(format).toLowerCase() === "csv") return { contentType: "text/csv; charset=utf-8", filename: "records.csv", body: recordsToCsv(rows) };
  return { contentType: "application/json; charset=utf-8", filename: "records.json", body: JSON.stringify(rows ?? [], null, 2) + "\n" };
}
const TITLES = ["Revalidation deadline triage", "Enrollment case value watch", "Evidence completeness check"];
const NOTE = "Operational only — no diagnosis or clinical guidance. Validate payer and source records with a qualified reviewer.";
export function buildInsights(rows) {
  const list = rows || [];
  const open = list.filter((r) => !["Approved", "Closed"].includes(r.status));
  const high = list.filter((r) => ["High", "Critical"].includes(r.risk));
  const total = list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const missingDue = list.filter((r) => !r.due_date).length;
  const payloadOf = (r) => (r.payload && typeof r.payload === "object" ? r.payload : {});
  const fieldKeys = new Set(); list.forEach((r) => Object.keys(payloadOf(r)).forEach((k) => fieldKeys.add(k)));
  const incomplete = list.filter((r) => [...fieldKeys].some((k) => payloadOf(r)[k] === "" || payloadOf(r)[k] === null || payloadOf(r)[k] === undefined)).length;
  const mk = (id, title, summary, metrics, step) => ({ id, title, aiGenerated: false, source: "Deterministic fallback (no provider call)", summary, metrics, sections: [{ title: "What was counted", detail: summary }, { title: "Next operational step", detail: step }, { title: "Review note", detail: NOTE }] });
  return { aiGenerated: false, source: "Deterministic fallback (no provider call)", insights: [
    mk("deadline-triage", TITLES[0], `Records reviewed: ${list.length}. Open records: ${open.length}. Records without a due date: ${missingDue}.`, [{ label: "Records reviewed", value: list.length }, { label: "Open records", value: open.length }, { label: "Records without a due date", value: missingDue }], "Assign an owner and due date to every open record, then work the earliest due dates first."),
    mk("value-watch", TITLES[1], `Represented value across records: ${total}. High or critical risk records: ${high.length}.`, [{ label: "Represented value", value: total }, { label: "High or critical risk records", value: high.length }], "Review high-risk records first and confirm the represented value against source evidence."),
    mk("completeness", TITLES[2], `Records with at least one empty evidence field: ${incomplete}. Distinct evidence fields seen: ${fieldKeys.size}.`, [{ label: "Incomplete records", value: incomplete }, { label: "Distinct evidence fields", value: fieldKeys.size }], "Fill empty evidence fields (shown as empty, not hidden) before requesting any further analysis."),
  ]};
}
