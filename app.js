const $ = (id) => document.getElementById(id),
  S = {
    token: "guest",
    count: 30,
    qs: [],
    i: 0,
    ws: null,
    role: "",
    locked: false,
    username: localStorage.cjGuestName || "游客",
    wins: +localStorage.cjWins || 0,
  };
document
  .querySelector('meta[name="viewport"]')
  ?.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  );
const typography = document.createElement("link");
typography.rel = "stylesheet";
typography.href = "./typography.css";
document.head.append(typography);
document.addEventListener("dblclick", (event) => event.preventDefault(), {
  passive: false,
});
document.addEventListener("gesturestart", (event) => event.preventDefault(), {
  passive: false,
});
document.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length > 1) event.preventDefault();
  },
  { passive: false },
);
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (event) => {
    const now = Date.now();
    if (now - lastTouchEnd < 320) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false },
);
const rankConfig = [
  ["词汇青铜", ["Ⅴ", "Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"], 2],
  ["词汇白银", ["Ⅴ", "Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"], 3],
  ["词汇黄金", ["Ⅴ", "Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"], 4],
  ["词汇铂金", ["Ⅴ", "Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"], 5],
  ["词汇星钻", ["Ⅴ", "Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"], 7],
  ["词汇皇冠", ["Ⅴ", "Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"], 9],
  ["词汇王牌", [], 12],
];
function rankInfo(wins) {
  let left = wins;
  for (const [name, subs, need] of rankConfig)
    for (const sub of subs.length ? subs : [""]) {
      if (left < need)
        return { name, sub, need, progress: left, remaining: need - left };
      left -= need;
    }
  return { name: "词汇战神", sub: "", need: 0, progress: 0, remaining: 0 };
}
function updateRank() {
  const r = rankInfo(S.wins);
  $("homeLevel").textContent = `${r.name}${r.sub} · 累计 ${S.wins} 胜`;
  if ($("xpBar"))
    $("xpBar").style.width = r.need
      ? `${Math.round((r.progress / r.need) * 100)}%`
      : "100%";
  if ($("xpText"))
    $("xpText").textContent = r.need
      ? `${r.progress} / ${r.need} 胜`
      : "最高段位";
  if ($("winCount")) $("winCount").textContent = S.wins;
  applyRankTheme(r);
  return r;
}
function applyRankTheme(rank) {
  const palettes = {
    "词汇青铜": ["#dceaff", "#bdd6ff", "#91b9fa", "#638fe9", "#356bd0"],
    "词汇白银": ["#effbf1", "#cef1d5", "#9ae1aa", "#59bd70", "#218446"],
    "词汇黄金": ["#fff8dc", "#ffeca0", "#ffd35b", "#e4a919", "#a86e00"],
    "词汇铂金": ["#fff0e5", "#ffcd9c", "#ff9e59", "#e86a1d", "#a53c09"],
    "词汇星钻": ["#ffeded", "#ffc6c6", "#ff9394", "#e64f57", "#a91d34"],
    "词汇皇冠": ["#f5edff", "#dfc3ff", "#c49dff", "#9462dd", "#5c2aa7"],
    "词汇王牌": ["#d9dde1", "#abb1b9", "#737a84", "#393e46", "#101318"],
  };
  const subIndex = ["Ⅴ", "Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"].indexOf(rank.sub);
  const aceIndex = rank.name === "词汇王牌" && rank.need
    ? Math.min(4, Math.floor((rank.progress / rank.need) * 5))
    : 0;
  const color = rank.name === "词汇战神"
    ? "#07090d"
    : (palettes[rank.name] || palettes["词汇青铜"])[
        rank.name === "词汇王牌" ? aceIndex : Math.max(0, subIndex)
      ];
  const dark =
    rank.name === "词汇战神" ||
    (rank.name === "词汇王牌" && aceIndex >= 3) ||
    (rank.name !== "词汇王牌" && subIndex >= 3);
  const text = dark ? "#ffffff" : "#102038";
  const muted = dark ? "rgba(255,255,255,.72)" : "#5d6a7b";
  const card = document.querySelector("#home .level-card");
  if (!card) return;
  card.style.background = color;
  card.style.borderColor = dark ? "rgba(255,255,255,.16)" : "rgba(55,79,110,.16)";
  card.style.color = text;
  card.style.boxShadow = dark
    ? "0 7px 18px rgba(25,35,55,.22)"
    : "0 5px 15px rgba(38,60,96,.08)";
  const avatar = card.querySelector(".avatar");
  if (avatar) {
    avatar.style.background = dark ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.66)";
    avatar.style.color = text;
  }
  card.querySelectorAll(".level-copy span, .level-copy small").forEach((item) => {
    item.style.color = muted;
  });
  const streak = card.querySelector(".streak");
  if (streak) streak.style.borderLeftColor = dark ? "rgba(255,255,255,.24)" : "rgba(55,79,110,.14)";
  const xp = card.querySelector(".xp");
  if (xp) xp.style.background = dark ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.62)";
  if ($("xpBar"))
    $("xpBar").style.background = dark
      ? "linear-gradient(90deg,#fff,#dbe6ff)"
      : "linear-gradient(90deg,#5278d2,#7a5bd1)";
}
function updatePracticeScore() {
  const total = +localStorage.cjPracticeScore || 0;
  if ($("practiceScoreHome"))
    $("practiceScoreHome").textContent = `练习积分 ${total}`;
  const pill = document.querySelector("#practice .timer-pill");
  if (pill) pill.textContent = `积分 ${S.practiceScore || 0}`;
}
function displayWord(id, word) {
  const el = $(id);
  if (word.length <= 19) {
    el.textContent = word;
    return;
  }
  const mid = Math.floor(word.length / 2),
    cut = word.lastIndexOf(" ", mid),
    at = cut > 0 ? cut : mid;
  el.innerHTML =
    word.slice(0, at) + "<br>" + word.slice(at + (cut > 0 ? 1 : 0));
}
function displayDuelWord(word) {
  displayWord("duelWord", word);
}
const sh = (a) => [...a].sort(() => Math.random() - 0.5),
  say = (t) => {
    $("toast").textContent = t;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 1500);
  };
