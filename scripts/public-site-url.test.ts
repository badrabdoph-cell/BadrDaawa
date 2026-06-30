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

assert.equal(getShareableSiteUrl(publicHeaders), "https://live-daawa.example");
assert.equal(getShareableSiteUrl(railwayHeaders), "https://daawa-production.up.railway.app");
assert.equal(getShareableSiteUrl(localHeaders, "https://daawa.up.railway.app"), "https://daawa.up.railway.app");

console.log("public-site-url tests passed");
