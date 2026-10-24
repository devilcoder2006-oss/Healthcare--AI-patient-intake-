/* MediKiosk — Emergency Assistance & Smart Hospital Finder (frontend-only, DEMO MODE) */
(() => {
  "use strict";

  /* ---------- CONFIG: swap these for real services later ---------- */
  const CONFIG = {
    emergencyNumber: "112",
    mapsDirectionsUrl: (dest, origin) =>
      "https://www.google.com/maps/dir/?api=1&destination=" + dest.lat + "," + dest.lng +
      (origin ? "&origin=" + origin.lat + "," + origin.lng : ""),
    maxFileBytes: 5 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
  };

  /* ---------- DEMO DATA (fictional; replace with a verified directory API) ---------- */
  const DEMO_PHONE = "+91 00000 00000 (demo number)";
  const HOSPITALS = [
    { id: "h1", name: "Demo Central Heart & Care Hospital", type: "Hospital", address: "Fictional Rd, Connaught Place area, New Delhi", lat: 28.628, lng: 77.219, hours: "Open 24 hours", emergency24: true,
      specialties: ["cardiac", "diabetes", "breathing"], services: ["Cardiologist", "ICU", "ECG", "Emergency department"], stock: { insulin: "verified", "nitroglycerin": "verified" }, verifiedAt: "2026-10-22 18:30" },
    { id: "h2", name: "Demo Riverside Multispeciality Hospital", type: "Hospital", address: "Fictional Marg, Civil Lines, Delhi", lat: 28.66, lng: 77.23, hours: "Open 24 hours", emergency24: true,
      specialties: ["diabetes", "breathing", "injury", "cardiac"], services: ["Endocrinologist", "Pulmonologist", "Trauma unit", "ICU", "Emergency department"], stock: { insulin: "unconfirmed", salbutamol: "verified" }, verifiedAt: "2026-10-20 09:10" },
    { id: "h3", name: "Demo Saket Women & Child Hospital", type: "Hospital", address: "Fictional Lane, Saket, New Delhi", lat: 28.525, lng: 77.21, hours: "Open 24 hours", emergency24: true,
      specialties: ["pregnancy"], services: ["Gynaecologist", "Labour room", "NICU", "Emergency department"], stock: { insulin: "unavailable" }, verifiedAt: "2026-10-21 12:00" },
    { id: "h4", name: "Demo Dwarka Trauma Centre", type: "Hospital", address: "Fictional Sector, Dwarka, New Delhi", lat: 28.592, lng: 77.046, hours: "Open 24 hours", emergency24: true,
      specialties: ["injury"], services: ["Orthopaedic surgeon", "Trauma unit", "X-ray", "Emergency department"], stock: {}, verifiedAt: "2026-10-18 15:45" },
    { id: "h5", name: "Demo Lajpat Pharmacy & Clinic", type: "Pharmacy", address: "Fictional Market, Lajpat Nagar, New Delhi", lat: 28.568, lng: 77.243, hours: "08:00–22:00", emergency24: false,
      specialties: ["diabetes"], services: ["Pharmacy", "Cold-chain storage (insulin)", "Basic clinic"], stock: { insulin: "verified" }, verifiedAt: "2026-10-23 08:15" },
    { id: "h6", name: "Demo Rohini Chest Institute", type: "Hospital", address: "Fictional Block, Rohini, Delhi", lat: 28.715, lng: 77.117, hours: "Open 24 hours", emergency24: true,
      specialties: ["breathing", "cardiac"], services: ["Pulmonologist", "Oxygen support", "Cardiologist", "ICU", "Emergency department"], stock: { salbutamol: "verified", insulin: "unconfirmed" }, verifiedAt: "2026-10-19 11:20" },
  ];

  const DEMO_AREAS = { "connaught place": [28.6315, 77.2167], delhi: [28.6139, 77.209], saket: [28.5245, 77.2066], dwarka: [28.5921, 77.046], rohini: [28.7041, 77.1025], "lajpat nagar": [28.5677, 77.2433] };
  const CRITICAL = /chest pain|can'?t breathe|cannot breathe|struggling to breathe|not breathing|unconscious|unresponsive|seizure|heavy bleeding|stroke|face droop|slurred|severe bleeding|choking|suicid|overdose/i;
  const CATEGORY_LABEL = { diabetes: "Diabetes", cardiac: "Cardiac", breathing: "Breathing", injury: "Injury", pregnancy: "Pregnancy", other: "General" };

  /* ---------- DOM helpers (textContent only: no innerHTML with user input) ---------- */
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const state = { origin: null, results: [], files: [], medicine: "", category: "", opener: null };

  /* ---------- LOCATION ---------- */
  function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject({ code: 0, message: "Geolocation is not supported in this browser." });
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, source: "gps" }),
        (e) => reject(e), { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  /* Demo-only lookup. Replace with a real geocoding provider. */
  function geocodeManual(text) {
    const q = text.trim().toLowerCase();
    const key = Object.keys(DEMO_AREAS).find((k) => q.includes(k));
    return key ? { lat: DEMO_AREAS[key][0], lng: DEMO_AREAS[key][1], source: "demo-area" } : null;
  }

  function calculateDistance(a, b) { // Haversine, km
    const r = (d) => (d * Math.PI) / 180, R = 6371;
    const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* ---------- MATCHING & RANKING (swap getHospitalData for a real API) ---------- */
  async function getHospitalData() { return HOSPITALS; }

  function stockFor(h, medicine) {
    if (!medicine) return null;
    const m = medicine.toLowerCase();
    const key = Object.keys(h.stock).find((k) => m.includes(k) || k.includes(m.split(" ")[0]));
    return key ? h.stock[key] : "unconfirmed";
  }

  async function findMatchingHospitals(req) {
    const data = await getHospitalData();
    const need = (req.need || "").toLowerCase();
    return data.map((h) => {
      const specialtyMatch = req.category === "other" || h.specialties.includes(req.category);
      const needMatch = need ? [h.name, h.type, ...h.services].join(" ").toLowerCase().includes(need) : true;
      const stock = stockFor(h, req.medicine);
      return { ...h, specialtyMatch, needMatch, stockStatus: stock, km: req.origin ? calculateDistance(req.origin, h) : null };
    }).filter((h) => h.specialtyMatch && h.needMatch);
  }

  function rankHospitals(list, req) {
    const critical = req.critical || req.category !== "other";
    list.forEach((h) => {
      let s = 40; // medical capability (specialty already matched)
      if (h.needMatch && req.need) s += 10;
      if (critical && h.emergency24) s += 15;
      if (h.stockStatus === "verified") s += 30; else if (h.stockStatus === "unconfirmed") s += 8; else if (h.stockStatus === "unavailable") s -= 40;
      if (h.km !== null) s += Math.max(0, 25 - h.km); // closer is better, capped
      h.score = s;
    });
    return list.sort((a, b) => b.score - a.score);
  }

  /* ---------- RENDERING ---------- */
  function badge(status) {
    const map = { verified: ["b-verified", "✔ Stock verified (demo)"], unconfirmed: ["b-unconfirmed", "? Stock unconfirmed – call first"], unavailable: ["b-unavailable", "✖ Not available (demo)"] };
    const [cls, label] = map[status] || ["b-none", "No medicine requested"];
    return el("span", "em-badge " + cls, label);
  }

  function renderHospitalResults() {
    const box = $("em-results"); box.replaceChildren();
    const q = $("f-q").value.trim().toLowerCase();
    const shown = state.results.filter((h) =>
      (!$("f-24h").checked || h.emergency24) && (!$("f-hide").checked || h.stockStatus !== "unavailable") &&
      (!q || [h.name, ...h.services].join(" ").toLowerCase().includes(q)));
    if (!shown.length) { box.append(el("p", "em-msg", "No matching facilities in the demo data. Call 112 or try changing the emergency type or filters.")); return; }
    shown.forEach((h, i) => {
      const card = el("article", "em-card");
      card.append(el("h3", "", (i + 1) + ". " + h.name));
      card.append(el("p", "em-meta", h.type + " · " + h.address + " · DEMO RECORD"));
      card.append(el("p", "em-meta", (h.km !== null ? h.km.toFixed(1) + " km straight-line distance (not a route) · " : "Distance unknown – no location · ") + h.hours + (h.emergency24 ? " · Emergency dept" : " · No emergency dept")));
      const tags = el("div", "em-tags"); h.services.forEach((s) => tags.append(el("span", "em-tag", s))); card.append(tags);
      const row = el("p", "em-meta"); row.append(badge(h.stockStatus)); card.append(row);
      card.append(el("p", "em-meta", "Last verified (sample): " + h.verifiedAt + ". Always confirm by phone."));
      const acts = el("div", "em-actions");
      const call = el("a", "primary", "📞 Call (demo number)"); call.href = "tel:" + DEMO_PHONE.replace(/[^+\d]/g, ""); call.setAttribute("aria-label", "Call " + h.name + ", demo number " + DEMO_PHONE);
      const dir = el("a", "", "🧭 Open in Google Maps"); dir.href = CONFIG.mapsDirectionsUrl(h, state.origin); dir.target = "_blank"; dir.rel = "noopener noreferrer";
      acts.append(call, dir); card.append(acts); box.append(card);
    });
  }

  function setMsg(text, isErr) { const s = $("em-state"); s.replaceChildren(); if (text) s.append(el("p", "em-msg" + (isErr ? " err" : ""), text)); }

  /* ---------- FILES ---------- */
  function addFiles(fileList) {
    const err = [];
    [...fileList].forEach((f) => {
      if (!CONFIG.allowedTypes.includes(f.type)) err.push(f.name + ": only PDF, JPG or PNG allowed.");
      else if (f.size > CONFIG.maxFileBytes) err.push(f.name + ": larger than 5 MB.");
      else if (!state.files.some((x) => x.name === f.name && x.size === f.size)) state.files.push(f);
    });
    $("em-file-err").textContent = err.join(" ");
    renderFiles();
  }
  function renderFiles() {
    const ul = $("em-filelist"); ul.replaceChildren();
    state.files.forEach((f, i) => {
      const li = el("li"); li.append(el("span", "", f.name + " (" + Math.ceil(f.size / 1024) + " KB)"));
      const b = el("button", "", "Remove"); b.type = "button"; b.setAttribute("aria-label", "Remove " + f.name);
      b.addEventListener("click", () => { state.files.splice(i, 1); renderFiles(); }); li.append(b); ul.append(li);
    });
  }

  /* ---------- SUBMIT ---------- */
  async function handleEmergencySubmit(event) {
    event.preventDefault();
    const val = (id) => $(id).value.trim();
    const req = { symptoms: val("em-symptoms"), category: val("em-category"), medicine: val("em-medicine"), need: val("em-need"), location: val("em-location") };
    req.critical = CRITICAL.test(req.symptoms) || req.category === "cardiac" || req.category === "breathing";
    $("em-critical").hidden = !CRITICAL.test(req.symptoms);
    $("em-filters").hidden = true; $("em-results").replaceChildren();
    if (!req.symptoms || !req.category) return setMsg("Please describe the problem and choose an emergency type.", true);
    if (req.medicine && !$("em-confirm").checked) return setMsg("Please confirm the medicine name and formulation before searching.", true);
    if (!state.origin && req.location) {
      state.origin = geocodeManual(req.location);
      if (!state.origin) setMsg("Demo mode can only place a few Delhi areas (e.g. Connaught Place, Saket, Dwarka, Rohini, Lajpat Nagar). Showing results without distances.", false);
    }
    req.origin = state.origin;
    if (state.origin) setMsg("Searching demo records…");
    else if (!req.location) setMsg("No location given – showing results without distances.");
    try {
      state.results = rankHospitals(await findMatchingHospitals(req), req);
      if (state.origin) setMsg(state.origin.source === "gps" ? "Using your GPS position." : "Using an approximate demo position for “" + req.location + "”.");
      $("em-filters").hidden = false; renderHospitalResults();
      $("em-results").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) { setMsg("Something went wrong while searching. Please call 112 if this is urgent.", true); }
  }

  /* ---------- OPEN / CLOSE & WIRING ---------- */
  function openView(btn) { state.opener = btn; $("em-view").hidden = false; document.body.style.overflow = "hidden"; $("em-close").focus(); }
  function closeView() { $("em-view").hidden = true; document.body.style.overflow = ""; if (state.opener) state.opener.focus(); }

  function init() {
    document.querySelectorAll("[data-emergency-open]").forEach((b) => b.addEventListener("click", () => openView(b)));
    $("em-close").addEventListener("click", closeView);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("em-view").hidden) closeView(); });
    $("em-form").addEventListener("submit", handleEmergencySubmit);
    $("em-symptoms").addEventListener("input", () => { $("em-critical").hidden = !CRITICAL.test($("em-symptoms").value); });
    $("em-medicine").addEventListener("input", () => { $("em-confirm-wrap").hidden = !$("em-medicine").value.trim(); });
    $("em-location").addEventListener("input", () => { state.origin = null; });
    $("em-gps").addEventListener("click", async () => {
      const s = $("em-loc-status"); s.textContent = "Requesting your location…";
      try { state.origin = await getUserLocation(); s.textContent = "Location found via GPS."; $("em-location").value = "My current location (GPS)"; }
      catch (e) { s.textContent = e.code === 1 ? "Location permission denied. Please type your area instead." : e.code === 0 ? e.message : "Could not get your location (" + (e.message || "error") + "). Type your area instead. GPS needs localhost or HTTPS."; }
    });
    const drop = $("em-drop"), input = $("em-files");
    input.addEventListener("change", () => { addFiles(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
    drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
    ["f-24h", "f-hide", "f-q"].forEach((id) => $(id).addEventListener("input", renderHospitalResults));
  }
  init();
})();
