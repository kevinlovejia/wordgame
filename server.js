// 词境服务：CSV 题库、账户、练习接口和服务器权威 WebSocket 对战。
const http = require("http"),
  fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const PORT = 3344,
  root = __dirname,
  CSV = path.join(root, "wordbank1600_out.csv"),
  USERS = path.join(root, "users.json"),
  LEADERBOARD = path.join(root, "leaderboard.json"),
  rooms = new Map();
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex"),
  token = () => crypto.randomBytes(24).toString("hex"),
  now = () => Date.now();
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS, "utf8"));
  } catch {
    return [];
  }
}
function writeUsers(x) {
  fs.writeFileSync(USERS, JSON.stringify(x, null, 2));
}
function readLeaderboard() {
  try {
    return JSON.parse(fs.readFileSync(LEADERBOARD, "utf8"));
  } catch {
    return {};
  }
}
function saveResult(players, scores) {
  const board = readLeaderboard();
  for (const role of ["host", "guest"]) {
    const name = players[role] || "游客";
    const row = board[name] || { username: name, games: 0, wins: 0 };
    row.games++;
    if (scores[role] > scores[role === "host" ? "guest" : "host"]) row.wins++;
    row.winRate = row.games
      ? Math.round((row.wins / row.games) * 1000) / 10
      : 0;
    board[name] = row;
  }
  fs.writeFileSync(LEADERBOARD, JSON.stringify(board, null, 2));
  return board;
}
let WORDS_CACHE = null;
function words() {
  if (WORDS_CACHE) return WORDS_CACHE;
  return (WORDS_CACHE = fs
    .readFileSync(CSV, "utf8")
    .split(/\r?\n/)
    .map((line, id) => {
      let m = line
        .trim()
        .replace(/^\*/, "")
        .match(/^(.+?)\s+([\u4e00-\u9fff].*)$/);
      return m
        ? {
            id: String(id),
            word: m[1].replace(
              /\s+(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|num\.|&\s*v\.)$/,
              "",
            ),
            meaning: m[2],
            phonetic: "",
          }
        : null;
    })
    .filter(Boolean));
}
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5),
  send = (s, o) => {
    if (!s.destroyed) {
      const d = Buffer.from(JSON.stringify(o)),
        h =
          d.length < 126
            ? Buffer.from([129, d.length])
            : Buffer.from([129, 126, d.length >> 8, d.length & 255]);
      s.write(Buffer.concat([h, d]));
    }
  };
