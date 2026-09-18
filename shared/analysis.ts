/**
 * Shared analysis contract.
 *
 * This module is the single source of truth for the shape of an image
 * analysis result. It is imported by BOTH the Electron main process (which
 * validates the raw Gemini output against it) and the React renderer (which
 * consumes the already-validated result), so the two sides can never drift.
 *
 * The three fields the assignment requires - `objects`, `people_count` and
 * `happy_people_count` - are mandatory. Everything else is optional depth:
 * a summary of what the image is, document/ID extraction, legible text,
 * per-object attributes and a per-person breakdown. A model that omits the
 * optional parts still produces a valid result.
 */
import { z } from 'zod';

/** Upper bounds that keep a hallucinated/garbage response from reaching the UI. */
export const MAX_OBJECT_ENTRIES = 40;
export const MAX_COUNT_PER_ENTRY = 10_000;
export const MAX_ATTRIBUTES_PER_OBJECT = 8;
export const MAX_DOCUMENT_FIELDS = 30;
export const MAX_TEXT_LINES = 80;
export const MAX_PEOPLE_DETAILS = 24;
export const MAX_TAGS = 10;

/** Optional free text: trims, caps length, and turns null/"" into undefined. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : undefined));

/** Optional list of short strings, de-duplicated and capped. */
const optionalStrings = (max: number, itemMax: number) =>
  z
    .array(z.string().trim().max(itemMax))
    .nullish()
    .transform((items) => {
      if (!items) return undefined;
      const seen = new Set<string>();
      const clean: string[] = [];
      for (const item of items) {
        const key = item.toLowerCase();
        if (item && !seen.has(key)) {
          seen.add(key);
          clean.push(item);
        }
      }
      return clean.length ? clean.slice(0, max) : undefined;
    });

/** A single kind of object that Gemini reported, with how many were visible. */
export const detectedObjectSchema = z.object({
  name: z.string().trim().min(1).max(60),
  count: z.number().int().min(1).max(MAX_COUNT_PER_ENTRY),
  /** One sentence: what it looks like, e.g. "wooden dining chair with a slatted back". */
  description: optionalText(220),
  /** Short observable traits: "wooden", "four legs", "brown", "worn". */
  attributes: optionalStrings(MAX_ATTRIBUTES_PER_OBJECT, 40),
});

/** Broad kind of image; drives which result cards the UI shows. */
export const imageCategorySchema = z.enum([
  'photo',
  'document',
  'screenshot',
  'artwork',
  'diagram',
  'product',
  'other',
]);

export const documentFieldSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(240),
});

/** Present when the image is (or contains) a document, card, receipt, form, etc. */
export const documentInfoSchema = z.object({
  detected: z.boolean(),
  /** E.g. "Aadhaar card", "PAN card", "passport", "driving licence", "invoice". */
  type: optionalText(80),
  /** Issuing body printed on the document, e.g. "Government of India / UIDAI". */
  issuer: optionalText(120),
  fields: z
    .array(documentFieldSchema)
    .nullish()
    .transform((fields) => (fields?.length ? fields.slice(0, MAX_DOCUMENT_FIELDS) : undefined)),
  notes: optionalText(300),
});

export const personDetailSchema = z.object({
  /** Observable description only: "adult, short dark hair, blue shirt, facing camera". */
  description: z.string().trim().min(1).max(200),
  face_visible: z.boolean(),
  appears_happy: z.boolean(),
});

/**
 * The raw structured response we ask Gemini for.
 *
 * Kept deliberately permissive about *ordering* and extra keys (unknown keys
 * are stripped by Zod) but strict about types, so a model that returns
 * `"people_count": "four"` fails validation instead of corrupting the UI.
 */
export const imageAnalysisSchema = z.object({
  objects: z.array(detectedObjectSchema).max(MAX_OBJECT_ENTRIES),
  people_count: z.number().int().min(0).max(MAX_COUNT_PER_ENTRY),
  happy_people_count: z.number().int().min(0).max(MAX_COUNT_PER_ENTRY),

  /** One or two sentences saying what the image is. */
  summary: optionalText(500),
  category: imageCategorySchema.nullish().transform((value) => value ?? undefined),
  tags: optionalStrings(MAX_TAGS, 40),
  document: documentInfoSchema.nullish().transform((value) => value ?? undefined),
  /** Every legible line of text, in reading order. */
  text_lines: optionalStrings(MAX_TEXT_LINES, 240),
  people: z
    .array(personDetailSchema)
    .nullish()
    .transform((people) => (people?.length ? people.slice(0, MAX_PEOPLE_DETAILS) : undefined)),
});

export type DetectedObject = z.output<typeof detectedObjectSchema>;
export type ImageCategory = z.output<typeof imageCategorySchema>;
export type DocumentField = z.output<typeof documentFieldSchema>;
export type DocumentInfo = z.output<typeof documentInfoSchema>;
export type PersonDetail = z.output<typeof personDetailSchema>;
export type ImageAnalysis = z.output<typeof imageAnalysisSchema>;

/** Object names the model might use for a human; all folded into "person". */
const PERSON_ALIASES = new Set(['person', 'people', 'persons', 'human', 'humans', 'human being']);

/**
 * Post-validation normalisation.
 *
 * Gemini is explicitly told to aggregate identical objects, but models are not
 * perfectly obedient. This guarantees the invariants the UI relies on:
 *   - object names are trimmed, lower-cased and de-duplicated (counts summed,
 *     attributes merged)
 *   - the "person" object row always agrees with `people_count`
 *   - entries are sorted by count descending, then alphabetically
 *   - `happy_people_count` can never exceed `people_count`
 *   - the per-person list never contradicts `people_count`
 *   - a document block is only kept when it actually says something
 */
export function normalizeAnalysis(analysis: ImageAnalysis): ImageAnalysis {
  const merged = new Map<string, DetectedObject>();

  for (const entry of analysis.objects) {
    let name = entry.name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!name) continue;
    if (PERSON_ALIASES.has(name)) name = 'person';

    const existing = merged.get(name);
    if (existing) {
      existing.count = Math.min(existing.count + entry.count, MAX_COUNT_PER_ENTRY);
      existing.description ??= entry.description;
      if (entry.attributes) {
        const combined = new Set([...(existing.attributes ?? []), ...entry.attributes]);
        existing.attributes = [...combined].slice(0, MAX_ATTRIBUTES_PER_OBJECT);
      }
    } else {
      merged.set(name, { ...entry, name });
    }
  }

  const peopleCount = analysis.people_count;

  // `people_count` is the authoritative figure; the object list must match it
  // rather than show a second, different number for the same thing.
  if (peopleCount > 0) {
    const person = merged.get('person');
    merged.set('person', {
      name: 'person',
      count: peopleCount,
      description: person?.description,
      attributes: person?.attributes,
    });
  } else {
    merged.delete('person');
  }

  const objects = [...merged.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );

  const document =
    analysis.document?.detected &&
    (analysis.document.type || analysis.document.fields?.length || analysis.document.issuer)
      ? analysis.document
      : undefined;

  const people =
    peopleCount > 0 && analysis.people?.length
      ? analysis.people.slice(0, Math.min(peopleCount, MAX_PEOPLE_DETAILS))
      : undefined;

  return {
    ...analysis,
    objects,
    people_count: peopleCount,
    // A model occasionally reports more happy faces than people; clamping keeps
    // the "X of Y appear happy" copy in the UI truthful.
    happy_people_count: Math.min(analysis.happy_people_count, peopleCount),
    document,
    people,
  };
}
