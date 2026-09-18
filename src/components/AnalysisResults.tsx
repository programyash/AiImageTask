import type { ImageAnalysis } from '@/types/analysis';
import { DocumentCard } from './DocumentCard';
import { ObjectList } from './ObjectList';
import { PeopleDetails } from './PeopleDetails';
import { ProgressRing } from './ProgressRing';
import { StatCard } from './StatCard';
import { SummaryCard } from './SummaryCard';
import { TextLines } from './TextLines';
import { CheckIcon, InfoIcon, SmileIcon, UsersIcon } from './icons';

interface AnalysisResultsProps {
  analysis: ImageAnalysis;
  model: string;
  durationMs: number;
}

function happyNote(analysis: ImageAnalysis): string | null {
  const { people_count: people, happy_people_count: happy } = analysis;
  if (people === 0) return null;
  if (happy === people) return 'Every visible face appears to be smiling.';
  if (happy === 0) return 'No visible faces appear to be smiling.';
  return `${happy} of ${people} visible ${people === 1 ? 'face appears' : 'faces appear'} to be smiling.`;
}

/**
 * The full results panel. Order is: what the image is → the two headline
 * counts → document fields (when it is a document) → objects → optional depth
 * (people, text) → the caveat note. Sections the model did not fill in are
 * simply not rendered.
 */
export function AnalysisResults({ analysis, model, durationMs }: AnalysisResultsProps) {
  const people = analysis.people_count;
  const happy = analysis.happy_people_count;
  const note = happyNote(analysis);
  const isDocument = analysis.category === 'document' && analysis.document;

  let delay = 0;
  const stagger = () => {
    const style = { animationDelay: `${delay}ms` };
    delay += 50;
    return style;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="animate-fade-up" style={stagger()}>
        <SummaryCard analysis={analysis} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          className="animate-fade-up"
          style={stagger()}
          label="People"
          value={people}
          caption={people === 1 ? 'person detected' : 'people detected'}
          icon={<UsersIcon className="h-6 w-6" />}
        />

        <StatCard
          className="animate-fade-up"
          style={stagger()}
          label="Appearing Happy"
          value={happy}
          caption={people === 0 ? 'no people to assess' : `of ${people} ${people === 1 ? 'person' : 'people'}`}
          tone="secondary"
          icon={<SmileIcon className="h-6 w-6" />}
          aside={
            people > 0 ? <ProgressRing value={happy / people} size={64} label="Share appearing happy" /> : undefined
          }
          note={
            note ? (
              <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[13px] font-medium text-brand-700">
                <span aria-hidden="true">
                  {happy > 0 ? <SmileIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                </span>
                {note}
              </p>
            ) : undefined
          }
        />
      </div>

      {isDocument && analysis.document && (
        <div className="animate-fade-up" style={stagger()}>
          <DocumentCard document={analysis.document} />
        </div>
      )}

      <div className="animate-fade-up" style={stagger()}>
        <ObjectList objects={analysis.objects} />
      </div>

      {/* A document that was not the main subject (e.g. a card on a desk) still gets its fields. */}
      {!isDocument && analysis.document && (
        <div className="animate-fade-up" style={stagger()}>
          <DocumentCard document={analysis.document} />
        </div>
      )}

      {analysis.people && analysis.people.length > 0 && (
        <div className="animate-fade-up" style={stagger()}>
          <PeopleDetails people={analysis.people} />
        </div>
      )}

      {analysis.text_lines && analysis.text_lines.length > 0 && (
        <div className="animate-fade-up" style={stagger()}>
          <TextLines lines={analysis.text_lines} />
        </div>
      )}

      <aside
        className="flex gap-3 rounded-2xl border border-line bg-canvas/70 p-4 animate-fade-up"
        style={stagger()}
        aria-label="About these results"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700"
          aria-hidden="true"
        >
          <InfoIcon className="h-4 w-4" />
        </span>
        <div className="text-[13px] leading-relaxed text-ink-2">
          <p className="font-semibold text-ink">About these results</p>
          <p className="mt-0.5">
            Everything above is the model&rsquo;s reading of what is visible. &ldquo;Appearing happy&rdquo; is an
            estimate from facial cues such as smiling, not a measure of actual emotion; faces that are small, turned
            away or obscured are not counted. Transcribed text and document fields are copied as printed and can
            contain reading errors.
          </p>
          <p className="mt-1 text-xs text-ink-3">
            Analyzed by {model} in {(durationMs / 1000).toFixed(1)}s.
          </p>
        </div>
      </aside>
    </div>
  );
}