function rainbow(button) {
  button.classList.remove("rainbow-chase");
  void button.offsetWidth;
  button.classList.add("rainbow-chase");
  setTimeout(() => button.classList.remove("rainbow-chase"), 2000);
}
function page(id) {
  document
    .querySelectorAll(".screen")
    .forEach((x) => x.classList.remove("active"));
  $(id).classList.add("active");
  showName(id);
  if (id === "home") updateRank();
  if (id === "lobby") {
    $("roomInput").value = "";
    setTimeout(() => $("roomInput").focus(), 0);
  }
}
function showName(pageId = "home") {
  const learner = document.querySelector("#home .level-copy span");
  if (learner) learner.textContent = S.username;
}
function api(u, d) {
  return fetch(u, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
  }).then((x) => x.json());
}
function opts(q) {
  return sh([
    q.meaning,
    ...sh(S.qs.filter((x) => x.id !== q.id))
      .slice(0, 3)
      .map((x) => x.meaning),
  ]);
}
function answers(box, a, fn) {
  box.innerHTML = "";
  a.forEach((x, i) => {
    let b = document.createElement("button");
    b.className = "answer";
    b.textContent = x;
    b.onclick = () => fn(b, i, x);
    box.append(b);
  });
}
async function practice() {
  let d = await api("/api/practice", {
    token: S.token,
    username: S.username,
    count: 30,
  });
  if (d.error) return say(d.error);
  S.qs = d.questions;
  S.i = 0;
  S.practiceScore = +localStorage.cjPracticeScore || 0;
  updatePracticeScore();
  page("practice");
  renderPractice();
}
function renderPractice() {
  let q = S.qs[S.i];
  $("practiceProgress").textContent =
    `${String(S.i + 1).padStart(2, "0")} / ${S.qs.length}`;
  $("practiceLine").style.width = ((S.i + 1) / S.qs.length) * 100 + "%";
  displayWord("practiceWord", q.word);
  $("practicePhonetic").textContent = q.phonetic || "";
  S.questionStarted = Date.now();
  S.locked = false;
  answers($("practiceAnswers"), opts(q), (b, i, x) => {
    if (S.locked) return;
    S.locked = true;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(q.word));
    if (x === q.meaning) {
      b.classList.add("correct");
      rainbow(b);
      S.practiceScore++;
      if (Date.now() - S.questionStarted <= 5000) {
        S.practiceScore++;
        say("连击 +1");
      }
      localStorage.cjPracticeScore = S.practiceScore;
      updatePracticeScore();
    } else {
      b.classList.add("wrong");
      api("/api/wrong/add", { username: S.username, id: q.id });
      say("答错了");
    }
    setTimeout(() => {
      if (++S.i < S.qs.length) renderPractice();
      else {
        if ($("reviewedCount"))
          $("reviewedCount").textContent = S.practiceScore;
        updatePracticeScore();
        say(`当前累计积分 ${S.practiceScore} 分`);
        page("home");
      }
    }, 700);
  });
}
async function reviewWrong() {
  const d = await api("/api/wrong/list", { username: S.username });
  const q = (d.questions || [])[0];
  page("mistakes");
  if (!q) {
    $("mistakeHint").textContent = "暂无错题";
    $("mistakeWord").textContent = "太棒了！";
    $("mistakeAnswers").innerHTML = "";
    return;
  }
  $("mistakeWord").textContent = q.word;
  $("mistakePhonetic").textContent = q.phonetic || "";
  let familiar = $("mistakeFamiliar");
  if (!familiar) {
    familiar = document.createElement("button");
    familiar.id = "mistakeFamiliar";
    familiar.className = "secondary";
    familiar.textContent = "熟记此词（30 天内不再练习）";
    $("mistakeAnswers").before(familiar);
  }
  familiar.onclick = async () => {
    await api("/api/wrong/memorize", { username: S.username, id: q.id });
    await api("/api/wrong/remove", { username: S.username, id: q.id });
    say("已标记熟记");
    reviewWrong();
  };
  answers($("mistakeAnswers"), opts(q), (b, _i, x) => {
    if (x === q.meaning) {
      b.classList.add("correct");
      api("/api/wrong/remove", { username: S.username, id: q.id });
      setTimeout(reviewWrong, 500);
    } else b.classList.add("wrong");
  });
}
function socket() {
  S.ws = new WebSocket(
    (location.protocol === "https:" ? "wss" : "ws") +
      "://" +
      location.host +
      "/ws",
  );
  S.ws.onmessage = (e) => msg(JSON.parse(e.data));
  S.ws.onerror = () => say("服务器连接失败");
}
function msg(m) {
  if (m.type === "joined") {
    S.role = m.role;
  } else if (m.type === "room-created") {
    S.count = m.count || 30;
    $("roomNumber").textContent = m.room;
    syncDuelCountPicker();
    page("waiting");
  } else if (m.type === "count-updated") {
    S.count = m.count || 30;
    syncDuelCountPicker();
  } else if (m.type === "game-start") {
    S.count = m.count || S.count;
    page("duel");
  }
  else if (m.type === "question") {
    S.locked = false;
    displayDuelWord(m.word);
    $("duelPhonetic").textContent = m.phonetic || "";
    $("duelProgress").textContent = `第 ${m.number} / ${S.count} 题`;
    $("myScore").textContent = m.scores[S.role] + " 分";
    $("opponentScore").textContent =
      Object.entries(m.scores)
        .filter(([id]) => id !== S.role)
        .reduce((sum, [, score]) => sum + score, 0) + " 分";
    answers($("duelAnswers"), m.options, (b, i) => {
      if (!S.locked) {
        S.locked = true;
        S.selected = b;
        S.ws.send(JSON.stringify({ type: "answer", index: i }));
      }
    });
    $("duelAnswers").style.touchAction = "manipulation";
    [...$("duelAnswers").children].forEach(
      (button) => (button.style.touchAction = "manipulation"),
    );
    const questionId = (S.questionId || 0) + 1;
    S.questionId = questionId;
    [...$("duelAnswers").children].forEach((button) => {
      button.disabled = true;
      button.style.background = "#e8ebef";
      button.style.color = "#9aa5b4";
      button.style.cursor = "not-allowed";
    });
    setTimeout(() => {
      if (S.questionId !== questionId) return;
      [...$("duelAnswers").children].forEach((button) => {
        button.disabled = false;
        button.style.background = "";
        button.style.color = "";
        button.style.cursor = "";
      });
    }, 2000);
    clearInterval(S.duelTimer);
    let left = 12;
    $("duelClock").textContent = left;
    S.duelTimer = setInterval(() => {
      $("duelClock").textContent = --left;
      if (!left) clearInterval(S.duelTimer);
    }, 1000);
  } else if (m.type === "answer-result") {
    if (m.owner && S.selected) {
      S.selected.classList.add(m.correct ? "correct" : "wrong");
      S.selected.style.background = m.correct ? "#dff6a1" : "#ffe5e3";
      S.selected.style.borderColor = m.correct ? "#b8dc58" : "#ffaaa5";
      if (m.correct) rainbow(S.selected);
    }
    duelStatus.textContent = m.correct ? "回答正确！" : "回答错误，对手得 1 分";
  } else if (m.type === "game-over") {
    if (S.username === "游客") {
      let name = prompt("本局结束，请输入用户名：", "");
      if (name && name.trim()) {
        S.username = name.trim().slice(0, 20);
        localStorage.cjGuestName = S.username;
        S.ws.send(JSON.stringify({ type: "set-name", username: S.username }));
        showName();
      }
    }
    const otherScore = Math.max(
      ...Object.entries(m.scores)
        .filter(([id]) => id !== S.role)
        .map(([, score]) => score),
      0,
    );
    const win = m.scores[S.role] > otherScore;
    if (win) S.wins++;
    localStorage.cjWins = S.wins;
    const r = rankInfo(S.wins);
    $("finalMy").textContent = m.scores[S.role];
    $("finalOpp").textContent = otherScore;
    $("resultTitle").textContent = win ? "完美胜出🎊" : "再接再厉💪";
    $("rewardBox").textContent = r.remaining
      ? `当前 ${r.name}${r.sub} · 再胜 ${r.remaining} 场升级`
      : `当前 ${r.name}`;
    page("result");
  } else if (m.type === "error") say(m.message);
}
document
  .querySelectorAll("[data-go]")
  .forEach(
    (b) =>
      (b.onclick = () =>
        b.dataset.go === "practice"
          ? practice()
          : b.dataset.go === "mistakes"
            ? reviewWrong()
            : page(b.dataset.go)),
  );
