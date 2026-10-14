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
  if ($("xpBar")) $("xpBar").style.width = r.need ? `${Math.round(r.progress / r.need * 100)}%` : "100%";
  if ($("xpText")) $("xpText").textContent = r.need ? `${r.progress} / ${r.need} 胜` : "最高段位";
  return r;
}
const sh = (a) => [...a].sort(() => Math.random() - 0.5),
  say = (t) => {
    $("toast").textContent = t;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 1500);
  };
function rainbow(button){button.classList.remove('rainbow-chase');void button.offsetWidth;button.classList.add('rainbow-chase');setTimeout(()=>button.classList.remove('rainbow-chase'),2000)}
function page(id) {
  document
    .querySelectorAll(".screen")
    .forEach((x) => x.classList.remove("active"));
  $(id).classList.add("active");
  showName(id);
  if (id === "home") updateRank();
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
  let d = await api("/api/practice", { token: S.token, count: 30 });
  if (d.error) return say(d.error);
  S.qs = d.questions;
  S.i = 0;
  page("practice");
  renderPractice();
}
function renderPractice() {
  let q = S.qs[S.i];
  $("practiceProgress").textContent =
    `${String(S.i + 1).padStart(2, "0")} / ${S.qs.length}`;
  $("practiceLine").style.width = ((S.i + 1) / S.qs.length) * 100 + "%";
  $("practiceWord").textContent = q.word;
  $("practicePhonetic").textContent = q.phonetic || "";
  S.locked = false;
  answers($("practiceAnswers"), opts(q), (b, i, x) => {
    if (S.locked) return;
    S.locked = true;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(q.word));
    if (x === q.meaning) {
      b.classList.add("correct");
      rainbow(b);
    } else {
      b.classList.add("wrong");
      api("/api/wrong/add", { username: S.username, id: q.id });
      say("答错了");
    }
    setTimeout(
      () => (++S.i < S.qs.length ? renderPractice() : page("home")),
      700,
    );
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
  if (m.type === "room-created") {
    $("roomNumber").textContent = m.room;
    page("waiting");
  } else if (m.type === "game-start") page("duel");
  else if (m.type === "question") {
    S.locked = false;
    $("duelWord").textContent = m.word;
    $("duelPhonetic").textContent = m.phonetic || "";
    $("duelProgress").textContent = `第 ${m.number} / ${S.count} 题`;
    $("myScore").textContent = m.scores[S.role] + " 分";
    $("opponentScore").textContent =
      m.scores[S.role === "host" ? "guest" : "host"] + " 分";
    answers($("duelAnswers"), m.options, (b, i) => {
      if (!S.locked) {
        S.locked = true;
        S.selected = b;
        S.ws.send(JSON.stringify({ type: "answer", index: i }));
      }
    });
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
    const win =
      m.scores[S.role] > m.scores[S.role === "host" ? "guest" : "host"];
    if (win) S.wins++;
    localStorage.cjWins = S.wins;
    const r = rankInfo(S.wins);
    $("finalMy").textContent = m.scores[S.role];
    $("finalOpp").textContent = m.scores[S.role === "host" ? "guest" : "host"];
    $("resultTitle").textContent = win ? "完美胜出！" : "对局完成";
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
$("createRoom").onclick = () => {
  S.role = "host";
  socket();
  S.ws.onopen = () =>
    S.ws.send(
      JSON.stringify({
        type: "create",
        token: S.token,
        count: 30,
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
  const button = document.createElement("button");
  button.className = "secondary";
  button.textContent = "🏆 查看排行榜";
  const mistakes = home.querySelector(".mistake-entry");
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:10px;margin-top:12px";
  if (mistakes) {
    mistakes.style.cssText = "flex:1;margin:0;min-width:0;justify-content:center;padding:12px 8px";
    mistakes.querySelector("small")?.remove();
    mistakes.querySelector("i")?.remove();
    actions.append(mistakes);
  }
  button.style.cssText = "flex:1;margin:0;height:auto;min-height:48px;background:#e4ebff;color:#436bd1";
  actions.append(button);
  home.querySelector(".stats")?.before(actions);
  const panel = document.createElement("div");
  panel.id = "rankingPanel";
  panel.style.cssText =
    "display:none;position:fixed;inset:0;z-index:20;background:#f7f6f1;overflow:auto;padding:24px max(20px,calc((100vw - 520px)/2));color:#102038";
  panel.innerHTML =
    '<button id="closeRanking" class="back">←</button><h2 style="text-align:center">词汇排行榜</h2><p style="text-align:center;color:#718097;font-size:12px">按 PK 胜场排序</p><div id="rankRows"></div>';
  document.body.append(panel);
  button.onclick = async () => {
    const d = await api("/api/rank", {}),
      rows = $("rankRows");
    rows.innerHTML =
      (d.players || [])
        .map(
          (p) =>
            `<div style="display:flex;gap:14px;align-items:center;background:#fff;border:1px solid #e3e7ed;border-radius:14px;margin:10px 0;padding:15px"><b style="color:#5278d2">#${p.place}</b><strong style="flex:1">${p.username}</strong><small>${p.wins} 胜 / ${p.draws || 0} 平 / ${p.games} 场 · ${p.winRate}%</small></div>`,
        )
        .join("") || '<p style="text-align:center">暂无 PK 记录</p>';
    panel.style.display = "block";
  };
  $("closeRanking").onclick = () => (panel.style.display = "none");
}
installRanking();
