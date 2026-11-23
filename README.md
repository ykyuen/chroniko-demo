# Demo of Chroniko

[Chroniko](https://github.com/ykyuen/chroniko) is a javascript library which is for rendering historical events on a single zoomable time axis.

View the [demos](https://chroniko.ykyuen.info/).

## Updating demo data

Each demo page also contains a static list of all its events (under the timeline, collapsed), so search engines that don't run JavaScript can still index the content. The list is generated from the English data in `<demo>/data/en/`. After changing any data, regenerate it with:

```sh
node scripts/build-event-lists.mjs
```
