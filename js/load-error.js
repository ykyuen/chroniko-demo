// Shows a message instead of a blank space if the timeline fails to load.
//
// Load this as a regular <script> before the page's module script, and give the
// module script onerror="showTimelineError()". That covers:
// - the library or a data file can't be fetched (the module script's error event)
// - loading the data or building the timeline throws (the window's error event)
// A module can't do this itself: when one of its imports fails, none of its code runs.

function showTimelineError() {
  // Already built, so a later error isn't a load failure. Until the page sets it,
  // window.timeline is the <div id="timeline"> itself (browsers expose ids as globals).
  if (window.timeline && !(window.timeline instanceof Element)) return;
  const el = document.querySelector('#timeline');
  if (!el || el.querySelector('.load-error')) return;
  el.innerHTML = '<div class="load-error" role="alert"><strong>The timeline couldn’t load.</strong> '
    + 'Please check your connection and <a href="">reload the page</a>. '
    + 'The full list of events is still available below.</div>';
}

window.addEventListener('error', showTimelineError);
