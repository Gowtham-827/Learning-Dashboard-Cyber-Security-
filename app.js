"use strict";
(() => {
  const KEY = "cs-dashboard.v1";
  const TRACKS = [
    ["net", "Networking fundamentals", ["OSI and TCP/IP models", "DNS, DHCP and ARP", "Firewalls and segmentation", "VPNs and TLS handshake"]],
    ["web", "Web application security", ["OWASP Top 10 overview", "SQL injection defenses", "XSS and CSP", "Authentication and session management"]],
    ["crypto", "Cryptography", ["Symmetric vs asymmetric encryption", "Hashing and salting", "Digital signatures and PKI", "Key management basics"]],
    ["soc", "Security operations", ["Log sources and SIEM", "Alert triage workflow", "Threat hunting basics", "MITRE ATT&CK mapping"]],
    ["ir", "Incident response", ["Preparation and playbooks", "Containment and eradication", "Forensics and evidence handling", "Post-incident review"]],
    ["iam", "Identity and access", ["Least privilege", "Multi-factor authentication", "SSO, OAuth and OIDC", "Privileged access management"]],
    ["cloud", "Cloud security", ["Shared responsibility model", "IAM policies and roles", "Storage and secrets exposure", "Cloud logging and monitoring"]],
    ["human", "Social engineering", ["Phishing recognition", "Pretexting and vishing", "Security awareness programs", "Reporting suspicious activity"]],
  ];
  const QUIZ = [
    ["Which header helps prevent cross-site scripting by restricting script sources?", ["X-Frame-Options", "Content-Security-Policy", "Referrer-Policy", "Cache-Control"], 1, "Content-Security-Policy whitelists where scripts and other resources may load from."],
    ["What is the best defense against SQL injection?", ["Input blacklists", "Hiding error messages", "Parameterized queries", "Client-side validation"], 2, "Parameterized queries keep data separate from SQL code."],
    ["Why are passwords salted before hashing?", ["To make them shorter", "To defeat precomputed rainbow tables", "To allow decryption", "To speed up login"], 1, "Unique salts force attackers to crack each hash separately."],
    ["Which port does HTTPS use by default?", ["80", "22", "443", "8080"], 2, "HTTPS defaults to TCP 443."],
    ["Which describes the principle of least privilege?", ["Everyone gets admin rights", "Users get only the access they need", "Access never expires", "Shared accounts for teams"], 1, "Limiting access reduces the damage from compromised accounts."],
    ["What does MFA add to a password?", ["A longer password", "Another independent verification factor", "Faster logins", "Encrypted storage"], 1, "A second factor stops attackers who only have the password."],
    ["Which incident response phase comes right after detection and analysis?", ["Preparation", "Containment", "Lessons learned", "Reporting only"], 1, "Containment limits spread before eradication and recovery."],
    ["A link text says 'paypal.com' but points to paypa1-secure.xyz. This is:", ["A CDN redirect", "A phishing attempt", "Normal tracking", "DNS caching"], 1, "Mismatched, look-alike domains are classic phishing signs."],
    ["In the cloud shared responsibility model, who secures customer data?", ["Always the provider", "Always the customer", "The customer, with provider-managed infrastructure", "Nobody"], 2, "Providers secure the infrastructure; customers secure their data and configuration."],
    ["Which tool category aggregates and correlates logs for detection?", ["SIEM", "CDN", "DHCP", "NAT"], 0, "A SIEM collects and correlates events to raise alerts."],
  ];

  const $ = (id) => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);
  const load = () => {
    try { return { done: {}, days: [], scores: [], ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
    catch { return { done: {}, days: [], scores: [] }; }
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } };
  let state = load();

  function streak() {
    const set = new Set(state.days);
    let n = 0;
    const d = new Date();
    if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const markActive = () => { if (!state.days.includes(today())) state.days.push(today()); };

  function el(tag, props = {}, ...kids) {
    const n = Object.assign(document.createElement(tag), props);
    n.append(...kids);
    return n;
  }

  function renderSummary() {
    const total = TRACKS.reduce((s, t) => s + t[2].length, 0);
    const done = Object.values(state.done).filter(Boolean).length;
    $("overall").textContent = `${Math.round((done / total) * 100)}%`;
    $("done").textContent = `${done}/${total}`;
    $("streak").textContent = String(streak());
    $("best").textContent = state.scores.length ? `${Math.max(...state.scores)}/5` : "–";
  }

  function renderTracks() {
    $("tracks").replaceChildren(...TRACKS.map(([id, name, topics]) => {
      const finished = topics.filter((_, i) => state.done[`${id}:${i}`]).length;
      const bar = el("div", { className: "bar" }, el("i"));
      bar.firstChild.style.width = `${(finished / topics.length) * 100}%`;
      const box = el("article", { className: "track" },
        el("h3", {}, name, el("span", { textContent: `${finished}/${topics.length}` })), bar);
      topics.forEach((t, i) => {
        const cb = el("input", { type: "checkbox", checked: !!state.done[`${id}:${i}`] });
        cb.addEventListener("change", () => {
          state.done[`${id}:${i}`] = cb.checked;
          if (cb.checked) markActive();
          save(); renderTracks(); renderSummary();
        });
        box.append(el("label", {}, cb, el("span", { textContent: t })));
      });
      return box;
    }));
  }

  // ---- Quiz ----
  let run = null;
  function startQuiz() {
    const pool = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 5);
    run = { pool, i: 0, score: 0, answered: false };
    renderQuestion();
  }
  function renderQuestion() {
    const box = $("quizBox");
    const [q, opts, ans, why] = run.pool[run.i];
    const list = el("div", { className: "opts" });
    const note = el("p", { className: "explain" });
    const next = el("button", { type: "button", textContent: run.i === 4 ? "Finish" : "Next question", hidden: true });
    opts.forEach((o, idx) => {
      const b = el("button", { type: "button", textContent: o });
      b.addEventListener("click", () => {
        if (run.answered) return;
        run.answered = true;
        if (idx === ans) run.score++;
        [...list.children].forEach((c, k) => { c.disabled = true; if (k === ans) c.className = "right"; });
        if (idx !== ans) b.className = "wrong";
        note.textContent = (idx === ans ? "Correct. " : "Not quite. ") + why;
        next.hidden = false; next.focus();
      });
      list.append(b);
    });
    next.addEventListener("click", () => { run.answered = false; run.i++; run.i < 5 ? renderQuestion() : finishQuiz(); });
    box.replaceChildren(el("p", { className: "meta", textContent: `Question ${run.i + 1} of 5` }),
      el("p", { textContent: q }), list, note, next);
  }
  function finishQuiz() {
    state.scores.push(run.score); markActive(); save(); renderSummary();
    const again = el("button", { type: "button", textContent: "Take another quiz" });
    again.addEventListener("click", startQuiz);
    $("quizBox").replaceChildren(el("p", { textContent: `You scored ${run.score} out of 5.` }),
      el("p", { className: "meta", textContent: `Quizzes taken: ${state.scores.length}` }), again);
  }

  $("reset").addEventListener("click", () => {
    if (confirm("Reset all progress, streak and quiz scores?")) {
      state = { done: {}, days: [], scores: [] }; save(); renderTracks(); renderSummary(); startQuiz();
    }
  });

  renderTracks(); renderSummary(); startQuiz();
})();
