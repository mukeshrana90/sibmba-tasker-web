/* Create (or reset with --reset) the SimbaTaskerFlowDemo database used for the client flow screenshots.
 * Copies only reference data (equipment taxonomy, service / corporate categories, FAQs) from the dev DB and
 * adds one demo admin. Never writes to the dev DB.   node seed-demo-db.js [--reset] | --drop */
const path = require("path");
const BACKEND = path.resolve(__dirname, "../../../../sibmba-tasker-backend");
const mongoose = require(path.join(BACKEND, "node_modules/mongoose"));
const SRC = "SimbaTasker";
const DEMO = "SimbaTaskerFlowDemo";
const COPY = ["logistics_equipment_taxonomy", "logistics_categories", "serviceCategories", "serviceSubCategories", "corporatecategories", "Faqs", "Tutorial_material", "communities"];

(async () => {
  const conn = await mongoose.createConnection(`mongodb://localhost:27017/${DEMO}`).asPromise();
  const demo = conn.db;
  const src = conn.client.db(SRC);
  if (process.argv.includes("--drop")) { await demo.dropDatabase(); console.log(`dropped ${DEMO}`); return conn.close(); }
  if (process.argv.includes("--reset")) await demo.dropDatabase();
  for (const c of COPY) {
    if (await demo.collection(c).estimatedDocumentCount()) continue;
    const docs = await src.collection(c).find({}).toArray();
    if (docs.length) await demo.collection(c).insertMany(docs);
    console.log(`copied ${c}: ${docs.length}`);
  }
  if (!(await demo.collection("admins").countDocuments())) {
    await demo.collection("admins").insertOne({ full_name: "Simba Admin", email: "admin@e2e.example.com", password: "x-demo-not-used", role: 1, createdAt: new Date(), updatedAt: new Date() });
    console.log("demo admin created");
  }
  await conn.close();
})();
