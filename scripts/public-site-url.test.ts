import assert from "node:assert/strict";
import { getShareableSiteUrl } from "../lib/utils";

const publicHeaders = new Headers({
  "x-forwarded-host": "live-daawa.example",
  "x-forwarded-proto": "https",
});

const localHeaders = new Headers({
  host: "localhost:3000",
});

const railwayHeaders = new Headers({
  "x-forwarded-host": "daawa-production.up.railway.app",
  "x-forwarded-proto": "https",
});

const railwayInternalHeaders = new Headers({
  "x-forwarded-host": "web.railway.internal",
  "x-forwarded-proto": "https",
});

const railwayPlaceholderHeaders = new Headers({
  "x-forwarded-host": "${{RAILWAY_PUBLIC_DOMAIN}}",
  "x-forwarded-proto": "https",
});

assert.equal(getShareableSiteUrl(publicHeaders), "https://live-daawa.example");
assert.equal(getShareableSiteUrl(railwayHeaders), "https://daawa-production.up.railway.app");
assert.equal(getShareableSiteUrl(localHeaders, "https://daawa.up.railway.app"), "https://daawa.up.railway.app");

const previousPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const previousAppUrl = process.env.APP_URL;

process.env.NEXT_PUBLIC_SITE_URL = "https://web.railway.internal";
process.env.APP_URL = "https://${{RAILWAY_PUBLIC_DOMAIN}}";

assert.equal(getShareableSiteUrl(railwayInternalHeaders, "https://daawa.up.railway.app"), "https://daawa.up.railway.app");
assert.equal(getShareableSiteUrl(railwayPlaceholderHeaders, "https://daawa.up.railway.app"), "https://daawa.up.railway.app");
assert.equal(getShareableSiteUrl(undefined, "https://daawa.up.railway.app"), "https://daawa.up.railway.app");

if (previousPublicSiteUrl === undefined) {
  delete process.env.NEXT_PUBLIC_SITE_URL;
} else {
  process.env.NEXT_PUBLIC_SITE_URL = previousPublicSiteUrl;
}

if (previousAppUrl === undefined) {
  delete process.env.APP_URL;
} else {
  process.env.APP_URL = previousAppUrl;
}

console.log("public-site-url tests passed");
