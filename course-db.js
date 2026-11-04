(function () {
  "use strict";
  const source = "https://docs.google.com/spreadsheets/d/1KoshoNsQ2iakG6dZDmjUqpPZFi92F01kJg4VIX_Gs5M/export?format=csv&gid=586333722";
  const intervalMs = 30 * 60 * 1000;
  const cacheKey = "curriculum-course-db-1KoshoNsQ2iakG6dZDmjUqpPZFi92F01kJg4VIX_Gs5M-586333722-v1";
  const fields = { name: "과목", type: "과목유형", defaultCredits: "기준학점", field: "계열", group: "과목(군)", curriculum: "교육과정 구분", grading: "성적처리 유형" };
  function parseCsv(text) {
    const rows = []; let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); if (row.some(x => x !== "")) rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (quoted) throw new Error("CSV 따옴표가 닫히지 않았습니다.");
    row.push(cell); if (row.some(x => x !== "")) rows.push(row);
    return rows;
  }
  function parseCatalog(text) {
    const rows = parseCsv(text), headers = (rows.shift() || []).map(x => x.replace(/^\uFEFF/, "").trim());
    for (const header of Object.values(fields)) if (!headers.includes(header)) throw new Error("시트 열 누락: " + header);
    const records = rows.map(row => {
      const record = Object.fromEntries(Object.entries(fields).map(([key, header]) => [key, String(row[headers.indexOf(header)] || "").trim()]));
      record.code = String(row[headers.indexOf("과목코드")] || "").trim();
      record.key = [record.curriculum, record.code, record.group, record.name].join(":");
      const credits = record.defaultCredits;
      record.defaultCredits = credits === "" ? null : Number(credits);
      if (credits !== "" && !Number.isFinite(record.defaultCredits)) throw new Error("기준학점 오류: " + record.name);
      return record;
    }).filter(record => record.name && /^\d{4}$/.test(record.curriculum));
    if (!records.some(record => record.curriculum === "2022" && record.group)) throw new Error("2022 교과군 자료가 없습니다.");
    return records;
  }
  function valid(db) {
    return db?.version === 1 && db.source === source && Array.isArray(db.records) && db.records.length > 0 &&
      db.records.every(r => r && Object.keys(fields).every(key => key === "defaultCredits"
        ? r[key] === null || (typeof r[key] === "number" && Number.isFinite(r[key])) : typeof r[key] === "string")) &&
      db.records.some(r => r.curriculum === "2022" && r.group);
  }
  function create({ seed, onUpdate, onStatus = () => {} }) {
    let db = seed, inFlight = null, lastAttempt = 0, timer = null;
    try { const cached = JSON.parse(localStorage.getItem(cacheKey)); if (valid(cached)) db = cached; } catch (_) {}
    if (!valid(db)) throw new Error("초기 과목 DB가 올바르지 않습니다.");
    async function refresh() {
      if (inFlight) return inFlight;
      lastAttempt = Date.now();
      inFlight = (async () => {
        onStatus("loading", db);
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const response = await fetch(source + "&_=" + Date.now(), { cache: "no-store", credentials: "omit", signal: controller.signal });
          if (!response.ok) throw new Error("HTTP " + response.status);
          const next = { version: 1, source, updatedAt: new Date().toISOString(), fields, records: parseCatalog(await response.text()) };
          if (!valid(next)) throw new Error("과목 DB 검증에 실패했습니다.");
          db = next;
          let persisted = true;
          try { localStorage.setItem(cacheKey, JSON.stringify(db)); } catch (_) { persisted = false; }
          onUpdate(db);
          onStatus(persisted ? "ready" : "uncached", db);
          return true;
        } catch (error) { console.info("과목 DB 갱신 실패: 이전 DB 유지", error); onStatus("error", db); return false; }
        finally { clearTimeout(timeout); }
      })();
      try { return await inFlight; } finally { inFlight = null; }
    }
    const resume = () => { if (!document.hidden && Date.now() - lastAttempt >= intervalMs) refresh(); };
    return {
      snapshot: () => db,
      refresh,
      start() { if (timer !== null) return; refresh(); timer = setInterval(refresh, intervalMs); document.addEventListener("visibilitychange", resume); window.addEventListener("online", resume); },
      stop() { clearInterval(timer); timer = null; document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); }
    };
  }
  window.CurriculumCourseDB = { source, intervalMs, fields, parseCsv, parseCatalog, valid, create };
})();