function installDuelCountPicker() {
  const waiting = $("waiting").querySelector(".waiting-content");
  if (!waiting || $("duelCountPicker")) return;
  const picker = document.createElement("fieldset");
  picker.id = "duelCountPicker";
  picker.setAttribute("aria-label", "本局单词数量");
  picker.style.cssText =
    "border:0;margin:22px 0 0;padding:0;width:100%;text-align:left";
  picker.innerHTML =
    '<legend style="margin:0 0 10px;font-size:12px;font-weight:800;color:#52627a;letter-spacing:.08em">选择本局难度</legend><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px"><label style="display:block;cursor:pointer"><input type="radio" name="duelCount" value="10" style="position:absolute;opacity:0"><span style="display:block;border:1px solid #dbe2ed;border-radius:11px;padding:9px 3px;text-align:center;background:#fff"><b style="display:block;font-size:15px">10</b><small style="font-size:10px;white-space:nowrap">随便玩玩</small></span></label><label style="display:block;cursor:pointer"><input type="radio" name="duelCount" value="30" checked style="position:absolute;opacity:0"><span style="display:block;border:1px solid #5278d2;border-radius:11px;padding:9px 3px;text-align:center;background:#eaf0ff;color:#365ebc"><b style="display:block;font-size:15px">30</b><small style="font-size:10px;white-space:nowrap">还行还行</small></span></label><label style="display:block;cursor:pointer"><input type="radio" name="duelCount" value="50" style="position:absolute;opacity:0"><span style="display:block;border:1px solid #dbe2ed;border-radius:11px;padding:9px 3px;text-align:center;background:#fff"><b style="display:block;font-size:15px">50</b><small style="font-size:10px;white-space:nowrap">厉害厉害</small></span></label><label style="display:block;cursor:pointer"><input type="radio" name="duelCount" value="100" style="position:absolute;opacity:0"><span style="display:block;border:1px solid #dbe2ed;border-radius:11px;padding:9px 3px;text-align:center;background:#fff"><b style="display:block;font-size:15px">100</b><small style="font-size:10px;white-space:nowrap">非人类</small></span></label></div>';
  waiting.append(picker);
  picker.addEventListener("change", (event) => {
    const selected = event.target;
    if (!(selected instanceof HTMLInputElement) || !selected.checked) return;
    S.count = Number(selected.value);
    syncDuelCountPicker();
    S.ws?.send(JSON.stringify({ type: "set-count", count: S.count }));
  });
}
function syncDuelCountPicker() {
  const picker = $("duelCountPicker");
  if (!picker) return;
  picker.querySelectorAll("input").forEach((input) => {
    const chosen = Number(input.value) === S.count;
    input.checked = chosen;
    const card = input.nextElementSibling;
    card.style.borderColor = chosen ? "#5278d2" : "#dbe2ed";
    card.style.background = chosen ? "#eaf0ff" : "#fff";
    card.style.color = chosen ? "#365ebc" : "";
  });
}
installDuelCountPicker();
$("createRoom").onclick = () => {
  S.role = "host";
  S.count = 30;
  socket();
  S.ws.onopen = () =>
    S.ws.send(
      JSON.stringify({
        type: "create",
        token: S.token,
        count: S.count,
        username: S.username,
      }),
    );
};
function joinRoom() {
  if (
    S.ws &&
    (S.ws.readyState === WebSocket.CONNECTING ||
      S.ws.readyState === WebSocket.OPEN)
  )
    return;
  const room = $("roomInput").value.trim();
  if (!/^\d{4}$/.test(room)) return say("请输入 4 位房间号");
  S.role = "guest";
  socket();
  S.ws.onopen = () =>
    S.ws.send(
      JSON.stringify({
        type: "join",
        room,
        token: S.token,
        username: S.username,
      }),
    );
}
$("joinRoom").onclick = joinRoom;
$("roomInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinRoom();
});
$("roomInput").addEventListener("change", () => {
  if ($("roomInput").value.trim().length === 4) joinRoom();
});
$("joinRoom").style.background = "#3158b7";
$("joinRoom").style.color = "#fff";
$("copyRoom").onclick = () =>
  navigator.clipboard.writeText($("roomNumber").textContent);
