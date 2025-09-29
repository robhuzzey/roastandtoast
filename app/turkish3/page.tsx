"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MorphSpan = { start: number; end: number; tag: string; gloss?: string };
type ExampleToken = { surface: string; gloss: string };
type Entry = {
  type: "entry";
  query: string;
  pos: string;
  lemma: { tr: string; en: string };
  form: { label: string; explanation?: string };
  surface: string;
  morph: MorphSpan[];
  notes?: string;
  examples?: { tr: string; en: string; tokens: ExampleToken[] }[];
};

export default function TurkishMorphology() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [query, setQuery] = useState("dog");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const k = localStorage.getItem("tm_apiKey");
    if (k) setApiKey(k);
  }, []);

  const tagColors = useMemo<Record<string, string>>(
    () => ({
      root: "bg-blue-100 ring-blue-300",
      plural: "bg-emerald-100 ring-emerald-300",
      poss: "bg-purple-100 ring-purple-300",
      case: "bg-amber-100 ring-amber-300",
      tense: "bg-pink-100 ring-pink-300",
      other: "bg-slate-100 ring-slate-300",
    }),
    []
  );

  function saveKey() {
    if (!apiKeyInput.trim()) return;
    localStorage.setItem("tm_apiKey", apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setApiKeyInput("");
  }

  function clearKey() {
    localStorage.removeItem("tm_apiKey");
    setApiKey(null);
  }

  function colorize(surface: string, spans: MorphSpan[]) {
    const parts: { text: string; tag: string; title?: string }[] = [];
    const sorted = [...spans].sort((a, b) => a.start - b.start);
    let i = 0;

    const pushChunk = (
      start: number,
      end: number,
      tag: string,
      gloss?: string
    ) => {
      if (end <= start) return;
      parts.push({ text: surface.slice(start, end), tag, title: gloss });
    };

    for (const s of sorted) {
      if (s.start > i) pushChunk(i, s.start, "other");
      pushChunk(s.start, s.end, s.tag, s.gloss);
      i = s.end;
    }
    if (i < surface.length) pushChunk(i, surface.length, "other");

    return (
      <span className="inline-flex flex-wrap gap-x-0.5">
        {parts.map((p, idx) => (
          <span
            key={idx}
            title={p.title || undefined}
            className={`px-0.5 rounded ring-1 ${
              tagColors[p.tag] || tagColors.other
            }`}
          >
            {p.text}
          </span>
        ))}
      </span>
    );
  }

  async function runStream() {
    if (!apiKey) return;
    if (!query.trim()) return;

    setEntries([]);
    setError(null);
    setLoading(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const systemPrompt = `
You are “Turkish Morphology Assistant”, a precise Turkish translator + morphological analyzer.

Return output as JSON Lines (NDJSON), one JSON object per line. No arrays, no prose. Final line must be {"type":"done"}.

Each line schema (example):
{
  "type":"entry",
  "query":"dog",
  "pos":"noun",
  "lemma":{"tr":"köpek","en":"dog"},
  "form":{"label":"plural","explanation":"-lAr vowel harmony"},
  "surface":"köpekler",
  "morph":[
    {"start":0,"end":5,"tag":"root","gloss":"köpek (dog)"},
    {"start":5,"end":8,"tag":"plural","gloss":"-ler"}
  ],
  "notes":"-ler with front vowels; -lar with back vowels.",
  "examples":[
    {
      "tr":"Köpekler havlıyor.",
      "en":"The dogs are barking.",
      "tokens":[
        {"surface":"Köpekler","gloss":"dogs"},
        {"surface":"havlıyor","gloss":"are barking"}
      ]
    }
  ]
}

Rules:
- Emit 6–10 “entry” lines covering: lemma, plural, my/your/his-her (1sg/2sg/3sg possessive), accusative, dative, locative, ablative; if verb-like, include present-cont 1sg.
- morph spans are 0-based, end-exclusive, index into "surface".
- Respect vowel harmony, buffer letters (y/s/n), consonant alternations.
- Keep examples short and natural.
- Only NDJSON. End with {"type":"done"}.
`.trim();

    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-2024-07-18",
          stream: true,
          // text output via Responses API
          text: { format: { type: "text" } },
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: systemPrompt }],
            },
            {
              role: "user",
              content: [{ type: "input_text", text: query.trim() }],
            },
          ],
          temperature: 0.2,
          max_output_tokens: 1000,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let sseBuf = ""; // buffer for SSE frames
      let textBuf = ""; // buffer for text deltas (will extract JSON objects)

      const emitObject = (obj: unknown) => {
        if (!obj || typeof obj !== "object") return;
        const t = (obj as { type?: string }).type;
        if (t === "entry") setEntries((p) => [...p, obj as Entry]);
        else if (t === "done") setLoading(false);
      };

      const extractJsonObjects = () => {
        // Extract complete JSON objects from textBuf using brace depth, respecting strings
        let i = 0;
        let start = -1;
        let depth = 0;
        let inStr = false;
        let esc = false;
        const toEmit: string[] = [];
        while (i < textBuf.length) {
          const ch = textBuf[i];
          if (inStr) {
            if (esc) {
              esc = false;
            } else if (ch === "\\") {
              esc = true;
            } else if (ch === '"') {
              inStr = false;
            }
            i++;
            continue;
          }
          if (ch === '"') {
            inStr = true;
            i++;
            continue;
          }
          if (ch === "{") {
            if (depth === 0) start = i;
            depth++;
          } else if (ch === "}") {
            if (depth > 0) depth--;
            if (depth === 0 && start !== -1) {
              const objStr = textBuf.slice(start, i + 1);
              toEmit.push(objStr);
              // Remove consumed part from buffer and reset scan
              textBuf = textBuf.slice(i + 1);
              i = 0;
              start = -1;
              continue;
            }
          }
          i++;
        }
        for (const s of toEmit) {
          try {
            const obj = JSON.parse(s);
            emitObject(obj);
          } catch {
            // ignore malformed
          }
        }
        // Safety: cap buffer size to avoid unbounded growth if the model ignores JSON
        const MAX_BUF = 512 * 1024; // 512KB
        if (textBuf.length > MAX_BUF) textBuf = textBuf.slice(-MAX_BUF);
      };

      const handleTextChunk = (chunk: string) => {
        if (!chunk) return;
        if (debug) console.log("TEXT CHUNK:", chunk);
        textBuf += chunk;
        extractJsonObjects();
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuf += decoder.decode(value, { stream: true });

        // Split SSE frames (blank line between frames)
        const frames = sseBuf.split(/\r?\n\r?\n/);
        sseBuf = frames.pop() || "";

        for (const frame of frames) {
          let eventType: string | null = null;
          let dataStr = "";

          for (const line of frame.split(/\r?\n/)) {
            if (line.startsWith("event:")) eventType = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }

          if (!dataStr) continue;
          if (dataStr === "[DONE]") {
            setLoading(false);
            continue;
          }

          let evt: unknown;
          try {
            evt = JSON.parse(dataStr);
          } catch {
            continue;
          }
          if (debug) console.log("SSE", eventType, evt);

          switch (eventType) {
            case "response.output_text.delta": {
              const hasDelta =
                typeof evt === "object" && evt !== null && "delta" in evt;
              const chunk = hasDelta
                ? /* eslint-disable @typescript-eslint/no-explicit-any */ ((
                    evt as any
                  ).delta as string) || ""
                : "";
              if (chunk) handleTextChunk(chunk);
              break;
            }
            case "response.content_part.delta": {
              // Some models stream via content-part deltas:
              // evt.delta = { type: "output_text.delta", text: "..." }
              const d =
                typeof evt === "object" && evt !== null && "delta" in evt
                  ? /* eslint-disable @typescript-eslint/no-explicit-any */ ((
                      evt as any
                    ).delta as {
                      type?: string;
                      text?: string;
                    })
                  : undefined;
              if (
                d &&
                d.type === "output_text.delta" &&
                typeof d.text === "string"
              ) {
                handleTextChunk(d.text);
              }
              break;
            }
            case "response.output_text.done": {
              // flush any trailing text
              extractJsonObjects();
              break;
            }
            case "response.completed": {
              // flush buffer on completion
              extractJsonObjects();
              setLoading(false);
              break;
            }
            case "response.error": {
              const msg =
                typeof evt === "object" && evt !== null && "error" in evt
                  ? /* eslint-disable @typescript-eslint/no-explicit-any */ ((
                      evt as any
                    ).error?.message as string) || "Stream error"
                  : "Stream error";
              setError(msg);
              setLoading(false);
              break;
            }
            default:
              // ignore: response.created, response.in_progress, response.output_item.added, response.content_part.added, etc.
              break;
          }
        }
      }
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "name" in e &&
        (e as { name?: string }).name === "AbortError"
      )
        return;
      const msg = e instanceof Error ? e.message : String(e ?? "Stream error");
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Turkish Morphology</h1>
          <div className="flex items-center gap-3">
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                checked={debug}
                onChange={(e) => setDebug(e.target.checked)}
              />
              debug
            </label>
            {apiKey && (
              <button
                onClick={clearKey}
                className="text-sm border rounded px-2 py-1"
              >
                Sign out
              </button>
            )}
          </div>
        </header>

        {!apiKey ? (
          <div className="mt-6 border rounded p-4">
            <h2 className="font-semibold mb-2">Enter API key</h2>
            <div className="flex gap-2">
              <input
                type="password"
                className="flex-1 border rounded px-3 py-2"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <button
                onClick={saveKey}
                className="bg-black text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Stored locally as <code>tm_apiKey</code>. For production, proxy
              this request.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 border rounded p-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="English word (e.g., dog, to eat, big)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  onClick={runStream}
                  disabled={loading}
                  className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? "Streaming..." : "Analyze"}
                </button>
                {loading && (
                  <button
                    onClick={() => abortRef.current?.abort()}
                    className="border rounded px-3 py-2"
                  >
                    Cancel
                  </button>
                )}
              </div>
              {error && (
                <div className="mt-2 text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {entries.map((e, idx) => (
                <div key={idx} className="border rounded p-3">
                  <div className="flex justify-between items-baseline">
                    <div className="text-lg">
                      {colorize(e.surface, normalizeTags(e.morph))}
                    </div>
                    <span className="text-xs border rounded px-2 py-0.5">
                      {e.form.label}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    lemma: <b title={e.lemma.en}>{e.lemma.tr}</b> · pos: {e.pos}
                  </div>
                  {e.notes ? (
                    <div className="mt-2 text-sm text-gray-700">{e.notes}</div>
                  ) : null}
                  {e.examples?.length ? (
                    <div className="mt-3 space-y-2">
                      {e.examples.map((ex, i2) => (
                        <div key={i2} className="text-sm">
                          <div className="flex flex-wrap gap-1">
                            {ex.tokens?.length ? (
                              ex.tokens.map((t, i3) => (
                                <span
                                  key={i3}
                                  title={t.gloss}
                                  className="rounded bg-gray-100 px-1.5 py-0.5"
                                >
                                  {t.surface}
                                </span>
                              ))
                            ) : (
                              <span>{ex.tr}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{ex.en}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <Legend tagColors={tagColors} />
          </>
        )}
      </div>
    </div>
  );

  function normalizeTags(spans: MorphSpan[]): MorphSpan[] {
    return spans.map((s) => {
      let tag = s.tag;
      if (tag === "plural") tag = "plural";
      else if (/(poss|1sg|2sg|3sg|possessive)/i.test(tag)) tag = "poss";
      else if (/(acc|dat|loc|abl|gen|case)/i.test(tag)) tag = "case";
      else if (/(tense|present|past|aorist|cont)/i.test(tag)) tag = "tense";
      else if (tag === "root") tag = "root";
      else tag = "other";
      return { ...s, tag };
    });
  }
}

function Legend({ tagColors }: { tagColors: Record<string, string> }) {
  const chips = ["root", "plural", "poss", "case", "tense", "other"];
  return (
    <section className="mt-8">
      <h3 className="font-semibold mb-2">Legend</h3>
      <div className="flex flex-wrap gap-2 text-xs">
        {chips.map((c) => (
          <span
            key={c}
            className={`rounded px-2 py-1 ring-1 ${
              tagColors[c] || "bg-slate-100 ring-slate-300"
            }`}
          >
            {c}
          </span>
        ))}
      </div>
    </section>
  );
}
