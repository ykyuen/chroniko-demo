# Chroniko Demo

Example timelines for [Chroniko](https://github.com/ykyuen/chroniko), a JavaScript library for rendering events on a single zoomable time axis. The site is live at **https://chroniko.ykyuen.info/**.

It's a plain static site: HTML, CSS and JavaScript, with Chroniko loaded from jsDelivr. There's no build step and nothing to install.

## Demos

| Demo | What it shows |
| --- | --- |
| [Philosophers in history](https://chroniko.ykyuen.info/philosophers-in-history/) | Eastern and western philosophers alongside Chinese dynasties and western historical events. The basics: categories, the story view, translated category labels and shareable links. |
| [Rationalism vs empiricism](https://chroniko.ykyuen.info/rationalism-vs-empiricism/) | The continental rationalists and the British empiricists. Event tags with translated labels, and custom category colors. |
| [Apollo 11](https://chroniko.ykyuen.info/apollo-11/) | The Moon landing mission, from launch to splashdown. The clock time scale (times to the minute and second, in UTC) and a time zone menu with Florida, Houston and the viewer's own time. |

Both demos have a language dropdown (also `?lang=<code>`) with Chroniko's 13 built-in languages. Event text is available in English and Traditional Chinese (`zh-Hant`, also used for `zh-Hans` and `yue`); the other languages translate the timeline's interface only. Add `?story=below` to show the story under the timeline instead of beside it.

## Running locally

Serve the repository root with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/.

Opening the HTML files directly from disk (`file://`) doesn't work: browsers block JavaScript modules there, and the pages use root paths such as `/css/demo.css`. For the same reason the site must be served from the root of its domain, not from a subfolder.

## Project structure

```
index.html                    Home page, listing the demos
<demo>/index.html             A demo page
<demo>/data/en/*.js           Its events in English
<demo>/data/zh-Hant/*.js      Its events in Traditional Chinese (same ids)
css/demo.css                  Styles shared by every page
js/language.js                ?lang= handling and the language dropdown
js/load-error.js              Message shown if a timeline fails to load
scripts/build-event-lists.mjs Writes the static event list into each demo page
images/                       Favicons, logo and the social preview image
favicon.ico, robots.txt, sitemap.xml
```

Each data file exports an array of [Chroniko events](https://github.com/ykyuen/chroniko#readme) (`id`, `title`, `start`, `end`, `category`, `tags`, `description`, `url`). The English and Chinese files of a demo should list the same events with the same ids, so a shared link selects the same events in either language.

## Updating demo data

Each demo page also contains a static list of all its events (under the timeline, collapsed), so search engines that don't run JavaScript can still index the content. The list is generated from the English data in `<demo>/data/en/`. After changing any data, regenerate it with:

```sh
node scripts/build-event-lists.mjs
```

It only rewrites the part of each page between the `event-list:start` and `event-list:end` comments, and leaves a page untouched if nothing changed.

When you change a page, also update its `<lastmod>` date in `sitemap.xml`.

## Adding a demo

1. Create a folder named after the demo, e.g. `my-demo/`, with its data in `my-demo/data/en/` and `my-demo/data/zh-Hant/`.
2. Copy an existing demo's `index.html` into it, then update:
   - the `<title>`, description, keywords, canonical URL, Open Graph and Twitter tags;
   - the JSON-LD block (page URL, name, description, topics, breadcrumb);
   - the `<h1>` and intro text;
   - the data imports and the `new Chroniko(...)` options in the module script;
   - the category and tag labels for Chinese.

   Keep the shared parts as they are: the `/css/demo.css` and `/js/load-error.js` tags, `onerror="showTimelineError()"` on the module script, `initLanguage` and the `#lang` dropdown with its note, and `<div id="timeline"></div>`.
3. Add the folder name to the list at the bottom of `scripts/build-event-lists.mjs`, and run it.
4. Link the demo from the home page (`index.html`), both in the list of demos and in the JSON-LD `hasPart`.
5. Add its URL to `sitemap.xml`.

## Upgrading Chroniko

The version is pinned in each demo page, in the stylesheet link and the module script's import (`chroniko@x.y.z`). Change both on every demo page, and read the [changelog](https://github.com/ykyuen/chroniko/blob/master/CHANGELOG.md) for anything that throws now and didn't before, such as stricter checks on event data.
