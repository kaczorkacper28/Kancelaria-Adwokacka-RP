"use strict";
const express = require("express");
const session = require("express-session");
const fs = require("node:fs");
const path = require("node:path");
const app = express();
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { cases: [], staff: [], documents: [], decisions: [] }; }
}
function writeDb(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: "kancelaria.sid",
  secret: process.env.SESSION_SECRET || "development-secret-change-me",
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 *  60 * 60 * 1000 }
}));
app.use("/public", express.static(path.join(__dirname, "public")));
function auth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Brak dostępu do panelu." });
}
app.get("/", (req, res) => res.redirect("/login"));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/app", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.post("/api/login", (req, res) => {
  const user = String(req.body.username || "");
  const pass = String(req.body.password || "");
  if (user !== (process.env.PANEL_USER || "prezes") || pass !== (process.env.PANEL_PASSWORD || "zmien-to-na-silne-haslo")) {
    return res.status(401).json({ error: "Nieprawidłowy login lub hasło." });
  }
  req.session.user = { username: user };
  res.json({ ok: true });
});
app.post("/api/logout", auth, (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/data", auth, (req, res) => res.json(readDb()));
app.post("/api/cases", auth, (req, res) => {
  const db = readDb();
  const item = {
    id: "KA-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-6),
    title: String(req.body.title || "").trim().slice(0, 120),
    client: String(req.body.client || "").trim().slice(0, 100),
    type: String(req.body.type || "Inna").slice(0, 60),
    lawyer: String(req.body.lawyer || "").trim().slice(0, 100),
    status: "Nowa", notes: String(req.body.notes || "").trim().slice(0, 2000),
    createdAt: new Date().toISOString()
  };
  if (!item.title) return res.status(400).json({ error: "Podaj nazwę sprawy." });
  db.cases.unshift(item); writeDb(db); res.status(201).json(item);
});
app.patch("/api/cases/:id", auth, (req, res) => {
  const db = readDb(); const item = db.cases.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Nie znaleziono sprawy." });
  for (const key of ["status", "lawyer", "notes"]) if (req.body[key] !== undefined) item[key] = String(req.body[key]).slice(0, key === "notes" ? 2000 : 1000);
  writeDb(db); res.json(item);
});
app.post("/api/staff", auth, (req, res) => {
  const db = readDb();
  const item = { id: "PR-" + Date.now().toString().slice(-7), name: String(req.body.name || "").trim().slice(0,100), role: String(req.body.role || "Adwokat").slice(0,80), discord: String(req.body.discord || "").slice(0,80), active: true, createdAt: new Date().toISOString() };
  if (!item.name) return res.status(400).json({ error: "Podaj imię i nazwisko lub nick." });
  db.staff.unshift(item); writeDb(db); res.status(201).json(item);
});
app.post("/api/documents", auth, (req, res) => {
  const db = readDb();
  const item = { id: "DOC-" + Date.now().toString().slice(-7), title: String(req.body.title || "Dokument RP").slice(0,120), kind: String(req.body.kind || "Pismo").slice(0,60), content: String(req.body.content || "").slice(0,10000), createdAt: new Date().toISOString() };
  if (!item.content.trim()) return res.status(400).json({ error: "Treść dokumentu jest pusta." });
  db.documents.unshift(item); writeDb(db); res.status(201).json(item);
});
app.post("/api/decisions", auth, (req, res) => {
  const db = readDb();
  const item = { id: "DEC-" + Date.now().toString().slice(-7), title: String(req.body.title || "Decyzja Prezesa").slice(0,120), content: String(req.body.content || "").slice(0,5000), createdAt: new Date().toISOString() };
  if (!item.content.trim()) return res.status(400).json({ error: "Treść decyzji jest pusta." });
  db.decisions.unshift(item); writeDb(db); res.status(201).json(item);
});
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log("Panel kancelarii działa na porcie " + port));
