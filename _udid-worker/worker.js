// UDID callback for https://www.yanchen.ca/udid
//
// The installable profile (udid.mobileconfig, served from GitHub Pages)
// tells the device to POST its attributes here when the user installs
// the profile. This Worker extracts the UDID and redirects Safari back
// to the result page. Nothing is stored or logged: the UDID travels
// back in the URL fragment (after #), which browsers never send to a
// server.
//
// Deploy: Cloudflare dashboard -> Workers & Pages -> Create Worker,
// paste this file, Deploy, then add the Custom Domain
// udid.yanchen.ca (Settings -> Domains & Routes). See README.md here.

const RESULT_PAGE = "https://www.yanchen.ca/udid";

function pick(body, key) {
  const m = body.match(
    new RegExp("<key>" + key + "</key>\\s*<string>([^<]*)</string>")
  );
  return m ? m[1].trim() : "";
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/enroll") {
      const body = await request.text();
      const udid = pick(body, "UDID");
      if (!udid) {
        return new Response("No UDID in request", { status: 400 });
      }
      const params = new URLSearchParams();
      params.set("udid", udid);
      for (const key of ["PRODUCT", "VERSION", "SERIAL"]) {
        const value = pick(body, key);
        if (value) params.set(key.toLowerCase(), value);
      }
      return Response.redirect(RESULT_PAGE + "#" + params.toString(), 302);
    }

    // The profile itself lives in the GitHub Pages repo as the single
    // source of truth, but GitHub Pages serves it as
    // application/octet-stream — and the aspen-config MIME type is
    // what tells Safari to hand the download to the profile
    // installer. Re-serve it here with the right headers.
    if (request.method === "GET" && url.pathname === "/profile.mobileconfig") {
      const res = await fetch("https://www.yanchen.ca/udid.mobileconfig");
      if (!res.ok) return new Response("Profile unavailable", { status: 502 });
      return new Response(await res.arrayBuffer(), {
        headers: {
          "content-type": "application/x-apple-aspen-config",
          "content-disposition": "attachment; filename=udid.mobileconfig",
          "cache-control": "no-store",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(
        "udid.yanchen.ca — UDID callback is running. " +
          "Open https://www.yanchen.ca/udid on your iPhone to use it.",
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
