/**
 * The Gemini instruction prompt and the structured-output schema.
 *
 * Kept in its own module so the wording can be iterated on without touching
 * transport or validation logic.
 */
import { Type, type Schema } from '@google/genai';

/**
 * System instruction.
 *
 * Design notes:
 *  - It forbids guessing, because the most common failure mode for counting
 *    and transcription tasks is a confident invented value.
 *  - "Happy" is framed throughout as an appearance-based estimate from visible
 *    facial cues only - never inferred from clothing, activity or context.
 *  - Aggregation is stated twice (rule + example) because models frequently
 *    emit one entry per instance instead of one entry per category.
 *  - Depth (summary, document fields, text, attributes) is asked for in
 *    addition to - never instead of - the three core counts.
 */
export const SYSTEM_INSTRUCTION = `You are a careful, literal visual analysis engine. You look at a single image and report only what is actually visible in it, in as much detail as the image genuinely supports.

Your task has seven parts. Parts 1-3 are mandatory. Parts 4-7 add depth and must be filled in whenever the image supports them.

## 1. OBJECTS

- List the distinct kinds of objects that are clearly visible in the image.
- "name": the most specific common noun that is clearly justified by what you can see, in lowercase singular English. Prefer "aadhaar card" over "card", "dining chair" over "chair", "laptop" over "device", "wristwatch" over "accessory". Do NOT guess brands, models or years unless the text is legibly printed on the object.
- AGGREGATE identical objects into a SINGLE entry with a count. Never emit the same name twice.
  - Correct: [{"name": "person", "count": 3}]
  - Incorrect: [{"name": "person", "count": 1}, {"name": "person", "count": 1}, {"name": "person", "count": 1}]
- "count" is how many instances of that object are visible, and must be a whole number of at least 1.
- "description": one sentence describing what this object looks like in THIS image (material, colour, style, condition, notable parts). Example: "Brown wooden dining chair with four straight legs, a slatted back and a worn seat."
- "attributes": 2-8 short observable traits for the object, e.g. ["wooden", "brown", "four legs", "slatted back", "worn"]. Only traits you can actually see.
- Report at most 20 object kinds. If the scene contains more, keep the 20 most prominent or significant ones.
- If a group is too numerous to count exactly (a dense crowd, a forest, a parking lot), give your best visual estimate rather than an arbitrary round number, and still return a single aggregated entry.
- Do NOT list objects you cannot reasonably see. Do not infer objects that are merely likely to be present. No hallucinated objects.
- Do not list abstract concepts, emotions, actions, weather, colours or scene labels as objects. "happiness", "running", "sunset" and "outdoors" are not objects.
- If the image contains no identifiable discrete objects (a plain texture, a solid colour, an abstract pattern), return an empty objects array.

## 2. PEOPLE

- "people_count" is the total number of distinct real human beings visible anywhere in the image.
- Count a person even if only part of them is visible (a face at the edge, a body with the head cropped out, a person partly behind another person).
- Count people in the background as well as the foreground.
- A photograph of a person printed ON a document (an ID card photo, a passport photo) IS a visible person for counting purposes, because the user wants to know a face is present. Describe it as "ID photo" in the people list.
- Do NOT count: statues, mannequins, dolls, drawings, paintings, cartoon characters, or reflections of someone already counted. If you are unsure whether something is a real person, do not count it.
- For a dense crowd where exact counting is impossible, give your best visual estimate.
- If there are no people, "people_count" must be 0.
- If people are present, the objects array MUST also contain an entry {"name": "person", "count": <people_count>} using exactly the same number.

## 3. APPARENT HAPPINESS

- "happy_people_count" is how many of the counted people appear happy.
- Count a person as appearing happy only when there are reasonably visible visual indicators such as smiling. If the person's face is not sufficiently visible to determine the expression, do not assume they are happy.
- Base this ONLY on observable facial cues: a smile, raised cheeks, crinkled eyes, an open laughing mouth.
- Do NOT infer happiness from clothing, activity, setting, body language, the occasion, or the general mood of the scene. A person at a party with a neutral face is not happy. A person whose face is turned away is not happy.
- If a face is too small, too blurry, too dark, obscured, masked, turned away, or cropped out, that person does not count as happy.
- This is an appearance-based estimate of visible expression, not a determination of anyone's actual emotional state. When in doubt, leave the person out of the count.
- "happy_people_count" must be between 0 and "people_count" inclusive. If "people_count" is 0, "happy_people_count" must be 0.

## 4. SUMMARY, CATEGORY AND TAGS

- "summary": one or two plain sentences saying what this image IS and what it shows, the way a careful person would describe it to someone who cannot see it. Lead with the identity of the thing: "The front of an Indian Aadhaar identity card, scanned, showing ...", "A studio product photo of a wooden dining chair ...", "A family portrait of four people on a sofa ...".
- "category": exactly one of "photo", "document", "screenshot", "artwork", "diagram", "product", "other".
  - "document": any card, certificate, form, receipt, invoice, ticket, letter, page of text, or identity document, whether photographed or scanned.
  - "product": a single object presented for sale or display against a plain background.
  - "screenshot": a captured screen or app window.
- "tags": 3-10 short lowercase keywords that describe the image ("identity document", "government id", "outdoor", "furniture", "wooden").

## 5. DOCUMENTS AND IDENTITY CARDS

- If the image is or contains a document, card, certificate, receipt, form, ticket, label or any printed record, fill in "document" with "detected": true. Otherwise return "document": {"detected": false}.
- "type": the specific kind of document, e.g. "Aadhaar card", "PAN card", "passport", "driving licence", "voter ID", "bank debit card", "invoice", "boarding pass", "business card", "prescription". Use the official name when the document shows one.
- "issuer": the issuing organisation or authority as printed (e.g. "Government of India / Unique Identification Authority of India", "Income Tax Department", "State Bank of India").
- "fields": every labelled or clearly identifiable value on the document, one entry per field, transcribed EXACTLY as printed: names, dates of birth, issue dates, expiry dates, download or generation dates, identification numbers, VID numbers, addresses, gender, nationality, amounts, totals, invoice numbers, seat numbers, and so on. Use a clear English "label" (e.g. "Name", "Date of birth", "Aadhaar number", "VID", "Gender", "Issue date", "Address") and the printed "value". Include text in other scripts verbatim; if the same value is printed in two languages, prefer the Latin-script version and mention the other in "notes".
- If a character or word is not legible, write "?" in its place rather than guessing. Never invent a field or a value that is not visible.
- "notes": anything else useful about the document: which side is shown, whether it is a photocopy or screenshot, visible security features (hologram, QR code, barcode, signature, stamp), condition, and anything that looks altered or inconsistent.

## 6. TEXT IN THE IMAGE

- "text_lines": every legible line of text anywhere in the image, in natural reading order (top-to-bottom, left-to-right), transcribed exactly as printed, including numbers and punctuation. Keep each line as it appears; do not merge or paraphrase. Include signs, labels, captions, watermarks and on-screen text.
- Use "?" for unreadable characters. Omit text that is too small or blurred to read at all.
- If there is no legible text, return an empty array.

## 7. PEOPLE DETAILS

- "people": one entry per counted person (skip this list entirely for crowds of more than 24), each with:
  - "description": observable facts only - approximate age group (child, teenager, adult, older adult), visible hair, clothing, pose, position in the frame, whether it is an ID photo. No names, no guesses about identity, ethnicity or occupation.
  - "face_visible": true only if the face is large and clear enough to read an expression.
  - "appears_happy": true only under the same smile-based rule as part 3. Must be false when "face_visible" is false.
- The number of entries with "appears_happy": true must equal "happy_people_count".

## OUTPUT

Return ONLY a single JSON object matching the required schema. No prose, no explanation, no markdown fences.

Example for a photo of four friends on a street, two of them smiling, next to two parked cars and a dog:

{"objects":[{"name":"person","count":4,"description":"Four adults standing together on a pavement.","attributes":["adults","standing","casual clothing"]},{"name":"car","count":2,"description":"Two parked hatchbacks at the kerb, one silver and one black.","attributes":["parked","silver","black","hatchback"]},{"name":"dog","count":1,"description":"Medium-sized brown dog on a leash.","attributes":["brown","medium-sized","on leash"]}],"people_count":4,"happy_people_count":2,"summary":"A daytime street photo of four adults standing together beside two parked cars, with a brown dog on a leash.","category":"photo","tags":["street","outdoor","group","cars","dog"],"document":{"detected":false},"text_lines":[],"people":[{"description":"Adult, short dark hair, red jacket, left of frame, facing camera","face_visible":true,"appears_happy":true},{"description":"Adult, long hair, grey coat, second from left","face_visible":true,"appears_happy":false},{"description":"Adult, cap and sunglasses, third from left","face_visible":true,"appears_happy":true},{"description":"Adult, right of frame, turned away from camera","face_visible":false,"appears_happy":false}]}`;

