// ======================================================
// ✅ BeyondCare — Full Working Server
// ======================================================

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const multer = require("multer");

// Load .env
dotenv.config();

// Models
const User = require("./models/User");
const History = require("./models/History");
const Report = require("./models/Report");

// App
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// ✅ MongoDB
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ==========================================
// ✅ Gemini Helper
// ==========================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5";
const GEMINI_ENDPOINT_TEMPLATE =
  process.env.GEMINI_ENDPOINT ||
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateText";

async function callGemini(prompt, maxTokens = 400) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key not set");

  const endpoint =
    GEMINI_ENDPOINT_TEMPLATE.replace("{model}", GEMINI_MODEL) +
    `?key=${GEMINI_API_KEY}`;

  const body = { prompt, maxTokens };

  const resp = await axios.post(endpoint, body, { timeout: 20000 });
  const data = resp.data;

  if (data?.candidates?.[0]?.content?.parts?.[0]?.text)
    return data.candidates[0].content.parts[0].text;

  if (data?.choices?.[0]?.text) return data.choices[0].text;

  if (typeof data === "string") return data;

  return JSON.stringify(data);
}

// ==========================================
// ✅ Local fallback helpers
// ==========================================
function localSymptomPredict(s) {
  const str = s.toLowerCase();
  if (str.includes("fever") && str.includes("cough"))
    return "Flu or cold — rest, hydrate.";
  if (str.includes("chest") && str.includes("pain"))
    return "Possible cardiac issue — urgent attention.";
  if (str.includes("vomit") || str.includes("diarrhea"))
    return "Possible food poisoning — ORS.";
  return "No confident match; consult a doctor.";
}

function localBmiAdvice(weight, height) {
  const h = height / 100;
  const bmi = +(weight / (h * h)).toFixed(1);
  if (bmi < 18.5) return { bmi, advice: "Underweight — increase calories." };
  if (bmi < 25) return { bmi, advice: "Normal — maintain your routine." };
  if (bmi < 30) return { bmi, advice: "Overweight — improve diet & exercise." };
  return { bmi, advice: "Obese — medical guidance recommended." };
}

// ==========================================
// ✅ Auth Middleware
// ==========================================
function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ message: "No token" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ======================================================
// ✅ Auth Routes (Login / Register)
// ======================================================

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed });

    res.json({ message: "Registration successful" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "6h",
    });

    res.json({ token });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ======================================================
// ✅ AI Chatbot
// ======================================================
app.post("/api/ask", authMiddleware, async (req, res) => {
  const { prompt } = req.body;

  try {
    const ai = await callGemini(prompt);
    await History.create({
      user: req.userId,
      type: "chat",
      input: prompt,
      response: ai,
    });
    res.json({ source: "gemini", answer: ai });
  } catch {
    const fallback = localSymptomPredict(prompt);
    res.json({ source: "local", answer: fallback });
  }
});

// ======================================================
// ✅ Symptoms AI
// ======================================================
app.post("/api/symptoms", authMiddleware, async (req, res) => {
  const { symptoms } = req.body;

  const prompt =
    `User symptoms: ${symptoms}\nGive likely causes, urgency level, and advice.`;

  try {
    const ai = await callGemini(prompt);
    await History.create({
      user: req.userId,
      type: "symptoms",
      input: symptoms,
      response: ai,
    });
    res.json({ source: "gemini", answer: ai });
  } catch {
    const fallback = localSymptomPredict(symptoms);
    res.json({ source: "local", answer: fallback });
  }
});

// ======================================================
// ✅ BMI AI
// ======================================================
app.post("/api/bmi", authMiddleware, async (req, res) => {
  let { weight, height, age, gender, bmi } = req.body;

  if (!bmi && weight && height)
    bmi = +(weight / ((height / 100) ** 2)).toFixed(1);

  const prompt =
    `BMI: ${bmi}, Age: ${age}, Gender: ${gender}.\nProvide recommended diet, exercise and risks.`;

  try {
    const ai = await callGemini(prompt);
    await History.create({
      user: req.userId,
      type: "bmi",
      input: JSON.stringify(req.body),
      response: ai,
    });
    res.json({ source: "gemini", answer: ai });
  } catch {
    const local = localBmiAdvice(weight, height);
    res.json({
      source: "local",
      answer: `BMI ${local.bmi} — ${local.advice}`,
    });
  }
});

// ======================================================
// ✅ Reports — Upload + AI Analysis
// ======================================================

// Folder for uploaded reports
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Extract text
async function extractTextFromFile(file) {
  if (file.mimetype === "application/pdf") {
    const data = await pdfParse(fs.readFileSync(file.path));
    return data.text;
  }
  return fs.readFileSync(file.path, "utf8");
}

function buildReportPrompt(text) {
  return `
Summarize this medical report and list:
- Key findings
- Possible concerns
- Next steps

Report text:
${text.slice(0, 15000)}
  `;
}

// Upload + analyze
app.post("/api/reports", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const text = await extractTextFromFile(req.file);

    let aiSummary = "";
    try {
      aiSummary = await callGemini(buildReportPrompt(text), 600);
    } catch {
      aiSummary = "AI unavailable. Raw text:\n" + text.slice(0, 1000);
    }

    const report = await Report.create({
      user: req.userId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mime: req.file.mimetype,
      size: req.file.size,
      summary: aiSummary,
    });

    res.json({ report, message: "Analysis complete" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// List
app.get("/api/reports", authMiddleware, async (req, res) => {
  const docs = await Report.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json({ reports: docs });
});

// Download
app.get("/api/reports/:id", authMiddleware, async (req, res) => {
  const doc = await Report.findOne({
    _id: req.params.id,
    user: req.userId,
  });

  const filePath = path.join(UPLOAD_DIR, doc.filename);
  res.sendFile(filePath);
});

// Delete
app.delete("/api/reports/:id", authMiddleware, async (req, res) => {
  const doc = await Report.findOne({
    _id: req.params.id,
    user: req.userId,
  });

  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, doc.filename));
  } catch {}

  await doc.deleteOne();
  res.json({ message: "Deleted" });
});

// ======================================================
// ✅ History
// ======================================================
app.get("/api/history", authMiddleware, async (req, res) => {
  const h = await History.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ history: h });
});

// ======================================================
// ✅ Page Routes
// ======================================================
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/home", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "home.html"))
);

app.get("/bmi", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "bmi.html"))
);

app.get("/symptoms", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "symptoms.html"))
);

app.get("/chatbot", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "chatbot.html"))
);

app.get("/reports", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "reports.html"))
);

// ======================================================
// ✅ Server Start
// ======================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 BeyondCare server running on port ${PORT}`)
);
