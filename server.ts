import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("healthcare.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    blood_type TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    symptoms TEXT,
    diagnosis TEXT,
    prediction_score REAL,
    recovery_days INTEGER,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
`);

// Seed some data if empty
const patientCount = db.prepare("SELECT COUNT(*) as count FROM patients").get() as { count: number };
if (patientCount.count === 0) {
  const insertPatient = db.prepare("INSERT INTO patients (name, age, gender, blood_type) VALUES (?, ?, ?, ?)");
  insertPatient.run("John Doe", 45, "Male", "A+");
  insertPatient.run("Jane Smith", 32, "Female", "O-");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/patients", (req, res) => {
    const patients = db.prepare("SELECT * FROM patients").all();
    res.json(patients);
  });

  app.post("/api/patients", (req, res) => {
    const { name, age, gender, blood_type } = req.body;
    if (!name || !age || !gender || !blood_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const info = db.prepare(
      "INSERT INTO patients (name, age, gender, blood_type) VALUES (?, ?, ?, ?)"
    ).run(name, age, gender, blood_type);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/reports/:patientId", (req, res) => {
    const reports = db.prepare("SELECT * FROM reports WHERE patient_id = ? ORDER BY report_date DESC").all(req.params.patientId);
    res.json(reports);
  });

  app.post("/api/reports", (req, res) => {
    const { patientId, symptoms, diagnosis, predictionScore, recoveryDays } = req.body;
    const info = db.prepare(
      "INSERT INTO reports (patient_id, symptoms, diagnosis, prediction_score, recovery_days) VALUES (?, ?, ?, ?, ?)"
    ).run(patientId, symptoms, diagnosis, predictionScore, recoveryDays);
    res.json({ id: info.lastInsertRowid });
  });

  // Analytics endpoint (Mocking regression data for charts)
  app.get("/api/analytics/trends", (req, res) => {
    // Return some mock regression trend data
    const data = [
      { month: 'Jan', actual: 400, predicted: 420 },
      { month: 'Feb', actual: 300, predicted: 310 },
      { month: 'Mar', actual: 600, predicted: 580 },
      { month: 'Apr', actual: 800, predicted: 810 },
      { month: 'May', actual: 500, predicted: 520 },
      { month: 'Jun', actual: 900, predicted: 880 },
    ];
    res.json(data);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
