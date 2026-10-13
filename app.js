const $ = (x) => document.getElementById(x),
  S = {
    user: null,
    count: 30,
    qs: [],
    i: 0,
    ws: null,
    role: null,
    question: null,
    locked: false,
  };
const sh = (a) => [...a].sort(() => Math.random() - 0.5),
  say = (t) => {
    $("toast").textContent = t;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 1500);
  };
function page(x) {
  document
    .querySelectorAll(".screen")
    .forEach((e) => e.classList.remove("active"));
  $(x).classList.add("active");
}
function api(url, data) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}
function opt(q) {
  return sh([
    q.meaning,
    ...sh(S.qs.filter((x) => x.id !== q.id))
      .slice(0, 3)
      .map((x) => x.meaning),
  ]);
}
function buttons(box, choices, fn) {
  box.innerHTML = "";
  choices.forEach((x, i) => {
    let b = document.createElement("button");
    b.className = "answer";
    b.textContent = x;
    b.onclick = () => fn(b, i, x);
    box.append(b);
  });
}
async function login(register) {
  let d = await api(register ? "/api/register" : "/api/login", {
    username: $("loginName").value,
    password: $("loginPassword").value,
  });
  if (d.error) return ($("loginMessage").textContent = d.error);
  S.user = d.user;
  if ($("autoLogin").checked) localStorage.cjToken = d.user.token;
  page("home");
  home();
}
function home() {
  $("homeLevel").textContent =
    `青铜 I · Lv.${Math.floor(S.user.rank / 10) + 1}`;
  $("mistakeCount").textContent =
    JSON.parse(localStorage.cjMistakes || "[]").length + " 个待复习";
}
async function practice() {
  let d = await api("/api/practice", { token: S.user.token, count: S.count });
  if (d.error) return say(d.error);
  S.qs = d.questions;
  S.i = 0;
  page("practice");
  renderPractice();
}
function renderPractice() {
  let q = S.qs[S.i];
  $("practiceProgress").textContent = `${S.i + 1}/${S.qs.length}`;
  $("practiceWord").textContent = q.word;
  $("practicePhonetic").textContent = q.phonetic;
  S.locked = false;
  buttons($("practiceAnswers"), opt(q), (b, _i, x) => {
    if (S.locked) return;
    S.locked = true;
    if (x === q.meaning) b.classList.add("correct");
    else {
      b.classList.add("wrong");
      let m = JSON.parse(localStorage.cjMistakes || "[]");
      localStorage.cjMistakes = JSON.stringify([
        q,
        ...m.filter((a) => a.id !== q.id),
      ]);
      say("已加入错题本");
    }
    setTimeout(
      () => (++S.i < S.qs.length ? renderPractice() : (page("home"), home())),
      600,
    );
  });
  $("familiarBtn").onclick = async () => {
    await api("/api/familiar", { token: S.user.token, id: q.id });
    S.qs.splice(S.i, 1);
    S.i >= S.qs.length ? (page("home"), home()) : renderPractice();
  };
}
function review() {
  let a = JSON.parse(localStorage.cjMistakes || "[]");
  if (!a.length) {
    say("暂无错题");
    return;
  }
  page("mistakes");
  let q = a[0];
  $("mistakeWord").textContent = q.word;
  buttons($("mistakeAnswers"), opt(q), (b, _i, x) => {
    if (x === q.meaning) {
      localStorage.cjMistakes = JSON.stringify(a.slice(1));
      b.classList.add("correct");
      setTimeout(review, 400);
    } else b.classList.add("wrong");
  });
}
function modal(kind) {
  S.modal = kind;
  $("countRange").value = S.count;
  $("countValue").textContent = S.count + " 题";
  $("countModal").classList.add("show");
}
function ws() {
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
    S.count = m.count;
    page("waiting");
  } else if (m.type === "game-start") page("duel");
  else if (m.type === "question") {
    S.question = m;
    S.locked = false;
    $("duelWord").textContent = m.word;
    $("duelPhonetic").textContent = m.phonetic;
    $("duelProgress").textContent = `第 ${m.number} / ${S.count} 题`;
    $("myScore").textContent = m.scores[S.role] + " 分";
    $("opponentScore").textContent =
      m.scores[S.role === "host" ? "guest" : "host"] + " 分";
    buttons($("duelAnswers"), m.options, (b, i) => {
      if (!S.locked) {
        S.locked = true;
        S.ws.send(JSON.stringify({ type: "answer", index: i }));
      }
    });
    let t = setInterval(() => {
      let n = Math.max(0, Math.ceil((m.endsAt - Date.now()) / 1000));
      $("duelClock").textContent = n;
      if (!n) clearInterval(t);
    }, 200);
  } else if (m.type === "game-over") {
    $("finalMy").textContent = m.scores[S.role];
    $("finalOpp").textContent = m.scores[S.role === "host" ? "guest" : "host"];
    $("resultTitle").textContent =
      m.scores[S.role] > m.scores[S.role === "host" ? "guest" : "host"]
        ? "胜利！"
        : "对局完成";
    page("result");
  } else if (m.type === "count-updated") {
    S.count = m.count;
    say("题数已设为 " + S.count);
  } else if (m.type === "error") say(m.message);
}
$("loginSubmit").onclick = () => login(false);
$("registerSubmit").onclick = () => login(true);
$("startPractice").onclick = practice;
$("goLobby").onclick = () => page("lobby");
$("goMistakes").onclick = review;
$("createRoom").onclick = () => {
  S.role = "host";
  ws();
  S.ws.onopen = () =>
    S.ws.send(
      JSON.stringify({ type: "create", token: S.user.token, count: S.count }),
    );
};
$("joinRoom").onclick = () => {
  S.role = "guest";
  ws();
  S.ws.onopen = () =>
    S.ws.send(JSON.stringify({ type: "join", room: $("roomInput").value }));
};
$("practiceCount").onclick = () => modal("practice");
$("pkCount").onclick = () => modal("pk");
$("countRange").oninput = (e) =>
  ($("countValue").textContent = e.target.value + " 题");
$("saveCount").onclick = () => {
  S.count = +$("countRange").value;
  $("countModal").classList.remove("show");
  if (S.modal === "pk")
    S.ws.send(JSON.stringify({ type: "set-count", count: S.count }));
  else practice();
};
$("rematch").onclick = () => S.ws.send(JSON.stringify({ type: "rematch" }));
document
  .querySelectorAll("[data-home]")
  .forEach((b) => (b.onclick = () => page("home")));
$("copyRoom").onclick = () =>
  navigator.clipboard.writeText($("roomNumber").textContent);
api("/api/auto", { token: localStorage.cjToken }).then((d) => {
  if (d.user) {
    S.user = d.user;
    page("home");
    home();
  }
});
