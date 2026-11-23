// Earthquakes from the USGS GeoJSON summary feeds, as Chroniko events.
// https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
//
// The feeds are refreshed every minute and can be read from any site (CORS).
// The past hour's feed is small, so it's polled every minute for new and revised
// earthquakes. The past day's feed is read at the start, every 10 minutes and when
// the page is shown again, to catch up on anything missed.

const FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const POLL_MS = 60_000;
const FULL_SYNC_EVERY = 10; // polls

// Magnitude bands, used as Chroniko categories (and keys for colors and labels).
export const BANDS = [
  { min: 6, category: 'strong (M6+)' },
  { min: 5, category: 'moderate (M5–5.9)' },
  { min: 4, category: 'light (M4–4.9)' },
  { min: 2, category: 'minor (M2–3.9)' },
  { min: -Infinity, category: 'micro (below M2)' },
];

// USGS abbreviates some places, e.g. "10 km NW of The Geysers, CA".
const REGION_NAMES = { CA: 'California', NV: 'Nevada', MX: 'Mexico' };

// The region a place is in, used as the event's tag: the part after the last comma,
// e.g. "Alaska" from "7 km SSW of Elmendorf Air Force Base, Alaska", or the place
// without its direction, e.g. "Fiji Islands" from "south of the Fiji Islands".
function regionOf(place) {
  if (!place) return null;
  let region = place.includes(', ') ? place.slice(place.lastIndexOf(', ') + 2) : place;
  region = region
    .replace(/^(?:(?:north|south|east|west)(?:-?(?:north|south|east|west))?(?:ern)?\s+of\s+)(?:the\s+)?/i, '')
    .replace(/\s+region$/i, '')
    .trim();
  return REGION_NAMES[region] ?? region;
}

const fixed = (n, digits) => (n == null ? null : Number(n).toFixed(digits));

// One GeoJSON feature as a Chroniko event, or null if it isn't a usable earthquake.
export function toEvent(feature) {
  const p = feature.properties ?? {};
  if (p.type !== 'earthquake' || typeof p.time !== 'number' || !feature.id) return null;
  const mag = typeof p.mag === 'number' ? p.mag : null;
  const depth = feature.geometry?.coordinates?.[2];
  const region = regionOf(p.place);

  const details = [
    mag != null ? `Magnitude ${fixed(mag, 1)}${p.magType ? ` (${p.magType})` : ''}.` : 'Magnitude not yet known.',
    depth != null ? `Depth ${fixed(depth, 1)} km.` : null,
    p.status === 'reviewed' ? 'Reviewed by a seismologist.' : 'Automatic location, not yet reviewed by a seismologist.',
    p.felt ? `Felt by ${p.felt} ${p.felt === 1 ? 'person' : 'people'} who reported it to USGS.` : null,
    p.tsunami ? 'USGS links tsunami information for this earthquake: check the official warning centers.' : null,
    p.alert ? `PAGER alert level: ${p.alert}.` : null,
  ];

  return {
    id: feature.id,
    title: `M ${mag != null ? fixed(mag, 1) : '?'} ${p.place ?? 'Unknown location'}`,
    // to the second: the feed has milliseconds, which would show in the story
    start: new Date(p.time).toISOString().slice(0, 19) + 'Z',
    category: BANDS.find((b) => (mag ?? -Infinity) >= b.min).category,
    ...(region && { tags: [region] }),
    description: details.filter(Boolean).join(' '),
    url: p.url,
  };
}

async function fetchFeed(name) {
  const response = await fetch(`${FEED}/${name}.geojson`);
  if (!response.ok) throw new Error(`USGS feed ${name}: HTTP ${response.status}`);
  return response.json();
}

// The earthquakes of the past 24 hours, to build the timeline with.
// Returns { events, source }: pass both to Chroniko. Never throws: if USGS can't be
// reached, `events` is empty and the source keeps trying, reporting through onStatus.
export async function loadEarthquakes({ onStatus = () => {} } = {}) {
  const known = new Map(); // id -> { time, updated }
  const remember = (feature) => known.set(feature.id, { time: feature.properties.time, updated: feature.properties.updated });

  const events = [];
  let needFullSync = false;
  try {
    const day = await fetchFeed('all_day');
    for (const feature of day.features) {
      const event = toEvent(feature);
      if (event) { events.push(event); remember(feature); }
    }
    onStatus({ ok: true, count: known.size, at: new Date(day.metadata.generated) });
  } catch (error) {
    needFullSync = true; // the source fetches the whole day as soon as it can
    onStatus({ ok: false, error });
  }

  // Chroniko's `source`: keeps the timeline in step with the feeds.
  const source = (api) => {
    let polls = 0;
    let busy = false;

    // Applies one feed covering the last `window` ms: adds, revises and removes.
    const apply = (feed, window) => {
      const seen = new Set();
      for (const feature of feed.features) {
        const event = toEvent(feature);
        if (!event) continue;
        seen.add(event.id);
        const had = known.get(event.id);
        try {
          if (!had) api.add(event);
          else if (feature.properties.updated > had.updated) {
            const { id, ...patch } = event;
            api.update(id, { tags: undefined, ...patch }); // a revised place may drop the tag
          }
          remember(feature);
        } catch {
          // dropped by `retain` or `maxEvents` meanwhile, or rejected: forget it
          known.delete(event.id);
        }
      }
      // An earthquake well inside the feed's window but missing from it was deleted,
      // or now has another id (USGS can change which network's id it uses).
      const from = feed.metadata.generated - window + 5 * 60_000;
      for (const [id, { time }] of known) {
        if (time < feed.metadata.generated - DAY - HOUR) known.delete(id); // long gone
        else if (time >= from && !seen.has(id)) { api.remove(id); known.delete(id); }
      }
    };

    const poll = async (full) => {
      if (busy) return;
      busy = true;
      full ||= needFullSync;
      try {
        const feed = await fetchFeed(full ? 'all_day' : 'all_hour');
        apply(feed, full ? DAY : HOUR);
        if (full) needFullSync = false;
        onStatus({ ok: true, count: known.size, at: new Date(feed.metadata.generated) });
      } catch (error) {
        onStatus({ ok: false, error });
      } finally {
        busy = false;
      }
    };

    const timer = setInterval(() => {
      if (document.hidden) return; // nothing to see; catch up when shown
      polls += 1;
      poll(polls % FULL_SYNC_EVERY === 0);
    }, POLL_MS);
    const onVisible = () => { if (!document.hidden) poll(true); };
    document.addEventListener('visibilitychange', onVisible);
    if (needFullSync) poll(true); // the first fetch failed: try again straight away

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  };

  return { events, source };
}
