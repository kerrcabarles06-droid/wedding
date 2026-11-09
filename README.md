# Hannah & Kerr — February 18, 2027

Production preparation of the supplied eleven-page invitation: the envelope plus ten invitation sections. The approved layout, invitation wording, illustrations, piano recording, opening video, and scroll animations are retained.

## Deploy from GitHub to Netlify

1. In Netlify, choose **Add new project → Import an existing project → GitHub**.
2. Authorize Netlify's GitHub app for **kerrcabarles06-droid/wedding**. Access to this repository is sufficient.
3. Select the `main` branch. Leave the build command empty; set the publish directory to `public` and the functions directory to `netlify/functions`. The committed `netlify.toml` supplies these settings. Leave the base directory empty.
4. Deploy. Netlify will publish static assets and the RSVP function. Subsequent pushes to `main` automatically deploy; Netlify handles GitHub integration without a GitHub Actions token or a Netlify token in source.
5. In the project's domain settings, optionally add your custom domain and follow Netlify's DNS/HTTPS instructions.

A plain static ZIP upload of `public/` does not include the RSVP server function. Use the GitHub import above for the complete site. Opening `index.html` directly is also insufficient to test RSVP.

## Google Apps Script RSVP configuration

The existing `/exec` URL is retained server-side in `netlify/functions/rsvp.mjs`. To use a different deployment, set `RSVP_ENDPOINT` in Netlify environment variables for the Functions scope and redeploy. Do not put Google credentials in the repository.

In Apps Script, the owner must verify:

- The web app has an active deployment, executes as the owner, and allows **Anyone**, including guests who are not signed into Google. Authorize the script's spreadsheet access when Google prompts the owner.
- `doPost(e)` parses `JSON.parse(e.postData.contents)` and saves `name`, `attendance` (`yes` or `no`), and `message` to the intended sheet. These are the original field names.
- After successfully writing the row, the script returns an explicit success response, for example:

```js
return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
  .setMimeType(ContentService.MimeType.JSON);
```

Do not return success before the row is saved. Existing `{status:'success'}`, `{success:true}`, `{ok:true}`, or plain `success` replies also work. Other responses are treated as unconfirmed so a Google error page cannot be mistaken for a saved RSVP. Update the existing web-app deployment after script changes; if its deployment ID changes, update `RSVP_ENDPOINT`.

The unauthenticated GET probe reached Google and returned `Script function not found: doGet`. A POST-only web app can work without `doGet`; that result does not confirm `doPost` behavior. The supplied ZIP contains no Apps Script source. No test guest was written to the live sheet. One end-to-end test is still required: submit a clearly named test RSVP from the Netlify URL and verify its row in the owner's sheet, then remove that test row. Test both attendance choices. If the page reports an unconfirmed result, check the sheet before retrying to avoid a duplicate.

## Changes and checks

- Fixed the Linux/Netlify case mismatch by renaming `wedding-piano.MP3` to `wedding-piano.mp3`; the recording's bytes are unchanged.
- Kept the fade beginning 3.5 seconds after **TAP TO OPEN**, including a fallback timer when video playback is unavailable. The existing overlapping fades reveal the Save-the-Date artwork.
- Moved MP4 metadata to the front for streaming, preserving its original audio/video streams.
- Converted PNG illustrations to lossless WebP at their original dimensions. Added image dimensions, asynchronous decoding, lazy loading below the first screen, and prioritized the Save-the-Date image. Audio loads on guest interaction; video preloads metadata.
- Retained the centered 480px design. Allowed narrow-screen bank details and schedule times to wrap; 16px RSVP fields prevent automatic input zoom on iOS. Existing safe-area offsets remain.
- Replaced the opaque `no-cors` RSVP request with a same-origin Netlify function. It forwards the original fields and checks the upstream response. RSVP error wording now explains that an unconfirmed response may already have arrived.
- Added media cache headers, basic response headers, focus states, and music state labels. Music starts from guest interaction, as mobile browsers require.

Run `npm test` with Node 22 or later. Tests use simulated DOM/media and mocked Google responses; they do not establish actual browser playback or a live sheet write. No dependencies or build step are needed.

Before sharing with guests, check the live URL on iPhone Safari and Android Chrome at narrow mobile widths: tap once, observe the fade at 3.5 seconds, pause/resume music, scroll all sections, open the map and FAQs, copy the account number, and complete the live RSVP test above. Also check a desktop browser and a slow connection.

Automated browser screenshots and layout/playback verification could not run because this environment did not provide the required `cua_repl.js` browser-control interface. Static paths, media decoding, lossless illustration equivalence, JavaScript syntax, and five automated behavior/server tests were checked separately.
