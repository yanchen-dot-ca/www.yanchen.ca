# UDID checker — how it works

`www.yanchen.ca/udid` mirrors udid.tech:

1. The page's **Get My UDID** button downloads the profile from
   `https://udid.yanchen.ca/profile.mobileconfig`. The file itself
   lives in this repo (`udid.mobileconfig`, static on GitHub Pages),
   but GitHub Pages serves it as `application/octet-stream`, and
   Safari only hands a download to the profile installer when the
   MIME type is `application/x-apple-aspen-config` — so the Worker
   re-serves the same bytes with the correct headers. It is an
   Apple *Profile Service*
   profile: when the user installs it, iOS POSTs the device's UDID,
   product, iOS version and serial to the profile's callback URL.
2. The callback is `https://udid.yanchen.ca/enroll` — GitHub Pages
   cannot receive POSTs, so a Cloudflare Worker (this folder's
   `worker.js`) handles it. It parses the UDID out of the posted
   plist and 302-redirects Safari to
   `https://www.yanchen.ca/udid#udid=…`, where the page displays it.
   The fragment is never sent to any server and nothing is stored.
3. The user removes the temporary profile afterwards
   (Settings → General → VPN & Device Management).

## One-time setup (Cloudflare dashboard, ~3 minutes)

The `yanchen.ca` zone is already on Cloudflare, so no DNS changes
are needed beyond what the dashboard creates automatically:

1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Worker**.
   Name it `udid` and deploy the placeholder.
2. **Edit code**, replace everything with `worker.js` from this
   folder, **Deploy**.
3. In the worker: **Settings → Domains & Routes → Add → Custom
   Domain** → `udid.yanchen.ca`.
4. On an iPhone, open https://www.yanchen.ca/udid in Safari and run
   through the flow once to verify.

## Notes

- The profile is unsigned, so iOS labels it "Not Verified" during
  install. That is normal for this kind of tool; signing would need
  a certificate whose private key we control for this purpose.
- The Worker only accepts POST /enroll and GET /; everything else
  is a 404. It keeps no state and writes no logs of its own.
