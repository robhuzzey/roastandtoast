"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";

/**
 * Next.js (App Router) page component
 * Route suggestion: app/morphology/page.tsx
 * - Reads OpenAI API key from localStorage (key: "OPENAI_API_KEY")
 * - Lets you set/update it from a small Settings panel
 * - Sends your English input to ChatGPT with a strict JSON-only prompt
 * - Validates the JSON via Zod
 * - Renders color-coded tokens/morphemes
 */
export default function MorphologyPage() {
  // ---------- Local state ----------
  const [apiKey, setApiKey] = useState<string>("");
  const [input, setInput] = useState<string>("I’m with my dog.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string>("");
  const [data, setData] = useState<Morphology | null>(null);
  const [showJSON, setShowJSON] = useState(true);
  const [model, setModel] = useState<string>("gpt-4o-mini");

  // Try both common localStorage keys just in case
  useEffect(() => {
    const k =
      localStorage.getItem("tm_apiKey") ||
      localStorage.getItem("tm_apiKey") ||
      "";
    if (k) setApiKey(k);
  }, []);

  const saveKey = () => {
    localStorage.setItem("tm_apiKey", apiKey);
  };

  // ---------- Zod schema ----------
  const Morph = z.object({
    meta: z.object({
      source_lang: z.string(),
      target_lang: z.string(),
      input: z.string(),
      generated_at: z.string(),
      confidence: z.enum(["high", "medium", "low"]).or(z.string()),
      notes: z.string().optional().default(""),
    }),
    legend: z
      .array(
        z.object({
          tag: z.string(),
          desc: z.string(),
        })
      )
      .nonempty(),
    translations: z
      .array(
        z.object({
          tr: z.string(),
          gloss: z.string().optional().default(""),
          register: z.string().optional().default(""),
          alt: z.array(z.string()).optional().default([]),
        })
      )
      .nonempty(),
    examples: z
      .array(
        z.object({
          en: z.string(),
          tr: z.string(),
          tokens: z.array(
            z.object({
              surface: z.string(),
              lemma: z.string().optional().default(""),
              pos: z.string().optional().default(""),
              morphemes: z.array(
                z.object({
                  form: z.string(),
                  tag: z.string(),
                  features: z
                    .object({
                      person: z.string().nullable().optional(),
                      number: z.string().nullable().optional(),
                      case: z.string().nullable().optional(),
                      tense: z.string().nullable().optional(),
                      polarity: z.string().nullable().optional(),
                      voice: z.string().nullable().optional(),
                    })
                    .optional()
                    .default({}),
                  notes: z.string().optional().default(""),
                })
              ),
            })
          ),
        })
      )
      .nonempty(),
    rules: z.object({
      vowel_harmony: z.string().optional().default(""),
      buffers: z.string().optional().default(""),
      alternations: z.string().optional().default(""),
      spelling: z.string().optional().default(""),
    }),
  });

  type Morphology = z.infer<typeof Morph>;

  // ---------- Prompt (system + user) ----------
  const SYSTEM_PROMPT = `You are a Turkish morphology explainer. Return only JSON. Do not include prose outside the JSON. When uncertain, include alternatives and set \"confidence\":\"low\" with notes.

Input: an English word/phrase/sentence.
Goal: Produce Turkish equivalents plus examples, with each Turkish token segmented into morphemes (root, suffixes, buffers, copula, etc.) and annotated so a UI can color-map by tag.

JSON shape:
{
  "meta": { "source_lang": "en", "target_lang": "tr", "input": "<original English input>", "generated_at": "<ISO8601>", "confidence": "high|medium|low", "notes": "<freeform>" },
  "legend": [ { "tag": "root", "desc": "dictionary form / stem" }, { "tag": "poss", "desc": "possessive suffix (my/your/his…)" }, { "tag": "case", "desc": "case ending (ACC/DAT/LOC/ABL/GEN)" }, { "tag": "com", "desc": "comitative 'with' (-le/-la)" }, { "tag": "pl", "desc": "plural suffix" }, { "tag": "cop", "desc": "copular 'to be' ending" }, { "tag": "tense", "desc": "tense/aspect/mood" }, { "tag": "pers", "desc": "person/number agreement" }, { "tag": "buf", "desc": "buffer consonant (y/ş/n/s)" }, { "tag": "deriv", "desc": "derivational suffix (-li/-siz/-ci…)" }, { "tag": "neg", "desc": "negation" }, { "tag": "q", "desc": "question particle" } ],
  "translations": [ { "tr": "<primary Turkish form>", "gloss": "<compact meaning>", "register": "neutral|formal|informal", "alt": ["<variant>"] } ],
  "examples": [ { "en": "<English example>", "tr": "<Turkish>", "tokens": [ { "surface": "<token>", "lemma": "<lemma>", "pos": "N|V|ADJ|…", "morphemes": [ { "form": "<morph>", "tag": "root|poss|case|com|pl|cop|tense|pers|buf|deriv|neg|q", "features": { "person": "1|2|3|null", "number": "SG|PL|null", "case": "ACC|DAT|LOC|ABL|GEN|null", "tense": "PRS|PST|FUT|AOR|PROG|null", "polarity": "POS|NEG|null", "voice": "ACT|PASS|CAUS|null" }, "notes": "<optional>" } ] } ] } ],
  "rules": { "vowel_harmony": "<note>", "buffers": "<where y/ş/n/s inserted>", "alternations": "<k~ğ, p~b, t~d>", "spelling": "<apostrophes for proper nouns>") }
}

Formatting rules:
- Always return valid JSON (double quotes, no trailing commas).
- All Turkish tokens must be segmented into morphemes with tags.
- Use buf for buffer letters (y/ş/n/s).
- If multiple correct options exist, include them in translations[0].alt and add an extra examples entry for each major variant.
- Do not romanize; keep correct Turkish characters.
- If the input is a bare English word, also provide at least one short example sentence.`;

  const buildUserPrompt = (english: string) => `Input: ${english}`;

  // ---------- Tag colors (Tailwind) ----------
  const tagColors: Record<string, string> = {
    root: "bg-sky-100 text-sky-900",
    poss: "bg-emerald-100 text-emerald-900",
    case: "bg-orange-100 text-orange-900",
    com: "bg-violet-100 text-violet-900",
    pl: "bg-teal-100 text-teal-900",
    cop: "bg-pink-100 text-pink-900",
    tense: "bg-yellow-100 text-yellow-900",
    pers: "bg-lime-100 text-lime-900",
    buf: "bg-gray-200 text-gray-900",
    deriv: "bg-rose-100 text-rose-900",
    neg: "bg-red-100 text-red-900",
    q: "bg-indigo-100 text-indigo-900",
  };

  const colorClassFor = (tag: string) =>
    tagColors[tag] || "bg-slate-100 text-slate-900";

  // ---------- OpenAI call ----------
  async function generate() {
    setError(null);
    setLoading(true);
    setRawJson("");
    setData(null);

    try {
      if (!apiKey)
        throw new Error("Missing API key. Click Settings to add one.");

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(input) },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`OpenAI error ${res.status}: ${txt}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content?.trim?.();
      if (!content) throw new Error("Empty response content.");

      setRawJson(content);

      const parsed = Morph.safeParse(JSON.parse(content));
      if (!parsed.success) {
        console.error(parsed.error);
        throw new Error("Schema validation failed. Check console for details.");
      }

      setData(parsed.data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // ---------- UI helpers ----------
  function copyRaw() {
    if (!rawJson) return;
    navigator.clipboard.writeText(rawJson);
  }

  const legendByTag = useMemo(() => {
    const map = new Map<string, string>();
    data?.legend.forEach((l) => map.set(l.tag, l.desc));
    return map;
  }, [data]);

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Turkish Morphology JSON Explorer
            </h1>
            <p className="text-sm text-slate-600">
              Enter English → get Turkish + morpheme breakdown as strict JSON,
              validated and rendered.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
              title="OpenAI model"
            >
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              <option value="gpt-4.1">gpt-4.1</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            </select>
            <button
              onClick={() => {
                const k = prompt("OpenAI API Key (sk-...)", apiKey || "");
                if (typeof k === "string") setApiKey(k);
              }}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              Settings
            </button>
            <button
              onClick={saveKey}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              Save
            </button>
          </div>
        </header>

        <section className="grid gap-3">
          <label className="text-sm font-medium">English input</label>
          <textarea
            className="w-full border rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type an English word or sentence…"
          />
          <div className="flex gap-3">
            <button
              onClick={generate}
              disabled={loading}
              className="rounded-2xl bg-slate-900 text-white px-4 py-2 disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate JSON"}
            </button>
            {rawJson && (
              <>
                <button
                  onClick={copyRaw}
                  className="rounded-2xl border px-4 py-2"
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => setShowJSON((v) => !v)}
                  className="rounded-2xl border px-4 py-2"
                >
                  {showJSON ? "Hide JSON" : "Show JSON"}
                </button>
              </>
            )}
          </div>
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-800 text-sm">
              {error}
            </div>
          )}
        </section>

        {rawJson && showJSON && (
          <section className="grid gap-2">
            <h2 className="text-lg font-semibold">Raw JSON</h2>
            <pre className="overflow-auto rounded-2xl border bg-slate-50 p-4 text-xs leading-relaxed">
              {rawJson}
            </pre>
          </section>
        )}

        {data && (
          <section className="grid gap-6">
            <div className="grid gap-1">
              <h2 className="text-lg font-semibold">Translations</h2>
              <div className="grid gap-2">
                {data.translations.map((t, i) => (
                  <div key={i} className="rounded-2xl border p-3">
                    <div className="font-medium">{t.tr}</div>
                    {t.gloss && (
                      <div className="text-sm text-slate-600">{t.gloss}</div>
                    )}
                    {(t.alt?.length ?? 0) > 0 && (
                      <div className="text-sm text-slate-600">
                        Alt: {t.alt?.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <h2 className="text-lg font-semibold">Legend</h2>
              <div className="flex flex-wrap gap-2">
                {data.legend.map((l, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded-xl text-xs font-medium ${colorClassFor(
                      l.tag
                    )}`}
                    title={l.desc}
                  >
                    {l.tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Hover tokens to see morpheme notes.
              </p>
            </div>

            <div className="grid gap-4">
              <h2 className="text-lg font-semibold">Examples</h2>
              {data.examples.map((ex, i) => (
                <div key={i} className="rounded-2xl border p-4 space-y-2">
                  <div className="text-sm text-slate-600">EN: {ex.en}</div>
                  <div className="text-base font-medium">TR: {ex.tr}</div>
                  <div className="mt-2 space-y-3">
                    {ex.tokens.map((tok, j) => (
                      <div key={j} className="">
                        <div className="text-sm font-semibold">
                          {tok.surface}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {tok.morphemes.map((m, k) => (
                            <span
                              key={k}
                              className={`px-2 py-1 rounded-xl text-xs ${colorClassFor(
                                m.tag
                              )} cursor-help`}
                              title={`${m.tag}${
                                m.notes ? ` — ${m.notes}` : ""
                              }`}
                            >
                              <span className="font-mono">{m.form}</span>
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {tok.lemma && (
                            <span className="mr-2">
                              lemma:{" "}
                              <span className="font-mono">{tok.lemma}</span>
                            </span>
                          )}
                          {tok.pos && <span>pos: {tok.pos}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-1">
              <h2 className="text-lg font-semibold">Rules & Notes</h2>
              <div className="rounded-2xl border p-4 grid gap-1 text-sm">
                {data.rules.vowel_harmony && (
                  <div>
                    <span className="font-medium">Vowel harmony:</span>{" "}
                    {data.rules.vowel_harmony}
                  </div>
                )}
                {data.rules.buffers && (
                  <div>
                    <span className="font-medium">Buffers:</span>{" "}
                    {data.rules.buffers}
                  </div>
                )}
                {data.rules.alternations && (
                  <div>
                    <span className="font-medium">Alternations:</span>{" "}
                    {data.rules.alternations}
                  </div>
                )}
                {data.rules.spelling && (
                  <div>
                    <span className="font-medium">Spelling:</span>{" "}
                    {data.rules.spelling}
                  </div>
                )}
                {data.meta.notes && (
                  <div>
                    <span className="font-medium">Meta notes:</span>{" "}
                    {data.meta.notes}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <footer className="pt-8 text-xs text-slate-500">
          <p>
            Tip: Your API key is read from{" "}
            <code>localStorage.OPENAI_API_KEY</code>. Click Settings to
            set/update it. All requests are client-side.
          </p>
        </footer>
      </div>
    </div>
  );
}
