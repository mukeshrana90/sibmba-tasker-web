/**
 * Run: node scripts/landingPlaces-smoke.js
 * Loads REACT_APP_GOOGLE_MAPS_API_KEY from .env.development when present.
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  text.split("\n").forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

loadEnvFile(path.join(__dirname, "../.env.development"));
loadEnvFile(path.join(__dirname, "../.env"));

// Babel-free smoke: duplicate minimal REST call for CI/node
async function fetchGooglePredictionsREST(input, apiKey) {
  const query = String(input || "").trim();
  if (query.length < 2 || !apiKey) return { status: "NO_KEY", predictions: [] };
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    query
  )}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    status: data.status || "UNKNOWN",
    predictions: Array.isArray(data.predictions) ? data.predictions : [],
    error: data.error_message,
  };
}

async function fetchPhotonWorldwide(input) {
  const query = String(input || "").trim();
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    query
  )}&limit=8&lang=en`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.features || []).map((f) => {
    const props = f.properties || {};
    return {
      description: [props.name, props.country].filter(Boolean).join(", "),
    };
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  let passed = 0;
  const total = 2;

  const photon = await fetchPhotonWorldwide("chan");
  assert(photon.length > 0, "Photon worldwide should return chan results");
  assert(
    photon.some((p) => !/zimbabwe/i.test(p.description)),
    "Photon worldwide should include non-Zimbabwe"
  );
  console.log("PASS worldwide Photon");
  passed += 1;

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const google = await fetchGooglePredictionsREST("chan", apiKey);
  if (google.status === "OK") {
    assert(google.predictions.length > 0, "Google should return predictions");
    assert(
      google.predictions.some((p) => !/zimbabwe/i.test(p.description)),
      "Google should return global results for chan"
    );
    console.log(
      "PASS Google autocomplete",
      google.predictions.slice(0, 2).map((p) => p.description).join(", ")
    );
    passed += 1;
  } else {
    console.log("FAIL Google:", google.status, google.error || "");
  }

  console.log(`\n${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
