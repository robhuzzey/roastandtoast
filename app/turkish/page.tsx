"use client";

import React, { useEffect, useMemo, useState } from "react";

/** Types */
type Morpheme = {
  text: string;
  type:
    | "root"
    | "harmony_vowel"
    | "tense"
    | "person"
    | "plural"
    | "negation"
    | "question"
    | "case"
    | "buffer"
    | "possessive"
    | "copula"
    | "voice"
    | "mood"
    | "aspect"
    | "derivation"
    | "other";
};
type Segmented = Morpheme[];
type PersonKey = "ben" | "sen" | "o" | "biz" | "siz" | "onlar";

type ExampleWord = {
  surface: string;
  segments: Segmented;
  gloss?: string; // optional short gloss from API
};

type QuickPhrase = { key: string; tr: string; en: string };

type SuffixTeaching = {
  id: string; // e.g., "accusative", "dative"
  label: string; // human label
  concept?: string; // short what/when
  rule?: string; // how it attaches (harmony notes, buffers)
  example_tr?: string;
  example_en?: string;
};

type Drill = {
  prompt_en?: string;
  prompt_tr?: string; // may contain a blank using "___" or brackets
  answer_tr: string;
  explanation?: string;
};

type Teaching = {
  suffixes?: Array<SuffixTeaching>;
  drills?: Array<Drill>;
};

type ApiResponse = {
  english: string;
  turkish: {
    lemma: string;
    stem: string;
    pos: "verb" | "noun" | "adjective" | "adverb" | "postposition" | "other";
  };
  notes: string[];
  conjugations: {
    present_continuous: Record<
      PersonKey,
      { surface: string; segments: Segmented }
    >;
  };
  inflections: Array<{
    label: string;
    surface: string;
    segments: Segmented;
    display_title?: string;
    display_hint?: string;
    priority?: number;
  }>;
  examples: Array<{
    en: string;
    tr: {
      surface: string; // well-spaced sentence
      words: Array<ExampleWord>; // segmentation by word + optional gloss
    };
  }>;
  quick_phrases?: Array<QuickPhrase>;
  teaching?: Teaching;
};

/** Colors */
const COLOR_BY_TYPE: Record<Morpheme["type"], string> = {
  root: "text-blue-700",
  harmony_vowel: "text-amber-700",
  tense: "text-orange-700",
  person: "text-emerald-700",
  plural: "text-purple-700",
  negation: "text-rose-700",
  question: "text-rose-700",
  case: "text-rose-700",
  buffer: "text-slate-600",
  possessive: "text-teal-700",
  copula: "text-cyan-700",
  voice: "text-indigo-700",
  mood: "text-sky-700",
  aspect: "text-lime-700",
  derivation: "text-stone-700",
  other: "text-slate-800",
};
const BADGE_BY_TYPE: Record<Morpheme["type"], string> = {
  root: "bg-blue-100 text-blue-800 border-blue-200",
  harmony_vowel: "bg-amber-100 text-amber-800 border-amber-200",
  tense: "bg-orange-100 text-orange-800 border-orange-200",
  person: "bg-emerald-100 text-emerald-800 border-emerald-200",
  plural: "bg-purple-100 text-purple-800 border-purple-200",
  negation: "bg-rose-100 text-rose-800 border-rose-200",
  question: "bg-rose-100 text-rose-800 border-rose-200",
  case: "bg-rose-100 text-rose-800 border-rose-200",
  buffer: "bg-slate-100 text-slate-800 border-slate-200",
  possessive: "bg-teal-100 text-teal-800 border-teal-200",
  copula: "bg-cyan-100 text-cyan-800 border-cyan-200",
  voice: "bg-indigo-100 text-indigo-800 border-indigo-200",
  mood: "bg-sky-100 text-sky-800 border-sky-200",
  aspect: "bg-lime-100 text-lime-800 border-lime-200",
  derivation: "bg-stone-100 text-stone-800 border-stone-200",
  other: "bg-slate-100 text-slate-800 border-slate-200",
};

