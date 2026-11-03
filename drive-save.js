(function () {
  "use strict";
  function filename(year, schoolName, date = new Date()) {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).format(date).replace(/[-:]/g, "").replace(" ", "_");
    const safeSchool = String(schoolName).replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim();
    return `${year}학년도_${safeSchool}_${parts}_${String(date.getMilliseconds()).padStart(3, "0")}.json`;
  }
  function upload(name, content) {
    if (location.protocol === "file:") return Promise.reject(new Error("파일을 직접 열면 Drive에 저장할 수 없습니다. GitHub Pages 사이트에서 실행해 주세요."));
    const endpoint = window.CURRICULUM_DRIVE_CONFIG?.webAppUrl;
    if (!endpoint) return Promise.reject(new Error("Drive 연결 설정이 필요합니다. 배포 안내를 확인해 주세요."));
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint))
      return Promise.reject(new Error("Drive 웹 앱 주소가 올바르지 않습니다."));
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const frame = document.createElement("iframe"), form = document.createElement("form");
      frame.name = "drive-" + requestId; frame.hidden = true;
      form.method = "POST"; form.action = endpoint; form.target = frame.name; form.hidden = true;
      Object.entries({ requestId, filename: name, content, origin: location.origin }).forEach(([key, value]) => {
        const input = document.createElement("input"); input.type = "hidden"; input.name = key; input.value = value; form.append(input);
      });
      const cleanup = () => { clearTimeout(timer); window.removeEventListener("message", receive); form.remove(); frame.remove(); };
      const receive = event => {
        if (!/^https:\/\/(?:script|[\w-]+-script|[\w-]+\.script)\.googleusercontent\.com$/.test(event.origin)) return;
        const result = event.data;
        if (result?.type !== "curriculum-drive-save" || result.requestId !== requestId) return;
        cleanup(); result.ok ? resolve(result) : reject(new Error(result.error || "Drive 저장에 실패했습니다."));
      };
      const timer = setTimeout(() => { cleanup(); reject(new Error("Drive 응답 시간이 초과되었습니다. 폴더에서 저장 여부를 확인해 주세요.")); }, 60000);
      window.addEventListener("message", receive);
      document.body.append(frame, form); form.submit();
    });
  }
  window.CurriculumDrive = { filename, upload };
})();
