import type { ReactElement, SVGProps } from 'react';

/**
 * Inline line icons (24px grid, 1.75 stroke). Keeping them here avoids an
 * icon dependency and keeps every glyph visually consistent.
 */
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

export const LogoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="6.25" />
    <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="m20.5 15.5-4.3-4.3a1.5 1.5 0 0 0-2.1 0L7 18.5" />
  </svg>
);

export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" />
    <path d="M4 15.5v2A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
  </svg>
);

export const FolderIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.2a2 2 0 0 1 1.6.8l.9 1.2h6.3A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5z" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)} strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const SparkleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 1.9 4.9 4.9 1.9-4.9 1.9L12 16.6l-1.9-4.9-4.9-1.9 4.9-1.9z" />
    <path d="m19 15 .7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" />
  </svg>
);

export const ResetIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9.5" cy="8" r="3.25" />
    <path d="M3.5 19.5a6 6 0 0 1 12 0" />
    <circle cx="17" cy="9.5" r="2.25" />
    <path d="M16 15.2a4.6 4.6 0 0 1 4.5 4.3" />
  </svg>
);

export const SmileIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 14.2a4.5 4.5 0 0 0 7 0" />
    <path d="M9.2 9.5h.01M14.8 9.5h.01" strokeWidth={2.5} />
  </svg>
);

export const CubeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 7.5 4.25v8.5L12 20l-7.5-4.25v-8.5z" />
    <path d="M12 11.5 19.5 7.25M12 11.5 4.5 7.25M12 11.5V20" />
  </svg>
);

export const InfoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" strokeWidth={2.2} />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.3 4.2 2.9 17.3A2 2 0 0 0 4.6 20.3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 16.8h.01" strokeWidth={2.2} />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const LeafIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" />
    <path d="M5 19c3-4 6-7 10-10" />
  </svg>
);

export const ListIcon = (p: IconProps) => (
  <svg {...base(p)} strokeWidth={2}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
);

export const GridIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)} strokeWidth={2.2}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const KeyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="14" r="4" />
    <path d="m11 11 8.5-8.5M16 6l2.5 2.5M13.5 8.5 16 11" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

export const FileTextIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 3.5h6.5L18.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
    <path d="M13.5 3.5v5h5M8.5 12h7M8.5 15.5h7" />
  </svg>
);

export const IdCardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <circle cx="8.5" cy="11" r="2" />
    <path d="M5.5 16a3 3 0 0 1 6 0M13.5 10h5M13.5 13.5h5" />
  </svg>
);

export const TextLinesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 10h16M4 14h10M4 18h7" />
  </svg>
);

export const ChevronIcon = (p: IconProps) => (
  <svg {...base(p)} strokeWidth={2}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

// --- object glyphs -----------------------------------------------------------

const PersonGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="7.5" r="3.25" />
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
  </svg>
);

const ShoeGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 15.5c0-1 .5-1.5 1.5-1.5h3l3-4 2 1.5c1 .7 2.3 1 3.5 1.2 2 .4 4 1.3 4 3.3V17H3.5z" />
    <path d="M11 10v4.5" />
  </svg>
);

const GlassesGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="7" cy="13" r="3.25" />
    <circle cx="17" cy="13" r="3.25" />
    <path d="M10.25 13h3.5M3.75 12 5 8h2M20.25 12 19 8h-2" />
  </svg>
);

const TreeGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5 6.5 11h2.5l-3 4.5h5v4h2v-4h5l-3-4.5h2.5z" />
  </svg>
);

const PlantGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20v-7" />
    <path d="M12 13c0-4-2.5-6.5-6.5-6.5C5.5 10.5 8 13 12 13z" />
    <path d="M12 11c0-3.5 2-5.5 5.5-5.5C17.5 9 15.5 11 12 11z" />
    <path d="M8 20h8" />
  </svg>
);

const WatchGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 9.75V12l1.5 1M9.5 7.5 10 3.5h4l.5 4M9.5 16.5l.5 4h4l.5-4" />
  </svg>
);

const CarGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 13.5 5.8 8.6A2 2 0 0 1 7.7 7.3h8.6a2 2 0 0 1 1.9 1.3L20 13.5v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V17h-9v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M4 13.5h16M7.5 15.25h.01M16.5 15.25h.01" strokeWidth={2.2} />
  </svg>
);

const AnimalGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 6.5 6.5 3.5 4 8.5v3a8 8 0 0 0 16 0v-3l-2.5-5L16 6.5a8 8 0 0 0-8 0z" />
    <path d="M9.5 12.5h.01M14.5 12.5h.01" strokeWidth={2.4} />
    <path d="M10.5 16.5c.5.7 2.5.7 3 0" />
  </svg>
);

const BuildingGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 20.5v-14l7-3v17M11.5 9.5l8 2.5v8.5M4.5 20.5h15" />
    <path d="M7.5 10h1M7.5 13.5h1M7.5 17h1M15 14h1M15 17.5h1" strokeWidth={2} />
  </svg>
);

const ChairGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4.5h8v7H7zM5.5 11.5h13v3h-13zM7 14.5v6M17 14.5v6" />
  </svg>
);

const DeviceGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="5" width="16" height="11" rx="2" />
    <path d="M2.5 19h19" />
  </svg>
);

const CloudGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.3A3.4 3.4 0 0 1 17 18z" />
  </svg>
);

const TagGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 12.4V5.5a2 2 0 0 1 2-2h6.9a2 2 0 0 1 1.4.6l6.7 6.7a2 2 0 0 1 0 2.8l-6.9 6.9a2 2 0 0 1-2.8 0l-6.7-6.7a2 2 0 0 1-.6-1.4z" />
    <path d="M8 8h.01" strokeWidth={2.6} />
  </svg>
);

const GLYPHS: Array<[RegExp, (p: IconProps) => ReactElement]> = [
  [/\b(person|people|man|woman|child|boy|girl|baby|human)\b/, PersonGlyph],
  [/\b(shoe|sneaker|boot|sandal|footwear|slipper)s?\b/, ShoeGlyph],
  [/\b(glasses|sunglasses|spectacles|eyeglasses)\b/, GlassesGlyph],
  [/\b(tree|palm|pine|forest)s?\b/, TreeGlyph],
  [/\b(plant|flower|bush|shrub|grass|leaf|leaves|hedge|garden)s?\b/, PlantGlyph],
  [/\b(watch|wristwatch|clock)\b/, WatchGlyph],
  [/\b(car|truck|bus|van|taxi|vehicle|motorcycle|bicycle|bike|scooter)s?\b/, CarGlyph],
  [/\b(dog|cat|bird|horse|cow|sheep|animal|puppy|kitten)s?\b/, AnimalGlyph],
  [/\b(building|house|skyscraper|tower|wall|window|door|billboard|bridge)s?\b/, BuildingGlyph],
  [/\b(chair|sofa|couch|bench|table|desk|bed|stool|furniture)s?\b/, ChairGlyph],
  [/\b(laptop|computer|phone|screen|monitor|tv|television|tablet|camera)s?\b/, DeviceGlyph],
  [/\b(cloud|sky|mountain|hill)s?\b/, CloudGlyph],
];

/** Picks a glyph for a detected object name; falls back to a neutral tag. */
export function ObjectGlyph({ name, ...props }: IconProps & { name: string }) {
  const lower = name.toLowerCase();
  const match = GLYPHS.find(([pattern]) => pattern.test(lower));
  const Glyph = match ? match[1] : TagGlyph;
  return <Glyph {...props} />;
}