/** ---- Speech synthesis helpers (Turkish) ---- */
function useTurkishSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    function loadVoices() {
      const list = synth.getVoices();
      setVoices(list);
    }

    // Some browsers load voices async
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const trVoice = useMemo(() => {
    // Prefer voices with Turkish locale
    const primary = voices.find((v) => v.lang?.toLowerCase().startsWith("tr"));
    if (primary) return primary;
    const secondary = voices.find((v) => v.lang?.toLowerCase().includes("-tr"));
    return secondary || null;
  }, [voices]);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const t = (text || "").trim();
    if (!t) return;
    const synth = window.speechSynthesis;
    try {
      synth.cancel();
    } catch {}

    const utt = new SpeechSynthesisUtterance(t);
    utt.lang = "tr-TR";
    if (trVoice) utt.voice = trVoice;
    utt.rate = 0.95;
    utt.pitch = 1.0;
    synth.speak(utt);
  }

  return { speak, hasVoice: !!trVoice };
}

function LegendTag({ type, label }: { type: Morpheme["type"]; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 text-[10px] rounded-full border ${BADGE_BY_TYPE[type]}`}
    >
      {label}
    </span>
  );
}

/** Simple speaker icon */
function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// No client-side morphology mutation; render as-is from API.

/** One morpheme, with global sentence hover dim + clear tooltip */
function MorphemePiece({ m }: { m: Morpheme }) {
  const labelMap: Record<string, string> = {
    harmony_vowel: "harmony vowel",
    buffer: "buffer/linker",
    possessive: "possessive",
    copula: "copula",
    voice: "voice",
    mood: "mood",
    aspect: "aspect",
    derivation: "derivation",
  };
  const label = labelMap[m.type] || m.type;

  return (
    <span
      className={[
        "relative inline-block align-baseline",
        COLOR_BY_TYPE[m.type],
        "transition duration-150",
        // globally dim everything in the sentence on any hover
        "group-hover/sent:opacity-30",
        // make THIS morpheme pop on hover
        "hover:!opacity-100 hover:scale-125 hover:font-semibold",
      ].join(" ")}
    >
      {/* tooltip */}
      <span
        className={[
          "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2",
          "px-2 py-1 rounded text-white text-xs",
          "bg-black/80 shadow-sm whitespace-nowrap",
          "opacity-0 group-hover/sent:opacity-100",
          "transition-opacity",
          "hidden md:block",
        ].join(" ")}
      >
        {label}
      </span>
      {m.text}
    </span>
  );
}

/** Word = continuous string of morphemes (no added gaps inside) */
function SegmentedWord({ segs }: { segs: Segmented }) {
  return (
    <span className="inline-block align-baseline px-0.5">
      {segs.map((m, i) => (
        <MorphemePiece key={i} m={m} />
      ))}
    </span>
  );
}

/** Extract the last root morpheme for a word */
function getWordRoot(segs: Segmented): string | null {
  for (let i = segs.length - 1; i >= 0; i--) {
    if (segs[i].type === "root") return segs[i].text;
  }
  return null;
}

/** Friendlier labels for cases & possessives */
function getInflectionDisplay(inf: {
  label: string;
  display_title?: string;
  display_hint?: string;
}): {
  title: string;
  hint: string;
} {
  if (inf.display_title || inf.display_hint) {
    return {
      title: inf.display_title || inf.label,
      hint: inf.display_hint || "",
    };
  }
  const label = (inf.label || "").toLowerCase();

  if (label.includes("accusative"))
    return {
      title: "Accusative (direct object)",
      hint: "e.g., 'I see the NOUN'",
    };
  if (label.includes("dative"))
    return { title: "Dative (to/towards)", hint: "to/towards the NOUN" };
  if (label.includes("locative"))
    return { title: "Locative (in/at/on)", hint: "in/at/on the NOUN" };
  if (label.includes("ablative"))
    return { title: "Ablative (from)", hint: "from the NOUN" };
  if (label.includes("genitive"))
    return { title: "Genitive (of)", hint: "of the NOUN" };
  if (
    label.includes("instrumental") ||
    label.includes(" ile") ||
    label === "ile"
  )
    return { title: 'With ("ile")', hint: "with the NOUN" };
  if (label.includes("plural"))
    return { title: "Plural", hint: "more than one (nouns)" };

  const person = label.match(/(1sg|2sg|3sg|1pl|2pl|3pl)/i)?.[1]?.toLowerCase();
  if (person) {
    switch (person) {
      case "1sg":
        return { title: "My (1st person singular)", hint: "my NOUN" };
      case "2sg":
        return { title: "Your (2nd person singular)", hint: "your (sg) NOUN" };
      case "3sg":
        return {
          title: "His/Her/Its (3rd person singular)",
          hint: "his/her/its NOUN",
        };
      case "1pl":
        return { title: "Our (1st person plural)", hint: "our NOUN" };
      case "2pl":
        return {
          title: "Your (2nd person plural/polite)",
          hint: "your (pl/polite) NOUN",
        };
      case "3pl":
        return { title: "Their (3rd person plural)", hint: "their NOUN" };
    }
  }

  const title = inf.label
    ? inf.label[0].toUpperCase() + inf.label.slice(1)
    : "Form";
  return { title, hint: "" };
}

/** Sentence: single line, preserve spacing */
function SegmentedSentence({
  words,
  glosses,
  targetLemma,
}: {
  words: Array<ExampleWord>;
  glosses?: Record<string, string>;
  targetLemma?: string;
}) {
  return (
    <div className="group/sent inline-block text-base leading-relaxed transition-transform duration-150 group-hover/sent:scale-[1.06]">
      {words.map((w, idx) => {
        const root = getWordRoot(w.segments)?.toLowerCase();
        const isTarget =
          root && targetLemma ? root === targetLemma.toLowerCase() : false;
        const glossKey = (w.surface || "").toLowerCase();
        const providedGloss = w.gloss;
        const gloss = !isTarget
          ? providedGloss || (glosses ? glosses[glossKey] : undefined)
          : undefined;
        return (
          <span
            key={idx}
            className="relative inline-block align-baseline group/word"
          >
            {gloss && (
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/80 text-white text-[11px] shadow-sm whitespace-nowrap opacity-0 group-hover/word:opacity-100 transition-opacity">
                {gloss}
              </span>
            )}
            <SegmentedWord segs={w.segments} />
            {idx < words.length - 1 && <span> </span>}
          </span>
        );
      })}
    </div>
  );
}

export default function Page() {
  const [apiKey, setApiKey] = useState("");
  const [english, setEnglish] = useState("dog");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [showUsefulLegend, setShowUsefulLegend] = useState(false);
  const [glossMap, setGlossMap] = useState<Record<string, string>>({});
  const [tokenUsage, setTokenUsage] = useState<{
    prompt: number;
    completion: number;
    total: number;
  } | null>(null);
  const [rateRemainingTokens, setRateRemainingTokens] = useState<number | null>(
    null
  );
  const [rateLimitTokens, setRateLimitTokens] = useState<number | null>(null);
  const [revealedDrills, setRevealedDrills] = useState<Record<number, boolean>>(
    {}
  );
  const { speak, hasVoice } = useTurkishSpeech();

  /** Persist API key */
  useEffect(() => {
    const saved = localStorage.getItem("tm_apiKey");
    if (saved) {
      setApiKey(saved);
      setShowKey(false);
    } else {
      setShowKey(true);
    }
  }, []);
  useEffect(() => {
    if (apiKey) localStorage.setItem("tm_apiKey", apiKey);
  }, [apiKey]);

  const canQuery = useMemo(
    () => apiKey.trim() && english.trim(),
    [apiKey, english]
  );

  /** Glossing: provided by API in examples; seed into local map */
  useEffect(() => {
    if (!data) return;
    const target = (data.turkish.lemma || "").toLowerCase();
    const incoming: Record<string, string> = {};
    for (const ex of data.examples || []) {
      for (const w of ex.tr.words) {
        const root = getWordRoot(w.segments)?.toLowerCase();
        const surf = (w.surface || "").toLowerCase();
        if (!surf) continue;
        if (root && root === target) continue;
        if (w.gloss) incoming[surf] = w.gloss;
      }
    }
    if (Object.keys(incoming).length) {
      setGlossMap((prev) => ({ ...incoming, ...prev }));
    }
  }, [data]);

  async function query() {
    setLoading(true);
    setError(null);
    setData(null);
    setTokenUsage(null);
    setRateRemainingTokens(null);
    setRateLimitTokens(null);

    try {
      const system = `
You are a Turkish morphology tutor and analyzer.
Return STRICT JSON matching the provided JSON Schema.
ALWAYS include: english, turkish, notes, conjugations, inflections, examples.

Also include quick_phrases: a small set of common starter phrases tailored to the lemma/part of speech.
For each inflection, you MUST include display_title and display_hint (short, beginner-friendly), and a numeric priority (lower = more useful).
For examples.tr.words[], include a short English gloss per word (1–3 words). If not applicable, use an empty string.
Include a teaching section with:
  • suffixes: short cards for 3–6 relevant suffix topics (e.g., plural, cases, possessives, -(I)yor for verbs), each with id, label, concept (when to use), rule (how to attach, harmony/buffer notes), and one minimal example (example_tr/example_en). All these fields must be present (use empty strings if unknown).
  • drills: 2–5 micro exercises; include prompt_en, prompt_tr, answer_tr, and a one-line explanation. All fields must be present; use empty strings where not applicable, but keep answer_tr non-empty.

VERBS:
- Present continuous must follow Turkish high-vowel assimilation:
  a/ı → ı (…ıyor), e/i → i (…iyor), o/u → u (…uyor), ö/ü → ü (…üyor).
- NEVER output "…ayor" or "…eyor" etc.
- Segment morphemes using these types ONLY (avoid "other" unless truly unavoidable):
  root, harmony_vowel, buffer, plural, case, possessive, copula, tense, aspect, mood, voice, person, negation, question, derivation, other.
- Handle alternations: anla→anlıyor, bekle→bekliyor, söyle→söylüyor, havla→havlıyor, git→gidiyor, et→ediyor, de→diyor, ye→yiyor.

NOUNS/ADJECTIVES:
- If not a verb, set conjugations.present_continuous with empty surfaces "" and [] segments for each person.
- Provide AT LEAST these inflections (all segmented):
  • plural
  • accusative (direct object)
  • dative or locative (choose the most natural)
  • ablative
  • genitive
  • instrumental "ile" (as a separate word, but segment "ile" if used)
  • possessives: 1SG, 2SG, 3SG, 1PL, 2PL, 3PL.

EXAMPLES:
- Give 2–3 examples.
- tr.surface must be a normal, well-spaced sentence (e.g., "Köpek havlıyor.").
- Also include tr.words: array of words, each segmented for that word ONLY (no mid-word spaces added by you).
- The joined tr.words.surface with single spaces MUST equal tr.surface (ignoring punctuation spacing).
- No hyphens in surface.
 - Where possible, include a short gloss for content words in tr.words[].gloss.

QUICK PHRASES:
- Provide 4–8 useful phrases as quick_phrases: [{ key, tr, en }]. Always include this array (can be empty if truly none).
- Choose patterns that fit the lemma/POS (e.g., for nouns: I have NOUN, I want NOUN, Can I have NOUN?, I like NOUN, Where is NOUN?; for verbs: I want to VERB, I can VERB, I'm VERBing, etc.).
- Keep them short and natural.

CLARITY:
- Avoid the "other" tag by mapping to the best category; if still used, add a brief note.
`.trim();

      const user = `English word: "${english}"\nReturn JSON only.`.trim();

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.1,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "TurkishMorphResponse",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    english: { type: "string" },
                    turkish: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        lemma: { type: "string" },
                        stem: { type: "string" },
                        pos: {
                          type: "string",
                          enum: [
                            "verb",
                            "noun",
                            "adjective",
                            "adverb",
                            "postposition",
                            "other",
                          ],
                        },
                      },
                      required: ["lemma", "stem", "pos"],
                    },
                    notes: { type: "array", items: { type: "string" } },
                    conjugations: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        present_continuous: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            ben: personObjSchema(),
                            sen: personObjSchema(),
                            o: personObjSchema(),
                            biz: personObjSchema(),
                            siz: personObjSchema(),
                            onlar: personObjSchema(),
                          },
                          required: ["ben", "sen", "o", "biz", "siz", "onlar"],
                        },
                      },
                      required: ["present_continuous"],
                    },
                    inflections: {
                      type: "array",
                      items: inflectionObjSchema(),
                    },
                    examples: {
                      type: "array",
                      items: exampleObjSchema(),
                      minItems: 1,
                    },
                    quick_phrases: {
                      type: "array",
                      items: quickPhraseObjSchema(),
                    },
                    teaching: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        suffixes: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              id: { type: "string" },
                              label: { type: "string" },
                              concept: { type: "string" },
                              rule: { type: "string" },
                              example_tr: { type: "string" },
                              example_en: { type: "string" },
                            },
                            required: [
                              "id",
                              "label",
                              "concept",
                              "rule",
                              "example_tr",
                              "example_en",
                            ],
                          },
                        },
                        drills: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              prompt_en: { type: "string" },
                              prompt_tr: { type: "string" },
                              answer_tr: { type: "string" },
                              explanation: { type: "string" },
                            },
                            required: [
                              "prompt_en",
                              "prompt_tr",
                              "answer_tr",
                              "explanation",
                            ],
                          },
                        },
                      },
                      required: ["suffixes", "drills"],
                    },
                  },
                  required: [
                    "english",
                    "turkish",
                    "notes",
                    "conjugations",
                    "inflections",
                    "examples",
                    "quick_phrases",
                    "teaching",
                  ],
                },
              },
            },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        }
      );

      if (!response.ok) {
        const t = await response.text();
        throw new Error(t || `HTTP ${response.status}`);
      }

      // Capture rate-limit headers (if provided by OpenAI)
      const remHeader = response.headers.get("x-ratelimit-remaining-tokens");
      const limHeader = response.headers.get("x-ratelimit-limit-tokens");
      const remNum = remHeader ? parseInt(remHeader, 10) : null;
      const limNum = limHeader ? parseInt(limHeader, 10) : null;
      if (!Number.isNaN(remNum as number)) setRateRemainingTokens(remNum);
      if (!Number.isNaN(limNum as number)) setRateLimitTokens(limNum);

      const json = await response.json();
      const usage = json?.usage;
      if (usage) {
        const prompt = Number(usage.prompt_tokens) || 0;
        const completion = Number(usage.completion_tokens) || 0;
        const total = Number(usage.total_tokens) || prompt + completion || 0;
        setTokenUsage({ prompt, completion, total });
      }
      const raw = json?.choices?.[0]?.message?.content;
      const parsed: ApiResponse =
        typeof raw === "string" ? JSON.parse(raw) : raw;
      setData(parsed);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const hasPC =
    !!data?.conjugations?.present_continuous &&
    Object.values(data.conjugations.present_continuous).some(
      (p) =>
        (p.surface && p.surface.trim().length > 0) ||
        (p.segments && p.segments.length > 0)
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 p-6 sm:p-10 text-slate-900">
      {(tokenUsage ||
        rateRemainingTokens !== null ||
        rateLimitTokens !== null) && (
        <div className="fixed top-3 right-3 z-50">
          <div className="rounded-lg bg-slate-900/80 text-white text-xs px-3 py-2 shadow-lg backdrop-blur">
            <div className="font-medium mb-0.5">OpenAI usage</div>
            {tokenUsage ? (
              <div className="leading-tight">
                Used: <span className="font-semibold">{tokenUsage.total}</span>
                <span className="opacity-80">
                  {" "}
                  (p {tokenUsage.prompt} / c {tokenUsage.completion})
                </span>
              </div>
            ) : null}
            {rateRemainingTokens !== null || rateLimitTokens !== null ? (
              <div className="leading-tight">
                Remaining:{" "}
                <span className="font-semibold">
                  {rateRemainingTokens ?? "?"}
                </span>
                {rateLimitTokens !== null ? (
                  <span className="opacity-80"> / {rateLimitTokens}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Turkish Morph Trainer
          </h1>
          <p className="text-sm text-slate-600">
            Enter an English word → get Turkish lemma, segmented forms, and
            examples.
          </p>

          {/* Morpheme legend */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <LegendTag type="root" label="root" />
            <LegendTag type="harmony_vowel" label="harmony vowel" />
            <LegendTag type="buffer" label="buffer/linker" />
            <LegendTag type="tense" label="tense" />
            <LegendTag type="aspect" label="aspect" />
            <LegendTag type="mood" label="mood" />
            <LegendTag type="voice" label="voice" />
            <LegendTag type="person" label="person" />
            <LegendTag type="plural" label="plural" />
            <LegendTag type="possessive" label="possessive" />
            <LegendTag type="case" label="case" />
            <LegendTag type="copula" label="copula" />
            <LegendTag type="derivation" label="derivation" />
          </div>

          {/* Person legend */}
          <div className="text-xs text-slate-600">
            <span className="font-medium">Persons:</span> 1SG=ben (I), 2SG=sen
            (you sg), 3SG=o (he/she/it), 1PL=biz (we), 2PL=siz (you pl/polite),
            3PL=onlar (they)
          </div>
        </header>

        <section className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border shadow-sm space-y-3">
            {showKey && (
              <div className="space-y-1">
                <label className="text-sm font-medium">OpenAI API key</label>
                <input
                  type="password"
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKey(false)}
                    className="text-xs text-slate-600 underline hover:text-slate-800"
                  >
                    Hide API key field
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">English word</label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                placeholder="e.g., dog, spoon, eat, beautiful"
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={query}
                disabled={!canQuery || loading}
                className="rounded-xl px-4 py-2 bg-indigo-600 text-white disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Analyze"}
              </button>
              {!showKey && (
                <button
                  type="button"
                  onClick={() => setShowKey(true)}
                  className="text-sm text-slate-600 underline hover:text-slate-800"
                >
                  Change API key
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500">
              For production, don’t expose your key in the browser; proxy
              server-side or use ephemeral keys.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border shadow-sm">
            {!data && !error && (
              <p className="text-sm text-slate-600">
                Results appear here… Try “dog”.
              </p>
            )}
            {error && (
              <p className="text-sm text-rose-700 whitespace-pre-wrap">
                {error}
              </p>
            )}
            {data && (
              <div className="space-y-4">
                <div className="text-sm">
                  <div>
                    <span className="font-medium">EN:</span> {data.english}
                  </div>
                  <div>
                    <span className="font-medium">TR lemma:</span>{" "}
                    <span className="font-mono text-indigo-700">
                      {data.turkish.lemma}
                    </span>{" "}
                    <span className="text-xs text-slate-500">
                      ({data.turkish.pos})
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Stem:</span>{" "}
                    <span className="font-mono">{data.turkish.stem}</span>
                  </div>
                </div>

                {hasPC ? (
                  <div className="space-y-2">
                    <h3 className="font-medium">
                      Present continuous (-(I)yor)
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {(
                        Object.entries(
                          data.conjugations.present_continuous
                        ) as Array<
                          [PersonKey, { surface: string; segments: Segmented }]
                        >
                      ).map(([person, val]) => (
                        <div
                          key={person}
                          className="p-3 rounded-xl border bg-slate-50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-slate-600">
                              {person}
                            </div>
                            <button
                              type="button"
                              title={hasVoice ? "Speak (Turkish)" : "Speak"}
                              aria-label="Speak"
                              onClick={() => speak((val.surface || "").trim())}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-slate-200 text-slate-700"
                            >
                              <SpeakerIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <SegmentedSentence
                            words={[
                              {
                                surface: val.surface || "",
                                segments: val.segments || [],
                              },
                            ]}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    Not a verb — showing useful forms below.
                  </p>
                )}

                {data.inflections && data.inflections.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Useful forms</h3>
                      <button
                        type="button"
                        onClick={() => setShowUsefulLegend((v) => !v)}
                        className="text-xs text-slate-600 hover:text-slate-800 inline-flex items-center gap-1"
                        aria-expanded={showUsefulLegend}
                        aria-controls="useful-legend"
                        title={showUsefulLegend ? "Hide legend" : "Show legend"}
                      >
                        <InfoIcon className="w-3.5 h-3.5" />
                        {showUsefulLegend ? "Hide legend" : "Show legend"}
                      </button>
                    </div>
                    {showUsefulLegend && (
                      <div
                        id="useful-legend"
                        className="text-[11px] text-slate-600 space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-700 font-medium mr-1">
                            Cases:
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            Direct object (Accusative)
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            To/Towards (Dative)
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            In/At/On (Locative)
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            From (Ablative)
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            Of (Genitive)
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            With (&quot;ile&quot;)
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-700 font-medium mr-1">
                            Possessives:
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            My
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            Your (sg)
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            His/Her/Its
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            Our
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            Your (pl/polite)
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            Their
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-700 font-medium mr-1">
                            Number:
                          </span>
                          <span className="px-2 py-0.5 rounded-full border bg-slate-100">
                            Plural
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {data.inflections.map((inf, i) => {
                        const d = getInflectionDisplay(inf);
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-xl border bg-slate-50"
                          >
                            <div className="flex items-start justify-between mb-1 gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-slate-700 truncate">
                                  {d.title}
                                </div>
                                {d.hint && (
                                  <div className="text-[11px] text-slate-500 leading-snug">
                                    {d.hint}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                title={hasVoice ? "Speak (Turkish)" : "Speak"}
                                aria-label="Speak"
                                onClick={() => speak(inf.surface)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-slate-200 text-slate-700"
                              >
                                <SpeakerIcon className="w-4 h-4" />
                              </button>
                            </div>
                            <SegmentedSentence
                              words={[
                                {
                                  surface: inf.surface,
                                  segments: inf.segments,
                                },
                              ]}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-3">
                      {data.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl border bg-slate-50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-slate-600">
                              EN: {ex.en}
                            </div>
                            <button
                              type="button"
                              title={hasVoice ? "Speak (Turkish)" : "Speak"}
                              aria-label="Speak"
                              onClick={() => speak(ex.tr.surface)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-slate-200 text-slate-700"
                            >
                              <SpeakerIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <SegmentedSentence
                            words={ex.tr.words}
                            glosses={glossMap}
                            targetLemma={data.turkish.lemma}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.quick_phrases && data.quick_phrases.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Quick phrases</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {data.quick_phrases.map((qp, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border bg-slate-50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-slate-600">
                              EN: {qp.en}
                            </div>
                            <button
                              type="button"
                              title={hasVoice ? "Speak (Turkish)" : "Speak"}
                              aria-label="Speak"
                              onClick={() => speak(qp.tr)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-slate-200 text-slate-700"
                            >
                              <SpeakerIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-base">{qp.tr}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.teaching && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Learn</h3>
                    {data.teaching.suffixes &&
                      data.teaching.suffixes.length > 0 && (
                        <div className="grid gap-3">
                          {data.teaching.suffixes.map((suf, i) => (
                            <div
                              key={suf.id + i}
                              className="p-3 rounded-xl border bg-slate-50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-slate-700 truncate">
                                    {suf.label}
                                  </div>
                                  {suf.concept && (
                                    <div className="text-[11px] text-slate-500 leading-snug">
                                      {suf.concept}
                                    </div>
                                  )}
                                </div>
                                {suf.example_tr && (
                                  <button
                                    onClick={() => speak(suf.example_tr!)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-slate-200 text-slate-700"
                                    title="Play example"
                                  >
                                    <SpeakerIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {suf.rule && (
                                <div className="text-xs text-slate-600 mt-1">
                                  {suf.rule}
                                </div>
                              )}
                              {suf.example_tr && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Example:</span>{" "}
                                  {suf.example_tr}
                                  {suf.example_en && (
                                    <span className="text-slate-600">
                                      {" "}
                                      — {suf.example_en}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    {data.teaching.drills &&
                      data.teaching.drills.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-sm font-medium">Drills</div>
                          {data.teaching.drills.map((d, idx) => {
                            const revealed = !!revealedDrills[idx];
                            return (
                              <div
                                key={idx}
                                className="p-3 rounded-xl border bg-slate-50"
                              >
                                <div className="text-sm">
                                  {d.prompt_en && (
                                    <div className="text-slate-800">
                                      {d.prompt_en}
                                    </div>
                                  )}
                                  {d.prompt_tr && (
                                    <div className="text-slate-700 mt-0.5">
                                      {d.prompt_tr}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setRevealedDrills((prev) => ({
                                        ...prev,
                                        [idx]: !revealed,
                                      }))
                                    }
                                    className="text-xs px-2 py-1 rounded bg-slate-900 text-white hover:bg-black"
                                  >
                                    {revealed ? "Hide answer" : "Show answer"}
                                  </button>
                                  {revealed && (
                                    <>
                                      <div className="text-sm font-medium">
                                        {d.answer_tr}
                                      </div>
                                      <button
                                        onClick={() => speak(d.answer_tr)}
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-slate-200 text-slate-700"
                                        title="Play answer"
                                      >
                                        <SpeakerIcon className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                {revealed && d.explanation && (
                                  <div className="mt-1 text-xs text-slate-700">
                                    {d.explanation}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                )}

                {data.notes && data.notes.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="font-medium">Notes</h3>
                    <ul className="list-disc pl-5 text-sm">
                      {data.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** ---- Schema helpers ---- */

function morphemeObjSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string" },
      type: {
        type: "string",
        enum: [
          "root",
          "harmony_vowel",
          "tense",
          "person",
          "plural",
          "negation",
          "question",
          "case",
          "buffer",
          "possessive",
          "copula",
          "voice",
          "mood",
          "aspect",
          "derivation",
          "other",
        ],
      },
    },
    required: ["text", "type"],
  } as const;
}

function personObjSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      surface: { type: "string" },
      segments: {
        type: "array",
        items: morphemeObjSchema(),
      },
    },
    required: ["surface", "segments"],
  } as const;
}

function inflectionObjSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string" },
      surface: { type: "string" },
      segments: {
        type: "array",
        items: morphemeObjSchema(),
      },
      display_title: { type: "string" },
      display_hint: { type: "string" },
      priority: { type: "number" },
    },
    required: [
      "label",
      "surface",
      "segments",
      "display_title",
      "display_hint",
      "priority",
    ],
  } as const;
}

function exampleObjSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      en: { type: "string" },
      tr: {
        type: "object",
        additionalProperties: false,
        properties: {
          surface: { type: "string" },
          words: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                surface: { type: "string" },
                segments: { type: "array", items: morphemeObjSchema() },
                gloss: { type: "string" },
              },
              required: ["surface", "segments", "gloss"],
            },
          },
        },
        required: ["surface", "words"],
      },
    },
    required: ["en", "tr"],
  } as const;
}

function quickPhraseObjSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      key: { type: "string" },
      tr: { type: "string" },
      en: { type: "string" },
    },
    required: ["key", "tr", "en"],
  } as const;
}