$("leaveRoom").onclick = () => {
  S.ws?.close();
  page("home");
};
$("rematch").onclick = () => S.ws.send(JSON.stringify({ type: "rematch" }));
$("practiceListen").onclick = () =>
  speechSynthesis.speak(
    new SpeechSynthesisUtterance($("practiceWord").textContent),
  );
page("home");
function installRanking() {
  const home = $("home").querySelector(".home-content");
  const score = document.createElement("div");
  score.id = "practiceScoreHome";
  score.style.cssText =
    "font-size:12px;font-weight:700;color:#5278d2;margin:8px 0";
  home.querySelector(".mode-grid").before(score);
  updatePracticeScore();
  const button = document.createElement("button");
  button.className = "secondary";
  button.textContent = "🏆 查看排行榜";
  const mistakes = home.querySelector(".mistake-entry");
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:10px;margin-top:12px";
  if (mistakes) {
    mistakes.style.cssText =
      "flex:1;margin:0;min-width:0;justify-content:center;padding:12px 8px";
    mistakes.querySelector("small")?.remove();
    mistakes.querySelector("i")?.remove();
    actions.append(mistakes);
  }
  button.style.cssText =
    "flex:1;margin:0;height:auto;min-height:48px;background:#e4ebff;color:#436bd1";
  actions.append(button);
  home.querySelector(".stats")?.before(actions);
  const panel = document.createElement("div");
  panel.id = "rankingPanel";
  panel.style.cssText =
    "display:none;position:fixed;inset:0;z-index:20;background:#f7f6f1;overflow:auto;padding:24px max(20px,calc((100vw - 520px)/2));color:#102038";
  panel.innerHTML =
    '<button id="closeRanking" class="back">←</button><h2 style="text-align:center">词汇排行榜</h2><p style="text-align:center;color:#718097;font-size:12px">按 PK 胜场排序</p><div id="rankLoading" style="display:none;text-align:center;padding:52px 0;color:#5278d2"><span style="display:inline-block;font-size:34px;line-height:1;animation:rankSpinner .8s linear infinite">◌</span><p style="margin:12px 0 0;font-size:13px">排行榜加载中…</p></div><div id="rankRows"></div>';
  document.body.append(panel);
  const spinnerStyle = document.createElement("style");
  spinnerStyle.textContent =
    "@keyframes rankSpinner { to { transform: rotate(360deg); } }";
  document.head.append(spinnerStyle);
  button.onclick = async () => {
    panel.style.display = "block";
    const loading = $("rankLoading"),
      rows = $("rankRows");
    loading.style.display = "block";
    rows.innerHTML = "";
    try {
      const d = await api("/api/rank", {});
      rows.innerHTML =
        (d.players || [])
          .map(
            (p) =>
              `<div style="display:flex;gap:14px;align-items:center;background:#fff;border:1px solid #e3e7ed;border-radius:14px;margin:10px 0;padding:15px"><b style="color:#5278d2">#${p.place}</b><strong style="flex:1">${p.username}</strong><small>${p.wins} 胜 / ${p.draws || 0} 平 / ${p.games} 场 · ${p.winRate}%</small></div>`,
          )
          .join("") || '<p style="text-align:center">暂无 PK 记录</p>';
    } catch {
      rows.innerHTML =
        '<p style="text-align:center;color:#718097">加载失败，请稍后重试</p>';
    } finally {
      loading.style.display = "none";
    }
  };
  $("closeRanking").onclick = () => (panel.style.display = "none");
}
installRanking();