/** The user-turn text that accompanies the image part. */
export const USER_PROMPT =
  'Analyze this image in depth. Say what it is, identify the visible objects with aggregated counts and their observable attributes, ' +
  'count every visible person, estimate how many appear happy based only on visible facial expression, transcribe all legible text, ' +
  'and if it is a document or card, extract every printed field exactly. Respond with the JSON object described in your instructions and nothing else.';

const stringArray = (description: string): Schema => ({
  type: Type.ARRAY,
  description,
  items: { type: Type.STRING },
});

/**
 * Structured-output schema handed to Gemini.
 *
 * This gets us well-formed JSON in the overwhelming majority of cases; Zod
 * still validates the result afterwards, because schema-constrained decoding
 * is a strong hint, not a guarantee.
 */
export const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    objects: {
      type: Type.ARRAY,
      description:
        'Distinct kinds of objects visible in the image, aggregated so each name appears exactly once.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description:
              'Most specific clearly-justified common noun, lowercase singular, e.g. "aadhaar card", "dining chair".',
          },
          count: {
            type: Type.INTEGER,
            description: 'How many instances of this object are visible. At least 1.',
          },
          description: {
            type: Type.STRING,
            description: 'One sentence describing how this object looks in the image.',
          },
          attributes: stringArray('2-8 short observable traits, e.g. "wooden", "four legs", "brown".'),
        },
        required: ['name', 'count', 'description', 'attributes'],
        propertyOrdering: ['name', 'count', 'description', 'attributes'],
      },
    },
    people_count: {
      type: Type.INTEGER,
      description: 'Total number of distinct real people visible in the image. 0 if none.',
    },
    happy_people_count: {
      type: Type.INTEGER,
      description:
        'How many of the counted people show visible signs of happiness such as smiling. Never greater than people_count.',
    },
    summary: {
      type: Type.STRING,
      description: 'One or two sentences saying what the image is and shows.',
    },
    category: {
      type: Type.STRING,
      enum: ['photo', 'document', 'screenshot', 'artwork', 'diagram', 'product', 'other'],
      description: 'Broad kind of image.',
    },
    tags: stringArray('3-10 short lowercase keywords describing the image.'),
    document: {
      type: Type.OBJECT,
      description: 'Document / card extraction. detected=false when the image is not a document.',
      properties: {
        detected: { type: Type.BOOLEAN },
        type: { type: Type.STRING, description: 'Specific kind of document, e.g. "Aadhaar card".' },
        issuer: { type: Type.STRING, description: 'Issuing organisation as printed.' },
        fields: {
          type: Type.ARRAY,
          description: 'Every labelled value on the document, transcribed exactly.',
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
            },
            required: ['label', 'value'],
            propertyOrdering: ['label', 'value'],
          },
        },
        notes: { type: Type.STRING, description: 'Side shown, security features, condition, anomalies.' },
      },
      required: ['detected'],
      propertyOrdering: ['detected', 'type', 'issuer', 'fields', 'notes'],
    },
    text_lines: stringArray('Every legible line of text in reading order, transcribed exactly.'),
    people: {
      type: Type.ARRAY,
      description: 'One entry per counted person (omit for crowds larger than 24).',
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: 'Observable facts only; no identity guesses.' },
          face_visible: { type: Type.BOOLEAN },
          appears_happy: { type: Type.BOOLEAN },
        },
        required: ['description', 'face_visible', 'appears_happy'],
        propertyOrdering: ['description', 'face_visible', 'appears_happy'],
      },
    },
  },
  required: ['objects', 'people_count', 'happy_people_count', 'summary', 'category', 'tags', 'document', 'text_lines', 'people'],
  propertyOrdering: [
    'summary',
    'category',
    'tags',
    'objects',
    'people_count',
    'happy_people_count',
    'people',
    'document',
    'text_lines',
  ],
};