function userByToken(t) {
  return (
    readUsers().find((u) => u.token === t) ||
    (t === "guest"
      ? { username: "游客", token: "guest", wins: 0, familiar: [] }
      : null)
  );
}
function count(v) {
  return Math.max(10, Math.min(100, Math.round((+v || 30) / 10) * 10));
}
function select(count, familiar = []) {
  let all = words(),
    seen = new Set(familiar);
  let fresh = all.filter((w) => !seen.has(w.id));
  return shuffle(fresh.length >= count ? fresh : all).slice(0, count);
}
function json(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}
function body(req) {
  return new Promise((ok, no) => {
    let b = "";
    req.on("data", (x) => (b += x));
    req.on("end", () => {
      try {
        ok(JSON.parse(b || "{}"));
      } catch {
        no();
      }
    });
  });
}
function publicUser(u) {
  return {
    username: u.username,
    rank: u.wins || 0,
    library: u.library || "wordbank1600",
    token: u.token,
    familiar: u.familiar || [],
  };
}
async function api(req, res) {
  try {
    let d = await body(req);
    if (req.url === "/api/rank") {
      const players = Object.values(readLeaderboard())
        .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
        .slice(0, 50)
        .map((u, index) => ({ ...u, place: index + 1 }));
      return json(res, 200, { players });
    }
    if (req.url === "/api/register") {
      let us = readUsers();
      if (!/^[\w\u4e00-\u9fff]{2,20}$/.test(d.username || ""))
        return json(res, 400, { error: "用户名为 2-20 位字符" });
      if ((d.password || "").length < 6)
        return json(res, 400, { error: "密码至少 6 位" });
      if (us.some((u) => u.username === d.username))
        return json(res, 409, { error: "用户名已存在" });
      let u = {
        username: d.username,
        password: hash(d.password),
        token: token(),
        wins: 0,
        library: "wordbank1600",
        familiar: [],
      };
      us.push(u);
      writeUsers(us);
      return json(res, 200, { user: publicUser(u) });
    }
    if (req.url === "/api/login") {
      let u = readUsers().find(
        (x) =>
          x.username === d.username && x.password === hash(d.password || ""),
      );
      return u
        ? json(res, 200, { user: publicUser(u) })
        : json(res, 401, { error: "用户名或密码错误" });
    }
    if (req.url === "/api/auto") {
      let u = userByToken(d.token);
      return u
        ? json(res, 200, { user: publicUser(u) })
        : json(res, 401, { error: "登录已失效" });
    }
    if (req.url === "/api/practice") {
      let u = userByToken(d.token);
      if (!u) u = { username: "游客", token: "guest", familiar: [] };
      let q = select(count(d.count), u.familiar);
      return json(res, 200, { questions: q, count: q.length });
    }
    if (req.url === "/api/familiar") {
      let us = readUsers(),
        u = us.find((x) => x.token === d.token);
      if (!u) return json(res, 200, { ok: true });
      u.familiar = [...new Set([...(u.familiar || []), String(d.id)])];
      writeUsers(us);
      return json(res, 200, { ok: true });
    }
    json(res, 404, { error: "接口不存在" });
  } catch {
    json(res, 400, { error: "请求无效" });
  }
}
function broadcast(r, m) {
  Object.values(r.players).forEach((s) => send(s, m));
}
function code() {
  let x;
  do {
    x = String((1000 + Math.random() * 9000) | 0);
  } while (rooms.has(x));
  return x;
}
function start(r) {
  r.order = select(r.count);
  r.index = 0;
  r.scores = { host: 0, guest: 0 };
  broadcast(r, { type: "game-start", count: r.count });
  ask(r);
}
function ask(r) {
  clearTimeout(r.timeout);
  let w = r.order[r.index],
    o = shuffle([
      w.meaning,
      ...shuffle(words().filter((x) => x.id !== w.id))
        .slice(0, 3)
        .map((x) => x.meaning),
    ]);
  r.current = { w, o, hit: false };
  let endsAt = now() + 12000;
  broadcast(r, {
    type: "question",
    number: r.index + 1,
    word: w.word,
    phonetic: w.phonetic,
    options: o,
    correctIndex: o.indexOf(w.meaning),
    correctAnswer: w.meaning,
    scores: r.scores,
    endsAt,
  });
  r.timeout = setTimeout(() => next(r), 12100);
}
function next(r) {
  clearTimeout(r.timeout);
  if (++r.index >= r.count) {
    saveResult(r.names, r.scores);
    return broadcast(r, { type: "game-over", scores: r.scores });
  }
  ask(r);
}
function leave(s) {
  let r = rooms.get(s.room);
  if (!r) return;
  clearTimeout(r.timeout);
  delete r.players[s.role];
  broadcast(r, { type: "opponent-left" });
  rooms.delete(s.room);
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) return api(req, res);
  let file = req.url === "/" ? "index.html" : req.url.split("?")[0];
  file = path.normalize(path.join(root, file));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (e, d) => {
    if (e) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type":
        {
          ".html": "text/html; charset=utf-8",
          ".js": "application/javascript",
          ".css": "text/css",
          ".csv": "text/csv",
        }[path.extname(file)] || "application/octet-stream",
    });
    res.end(d);
  });
});
server.on("upgrade", (req, s) => {
  if (req.url !== "/ws") return s.destroy();
  let key = req.headers["sec-websocket-key"];
  if (!key) return s.destroy();
  let a = crypto
    .createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
  s.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${a}\r\n\r\n`,
  );
  s.on("data", (b) => {
    let n = b[1] & 127,
      p = 2 + (n === 126 ? 2 : 0),
      m = b.subarray(p, p + 4),
      d = b.subarray(p + 4, p + 4 + n);
    for (let i = 0; i < d.length; i++) d[i] ^= m[i % 4];
    try {
      let x = JSON.parse(d),
        r;
      if (x.type === "create") {
        let u = userByToken(x.token);
        if (!u) return send(s, { type: "error", message: "登录已失效" });
        let c = code();
        r = { players: { host: s }, count: count(x.count), timeout: null };
        rooms.set(c, r);
        s.room = c;
        s.role = "host";
        r.names = { host: (x.username || "游客").trim().slice(0, 20) };
        send(s, { type: "room-created", room: c, count: r.count });
      } else if (x.type === "join") {
        r = rooms.get(x.room);
        if (!r) return send(s, { type: "error", message: "房间不存在" });
        if (r.players.guest)
          return send(s, { type: "error", message: "房间已满" });
        r.players.guest = s;
        s.room = x.room;
        s.role = "guest";
        r.names.guest = (x.username || "游客").trim().slice(0, 20);
        start(r);
      } else if (x.type === "answer") {
        r = rooms.get(s.room);
        if (!r || r.current.hit) return;
        r.current.hit = true;
        let good = r.current.o[x.index] === r.current.w.meaning;
        r.scores[good ? s.role : s.role === "host" ? "guest" : "host"]++;
        send(s, {
          type: "answer-result",
          correct: good,
          owner: true,
          index: x.index,
          text: good ? "有人抢答正确！" : "回答错误，对手得 1 分",
        });
        broadcast(r, { type: "answer-result", correct: good, owner: false, text: good ? "对手抢答正确！" : "对手答错，你得 1 分" });
        clearTimeout(r.timeout);
        setTimeout(() => next(r), 250);
      } else if (x.type === "set-count") {
        r = rooms.get(s.room);
        if (r && !r.players.guest) {
          r.count = count(x.count);
          send(s, { type: "count-updated", count: r.count });
        } else send(s, { type: "error", message: "对手已加入，题数已锁定" });
      } else if (x.type === "rematch") {
        r = rooms.get(s.room);
        if (r && r.players.host && r.players.guest) start(r);
      } else if (x.type === "set-name") {
        r = rooms.get(s.room);
        if (!r) return;
        const old = r.names[s.role],
          name = (x.username || "游客").trim().slice(0, 20);
        if (!name || old === name) return;
        const board = readLeaderboard(),
          row = board[old];
        if (row) {
          const target = board[name] || { username: name, games: 0, wins: 0 };
          target.games += row.games;
          target.wins += row.wins;
          target.winRate = Math.round((target.wins / target.games) * 1000) / 10;
          board[name] = target;
          delete board[old];
          fs.writeFileSync(LEADERBOARD, JSON.stringify(board, null, 2));
        }
        r.names[s.role] = name;
      }
    } catch {}
  });
  s.on("close", () => leave(s));
  s.on("error", () => leave(s));
});
server.listen(PORT, "0.0.0.0", () =>
  console.log(`词境： http://localhost:${PORT}`),
);
