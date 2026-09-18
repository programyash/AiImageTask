import type { PersonDetail } from '@/types/analysis';
import { CollapsibleCard } from './CollapsibleCard';
import { CheckIcon, SmileIcon, UsersIcon } from './icons';

interface PeopleDetailsProps {
  people: PersonDetail[];
}

/** Per-person breakdown: observable description plus face/expression flags. */
export function PeopleDetails({ people }: PeopleDetailsProps) {
  const visibleFaces = people.filter((person) => person.face_visible).length;

  return (
    <CollapsibleCard
      title="People in the image"
      subtitle={`${people.length} ${people.length === 1 ? 'person' : 'people'} · ${visibleFaces} ${
        visibleFaces === 1 ? 'face' : 'faces'
      } clearly visible`}
      icon={<UsersIcon className="h-5 w-5" />}
    >
      <ol className="space-y-2" aria-label="People">
        {people.map((person, index) => (
          <li
            key={`${index}-${person.description.slice(0, 24)}`}
            className="flex items-start gap-3 rounded-xl border border-line bg-canvas/60 px-3.5 py-3"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{person.description}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium ${
                    person.face_visible ? 'bg-brand-50 text-brand-700' : 'bg-muted text-ink-2'
                  }`}
                >
                  {person.face_visible && <CheckIcon className="h-3 w-3" />}
                  {person.face_visible ? 'Face visible' : 'Face not clearly visible'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium ${
                    person.appears_happy ? 'bg-brand-700 text-white' : 'bg-muted text-ink-2'
                  }`}
                >
                  <SmileIcon className="h-3 w-3" />
                  {person.appears_happy ? 'Appears happy' : 'Not visibly happy'}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </CollapsibleCard>
  );
}
