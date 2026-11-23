// Picks the page language from ?lang= and wires up the language dropdown.
//
// Only codes offered in the dropdown are accepted (in any case, e.g. ?lang=EN),
// otherwise English, since Chroniko throws on a language it doesn't know.
// Returns the language code to pass to Chroniko.
export function initLanguage(select) {
  const url = new URL(location.href);
  const requested = url.searchParams.get('lang');
  const language = [...select.options].map((o) => o.value)
    .find((code) => code.toLowerCase() === requested?.toLowerCase()) ?? 'en';

  if (requested !== null && requested !== language) {
    // correct the address bar so the bad value isn't passed on in shared links
    if (language === 'en' && requested.toLowerCase() !== 'en') url.searchParams.delete('lang');
    else url.searchParams.set('lang', language);
    history.replaceState(history.state, '', url);
  }

  // switching reloads the page in the new language
  select.value = language;
  select.addEventListener('change', () => {
    const next = new URL(location.href);
    next.searchParams.set('lang', select.value);
    location.assign(next);
  });

  return language;
}
