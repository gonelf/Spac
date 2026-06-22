/*
  Lightweight on-device retrieval over the Collective Labour Agreement text.

  A 0.5 B model can't take the whole agreement as context on a phone, so for each
  question we pick the few most relevant sections with a small TF-IDF scorer and
  feed only those to the model. Pure JS, runs instantly, no dependencies.
*/

const STOP = new Set(
  ("the a an and or of to in on for is are be by with from at as it this that these those your you our we their "
    + "do does what how when where which who whom whose can could would should i my me will shall a an").split(/\s+/)
);

function tokenize(s) {
  return (s.toLowerCase().match(/[a-z0-9€%.\/]+/g) || []).filter(
    (w) => w.length > 1 && !STOP.has(w)
  );
}

// Splits the agreement into one chunk per numbered section / sub-section
// (e.g. "3.1 Captain pay scale …"), keeping each header with its body.
export function chunkAgreement(text) {
  const headerRe = /^\d+(?:\.\d+)*[.)]?\s+\S/;
  const chunks = [];
  let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (headerRe.test(line.trim())) {
      if (cur != null) chunks.push(cur);
      cur = line.trim();
    } else if (cur != null) {
      cur += "\n" + line;
    } else {
      cur = line;
    }
  }
  if (cur != null) chunks.push(cur);
  return chunks.map((c) => c.trim()).filter(Boolean);
}

// Returns the most relevant slice of the agreement for a question, capped to a
// character budget so the prompt stays small (and fast) on-device.
export function retrieve(text, query, { k = 5, budget = 3500 } = {}) {
  const chunks = chunkAgreement(text);
  const docTokens = chunks.map(tokenize);

  const df = new Map();
  for (const toks of docTokens) {
    for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = chunks.length || 1;
  const q = new Set(tokenize(query));

  const scored = chunks.map((c, i) => {
    const tf = new Map();
    for (const t of docTokens[i]) tf.set(t, (tf.get(t) || 0) + 1);
    let s = 0;
    for (const t of q) {
      if (tf.has(t)) {
        const idf = Math.log(1 + N / (df.get(t) || 1));
        s += idf * (1 + Math.log(tf.get(t)));
      }
    }
    return { c, s, i };
  });

  scored.sort((a, b) => b.s - a.s);

  const picked = [];
  let used = 0;
  for (const it of scored) {
    if (it.s <= 0) break;
    if (picked.length && used + it.c.length > budget) break;
    picked.push(it);
    used += it.c.length;
    if (picked.length >= k) break;
  }

  if (picked.length === 0) return text.slice(0, budget); // nothing matched — give the opening

  picked.sort((a, b) => a.i - b.i); // restore document order for readability
  return picked.map((p) => p.c).join("\n\n");
}
