import React, { useState, useRef, useEffect } from "react";
import { generate, loadModel } from "./llm.js";
import { retrieve } from "./retrieval.js";

/*
  Portuguese Civil Aviation Union — member portal prototype.
  - Login (boarding-pass styled) — any member number + password signs in (demo).
  - Menu 1: My member record (demo data).
  - Menu 2: Company Agreement assistant — answers questions about the Agreement
    using a small AI model running on-device (Transformers.js, no API/key).
*/

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

.spac-app, .spac-app * { box-sizing: border-box; }
.spac-app {
  --bg:#EEF3F8; --bg2:#FFFFFF; --surf:#F6F9FC; --surf2:#E9F0F7;
  --line:#D7E0EA; --ink:#16242F; --muted:#5E7080; --faint:#94A6B5;
  --amber:#E0991F; --amber-d:#B5790F; --cyan:#1577B8; --green:#2F9E6E; --red:#D9544B;
  font-family:'Archivo',system-ui,sans-serif;
  color:var(--ink);
  background:
    radial-gradient(1200px 600px at 80% -10%, rgba(21,119,184,.07), transparent 60%),
    radial-gradient(900px 500px at -5% 110%, rgba(224,153,31,.06), transparent 60%),
    var(--bg);
  min-height:100vh; line-height:1.5; letter-spacing:.01em;
  -webkit-font-smoothing:antialiased;
}
.mono { font-family:'Space Mono',ui-monospace,monospace; }

/* ---------- layout shell ---------- */
.shell { max-width:1040px; margin:0 auto; padding:0 20px 64px; }

/* ---------- top board ---------- */
.board {
  display:flex; align-items:center; gap:16px;
  border-bottom:1px solid var(--line);
  padding:18px 20px; margin:0 auto; max-width:1040px;
  background:linear-gradient(180deg, var(--bg2), transparent);
}
.brandmark {
  width:46px; height:46px; flex:0 0 auto;
  display:grid; place-items:center;
}
.brandmark img { width:100%; height:100%; object-fit:contain; display:block; }
.prcc-mark { height:46px; width:auto; flex:0 0 auto; display:block; }
.prcc-block { display:flex; align-items:center; gap:12px; }
.prcc-name { font-size:13px; font-weight:600; color:var(--ink); line-height:1.2; text-align:right; max-width:170px; }
.brand-txt { display:flex; flex-direction:column; gap:2px; min-width:0; }
.brand-name { font-weight:800; font-size:16px; letter-spacing:.02em; }
.brand-sub { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.18em; }
.board-spacer { flex:1; }
.board-strip {
  font-family:'Space Mono',monospace; font-size:12px; color:var(--amber);
  background:#0A1420; border:1px solid var(--line); border-radius:8px;
  padding:7px 12px; display:flex; gap:10px; align-items:center; white-space:nowrap;
}
.board-strip .dot { width:6px; height:6px; border-radius:50%; background:var(--green); box-shadow:0 0 8px var(--green); }
.logout { background:none; border:1px solid var(--line); color:var(--muted); cursor:pointer;
  padding:8px 12px; border-radius:8px; font-family:inherit; font-size:13px; }
.logout:hover { color:var(--ink); border-color:var(--faint); }

/* ---------- login ---------- */
.login-wrap { min-height:100vh; display:grid; place-items:center; padding:24px; position:relative; overflow:hidden; }
.flightpath { position:absolute; inset:0; pointer-events:none; opacity:.5; }
.pass {
  position:relative; width:100%; max-width:460px; display:flex;
  background:linear-gradient(180deg,var(--surf),var(--bg2));
  border:1px solid var(--line); border-radius:18px; overflow:hidden;
  box-shadow:0 24px 60px -28px rgba(20,40,60,.20);
}
.pass-main { flex:1; padding:34px 34px 30px; min-width:0; }
.pass-stub {
  width:180px; flex:0 0 auto; padding:28px 22px;
  background:repeating-linear-gradient(135deg, rgba(242,169,59,.06) 0 12px, transparent 12px 24px), var(--bg2);
  border-left:2px dashed var(--line); position:relative;
  display:flex; flex-direction:column; justify-content:space-between;
}
.pass-stub::before, .pass-stub::after {
  content:''; position:absolute; left:-9px; width:16px; height:16px; border-radius:50%;
  background:var(--bg); border:1px solid var(--line);
}
.pass-stub::before { top:-9px; } .pass-stub::after { bottom:-9px; }
.eyebrow { font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.22em;
  text-transform:uppercase; color:var(--amber-d); margin-bottom:10px; }
.pass h1 { margin:0 0 6px; font-size:26px; font-weight:800; letter-spacing:.01em; }
.pass p.lead { margin:0 0 24px; color:var(--muted); font-size:14px; max-width:42ch; }
.field { margin-bottom:14px; }
.field label { display:block; font-size:12px; color:var(--muted); margin-bottom:6px;
  text-transform:uppercase; letter-spacing:.12em; }
.field input {
  width:100%; background:#FFFFFF; border:1px solid var(--line); border-radius:10px;
  color:var(--ink); padding:12px 14px; font-family:inherit; font-size:15px; outline:none;
}
.field input:focus { border-color:var(--cyan); box-shadow:0 0 0 3px rgba(21,119,184,.20); }
.btn {
  font-family:inherit; cursor:pointer; border:none; border-radius:10px; font-weight:700;
  font-size:15px; padding:13px 18px; display:inline-flex; align-items:center; gap:9px;
  color:#0A1420; background:linear-gradient(180deg,#F6B956,var(--amber-d));
  box-shadow:0 8px 22px -10px rgba(242,169,59,.7); transition:transform .12s ease, filter .12s ease;
}
.btn:hover { filter:brightness(1.05); transform:translateY(-1px); }
.btn:active { transform:translateY(0); }
.btn.full { width:100%; justify-content:center; margin-top:6px; }
.hint { font-size:12px; color:var(--faint); margin-top:16px; }
.loginerr { color:var(--red); font-size:13px; margin:2px 0 10px; }
.stub-plane { color:var(--amber); }
.stub-foot { font-family:'Space Mono',monospace; font-size:11px; color:var(--muted); letter-spacing:.1em; }
.barcode { display:flex; gap:2px; height:46px; margin-top:8px; }
.barcode i { display:block; flex:1; background:var(--ink); opacity:.85; border-radius:1px; }

/* ---------- home menus ---------- */
.page-head { padding:28px 0 8px; }
.page-head .eyebrow { margin-bottom:8px; }
.page-head h2 { margin:0; font-size:30px; font-weight:800; letter-spacing:-.01em; }
.login-logo { width:72px; height:72px; object-fit:contain; display:block; margin:0 0 18px; }
.page-head .sub { color:var(--muted); margin:8px 0 0; font-size:15px; }

.menu-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:18px; margin-top:26px; }
.tile {
  text-align:left; cursor:pointer; font-family:inherit; color:var(--ink);
  background:linear-gradient(180deg,var(--surf),var(--bg2));
  border:1px solid var(--line); border-radius:16px; padding:24px;
  display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;
  transition:transform .14s ease, border-color .14s ease, box-shadow .14s ease;
}
.tile:hover { transform:translateY(-3px); border-color:var(--faint);
  box-shadow:0 24px 46px -30px rgba(20,40,60,.18); }
.tile .tag { position:absolute; top:16px; right:16px; font-family:'Space Mono',monospace;
  font-size:11px; color:var(--amber-d); letter-spacing:.12em; }
.tile .ico { width:52px; height:52px; border-radius:12px; display:grid; place-items:center;
  background:var(--surf2); border:1px solid var(--line); color:var(--cyan); }
.tile h3 { margin:0; font-size:19px; font-weight:700; }
.tile p { margin:4px 0 0; color:var(--muted); font-size:14px; }
.tile .go { margin-top:auto; display:flex; align-items:center; gap:8px; color:var(--cyan);
  font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:.1em; }

/* ---------- back + cards ---------- */
.back { background:none; border:none; color:var(--muted); cursor:pointer; font-family:inherit;
  font-size:14px; display:inline-flex; gap:7px; align-items:center; padding:6px 0; margin-top:22px; }
.back:hover { color:var(--ink); }

.member-card {
  margin-top:22px; border:1px solid var(--line); border-radius:16px; overflow:hidden;
  background:linear-gradient(180deg,var(--surf),var(--bg2));
}
.mc-head { display:flex; align-items:center; gap:18px; padding:24px 26px; border-bottom:1px solid var(--line);
  background:radial-gradient(600px 200px at 100% 0,rgba(21,119,184,.08),transparent 70%); }
.avatar { width:64px; height:64px; border-radius:50%; flex:0 0 auto; display:grid; place-items:center;
  font-weight:800; font-size:22px; color:#0A1420; background:linear-gradient(160deg,#F6B956,var(--amber-d)); }
.mc-head .who h3 { margin:0; font-size:22px; font-weight:800; }
.mc-head .who span { color:var(--muted); font-size:14px; }
.pill { display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:700;
  padding:6px 11px; border-radius:999px; letter-spacing:.04em; }
.pill.ok { color:var(--green); background:rgba(82,185,138,.12); border:1px solid rgba(82,185,138,.35); }
.mc-grid { display:grid; grid-template-columns:repeat(2,1fr); }
.mc-grid .cell { padding:18px 26px; border-top:1px solid var(--line); }
.mc-grid .cell:nth-child(odd) { border-right:1px solid var(--line); }
.cell .k { font-family:'Space Mono',monospace; font-size:11px; color:var(--muted);
  text-transform:uppercase; letter-spacing:.14em; }
.cell .v { font-size:16px; font-weight:600; margin-top:5px; }
.note { font-size:12px; color:var(--faint); margin:16px 4px 0; }
.avatar.health { background:linear-gradient(160deg,#8BDCE8,#2E8C9B); color:#06222B; }
.avatar.pay { background:linear-gradient(160deg,#F4CD80,#C9871F); color:#3A2606; }
.avatar.help { background:linear-gradient(160deg,#7FB6E8,#1577B8); color:#04243A; }
.qform { padding:22px 26px; }
.qform .row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.qform .fld { margin-bottom:16px; }
.qform label { display:block; font-size:12px; color:var(--muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:.12em; }
.qform select, .qform input, .qform textarea { width:100%; background:#FFFFFF; border:1px solid var(--line);
  border-radius:10px; color:var(--ink); padding:11px 13px; font-family:inherit; font-size:14.5px; outline:none; }
.qform textarea { resize:vertical; min-height:120px; line-height:1.5; }
.qform select:focus, .qform input:focus, .qform textarea:focus { border-color:var(--cyan); box-shadow:0 0 0 3px rgba(21,119,184,.18); }
.qerr { color:var(--red); font-size:13px; margin:0 0 14px; }
.success { padding:34px 26px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:13px; }
.success .check { width:60px; height:60px; border-radius:50%; display:grid; place-items:center;
  background:rgba(47,158,110,.12); color:var(--green); border:1px solid rgba(47,158,110,.4); }
.success h3 { margin:0; font-size:20px; }
.success p { margin:0; color:var(--muted); font-size:14px; max-width:48ch; }
.ref { font-family:'Space Mono',monospace; font-size:14px; color:var(--ink); background:var(--surf2);
  border:1px solid var(--line); border-radius:8px; padding:8px 14px; letter-spacing:.06em; }
@media (max-width:560px){ .qform .row { grid-template-columns:1fr; } }
.mc-section { padding:13px 26px; border-top:1px solid var(--line); background:var(--surf2);
  font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--cyan); }
.refchip { font-family:'Space Mono',monospace; font-size:10px; color:var(--muted);
  margin-left:8px; border:1px solid var(--line); border-radius:6px; padding:1px 6px; vertical-align:middle; }

/* ---------- chat ---------- */
.chat-card { margin-top:22px; border:1px solid var(--line); border-radius:16px; overflow:hidden;
  background:var(--bg2); display:flex; flex-direction:column; height:min(72vh,640px); }
.chat-top { padding:16px 20px; border-bottom:1px solid var(--line); display:flex; align-items:center;
  gap:12px; background:linear-gradient(180deg,var(--surf),transparent); }
.chat-top .doc { font-size:13px; color:var(--muted); display:flex; align-items:center; gap:8px; min-width:0; }
.chat-top .doc b { color:var(--ink); font-weight:600; max-width:46ch; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.chat-top .swap { margin-left:auto; background:none; border:1px solid var(--line); color:var(--muted);
  border-radius:8px; padding:7px 11px; cursor:pointer; font-family:inherit; font-size:12px; }
.chat-top .swap:hover { color:var(--ink); border-color:var(--faint); }
.modelchip { margin-left:auto; font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.02em;
  border:1px solid var(--line); border-radius:999px; padding:5px 10px; white-space:nowrap; }
.modelchip.loading { color:var(--amber-d); border-color:var(--amber); background:rgba(224,153,31,.08); }
.modelchip.ready { color:var(--green); border-color:var(--green); background:rgba(47,158,110,.08); }
.modelchip.error { color:var(--red); border-color:var(--red); background:rgba(217,84,75,.08); }
.keybar { display:flex; align-items:center; gap:12px; padding:12px 20px; border-bottom:1px solid var(--line); background:var(--surf); }
.modelbar { flex:0 0 120px; height:6px; border-radius:999px; background:var(--surf2); overflow:hidden; }
.modelbar span { display:block; height:100%; background:var(--amber); transition:width .3s ease; }
.keyhint { font-size:11px; color:var(--muted); line-height:1.4; }

.drop { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; padding:40px; gap:14px; }
.drop .ring { width:72px; height:72px; border-radius:16px; display:grid; place-items:center;
  border:1.5px dashed var(--faint); color:var(--amber); }
.drop h3 { margin:0; font-size:19px; }
.drop p { margin:0; color:var(--muted); font-size:14px; max-width:44ch; }
.dropzone { width:100%; max-width:420px; border:1.5px dashed var(--line); border-radius:14px;
  padding:26px; cursor:pointer; transition:border-color .12s, background .12s; background:var(--surf); }
.dropzone:hover, .dropzone.over { border-color:var(--cyan); background:rgba(21,119,184,.06); }

.stream { flex:1; overflow-y:auto; padding:22px; display:flex; flex-direction:column; gap:16px; }
.msg { display:flex; gap:10px; max-width:88%; }
.msg.user { align-self:flex-end; flex-direction:row-reverse; }
.bubble { padding:13px 15px; border-radius:14px; font-size:14.5px; white-space:pre-wrap; word-wrap:break-word; }
.msg.bot .bubble { background:var(--surf); border:1px solid var(--line); border-top-left-radius:4px; }
.msg.user .bubble { background:linear-gradient(180deg,rgba(21,119,184,.12),rgba(21,119,184,.06));
  border:1px solid rgba(21,119,184,.30); border-top-right-radius:4px; }
.mini { width:30px; height:30px; border-radius:8px; flex:0 0 auto; display:grid; place-items:center; font-size:12px; }
.mini.bot { background:var(--surf2); border:1px solid var(--line); color:var(--cyan); }
.mini.user { background:rgba(21,119,184,.14); color:var(--cyan); font-family:'Space Mono',monospace; font-weight:700; }
.typing { display:inline-flex; gap:5px; align-items:center; }
.typing i { width:7px; height:7px; border-radius:50%; background:var(--muted); animation:blink 1.2s infinite; }
.typing i:nth-child(2){ animation-delay:.2s; } .typing i:nth-child(3){ animation-delay:.4s; }
@keyframes blink { 0%,80%,100%{opacity:.25; transform:translateY(0);} 40%{opacity:1; transform:translateY(-3px);} }

.chips { display:flex; flex-wrap:wrap; gap:8px; padding:0 22px 14px; }
.chip { background:#FFFFFF; border:1px solid var(--line); color:var(--muted); cursor:pointer;
  font-family:inherit; font-size:12.5px; padding:8px 12px; border-radius:999px; }
.chip:hover { color:var(--ink); border-color:var(--cyan); }

.composer { display:flex; gap:10px; padding:14px 16px; border-top:1px solid var(--line); background:var(--bg); }
.composer textarea { flex:1; resize:none; background:#FFFFFF; border:1px solid var(--line); border-radius:12px;
  color:var(--ink); padding:12px 14px; font-family:inherit; font-size:14.5px; outline:none; max-height:120px; }
.composer textarea:focus { border-color:var(--cyan); box-shadow:0 0 0 3px rgba(21,119,184,.18); }
.send { border:none; border-radius:12px; cursor:pointer; padding:0 16px; color:#0A1420;
  background:linear-gradient(180deg,#F6B956,var(--amber-d)); display:grid; place-items:center; }
.send:disabled { opacity:.4; cursor:not-allowed; }
.errline { color:var(--red); font-size:13px; padding:0 22px 12px; }

@media (max-width:720px) {
  .pass { flex-direction:column; } .pass-stub { width:auto; border-left:none; border-top:2px dashed var(--line); flex-direction:row; align-items:center; }
  .pass-stub::before { top:-9px; left:auto; right:30%; } .pass-stub::after { bottom:auto; top:-9px; left:30%; }
  .menu-grid { grid-template-columns:1fr; }
  .mc-grid { grid-template-columns:1fr; }
  .mc-grid .cell:nth-child(odd) { border-right:none; }
  .board-strip { display:none; } .prcc-mark { height:40px; } .prcc-name { display:none; }
}
@media (prefers-reduced-motion: reduce) {
  .tile, .btn { transition:none; } .typing i { animation:none; }
}
`;

/* ---------- icons ---------- */
const SPAC_LOGO = "data:image/png;base64,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";
const PRCC_LOGO = "data:image/png;base64,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";

const I = {
  plane: (p) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2 3.4 7.6 9 11l-2 3H4l-1 2 4 1 1 4 2-1v-3l3-2 3.4 5.6 1.4-1.4Z"/></svg>),
  id: (p) => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.3"/><path d="M5.5 16.5c.6-1.6 2-2.2 3.5-2.2s2.9.6 3.5 2.2"/><path d="M15 9h4M15 12h4M15 15h2.5"/></svg>),
  chat: (p) => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z"/><path d="M8.5 11h7M8.5 14h4"/></svg>),
  help: (p) => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/><path d="M5.1 5.1 8.5 8.5M15.5 15.5l3.4 3.4M18.9 5.1 15.5 8.5M8.5 15.5l-3.4 3.4"/></svg>),
  check: (p) => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5"/></svg>),
  pay: (p) => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M15.5 9.3a4 4 0 1 0 0 5.4"/><path d="M7.6 11.2h6M7.6 13h5"/></svg>),
  health: (p) => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 5 6v5c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-3Z"/><path d="M12 8.5v5M9.5 11h5"/></svg>),
  doc: (p) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 16h4"/></svg>),
  upload: (p) => (<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>),
  send: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/></svg>),
  arrow: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 18-6-6 6-6"/></svg>),
  next: (p) => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 18 6-6-6-6"/></svg>),
};

const SYSTEM_PROMPT = `You are the assistant of SPAC (Sindicato dos Pilotos da Aviacao Civil). The user is a member pilot with questions about the Ryanair / SPAC Portugal Collective Labour Agreement (CLA, Apr 2019 - Mar 2027), whose PDF is provided to you.
Rules:
- Answer ONLY based on the content of the provided CLA PDF.
- Whenever possible, cite the section number (e.g. "section 6.3 Annual leave") or table where the information appears.
- Figures are gross unless the document states otherwise; reproduce amounts and dates exactly as written.
- If the answer is not in the document, say clearly that you could not find it in the CLA and suggest contacting the union.
- Answer in clear, concise English.
- Do not invent figures, deadlines or conditions that are not in the document.`;

const CLA_TEXT = `RYANAIR / SPAC — Portugal-Based Pilots — Collective Labour Agreement (Consolidated Reference Document), April 2019 – March 2027.
Consolidates: CLA Apr 2019, COVID Emergency Jul 2020, Addendum May 2022, Appendix Jul 2023, Addendum May 2024.
Covers directly employed Ryanair pilots based at Portuguese bases (Faro, Lisbon, Porto, Ponta Delgada) from 1 Apr 2019 to 31 Mar 2027. Governed by Portuguese law. All figures gross unless otherwise stated.

1. DEFINITIONS
- Pilot: directly employed Ryanair pilot home-based at any current/future Ryanair base in Portugal.
- Basic Pay: gross basic annual salary, paid monthly in 14 equal instalments (incl. Annual Leave and Christmas Allowances from May 2019).
- Sector Pay (SBH): productivity payment (incl. meal allowance) per Scheduled Block Hour actually flown, paid monthly in arrears.
- Captain (CPT): pilot appointed by the Ryanair Chief Pilot as Commander.
- First Officer (FO): 1,500+ flying hours (CS 25) at required standard.
- Junior First Officer (JFO): 500–1,499 flying hours.
- Second Officer (SO): fewer than 500 flying hours.
- SBH: Scheduled Block Hours flown.
- WOFF: Working Day Off — a day a pilot commences a duty operating commercial flights at the company's request on a rostered day off.
- SPAC: Sindicato dos Pilotos da Aviação Civil (the pilot union).
- PRCC: Pilot Representative Company Council.

2. SCOPE & GOVERNANCE
Coverage: all directly employed Ryanair pilots home-based in Portugal (excl. Base Captains / management pilots). Covers all aircraft types incl. Boeing 737-800, MAX-200 and any future type. Governed by Portuguese law; Portuguese Courts have jurisdiction.
Agreement timeline:
- CLA 2019: 1 Apr 2019 – 31 Mar 2023 (extended to 31 Mar 2026 by the COVID agreement; superseded by the May 2022 Addendum through 31 Mar 2027). Base agreement: pay, rostering, Portuguese-law adoption.
- COVID Emergency: 1 Jul 2020 – 1 Jul 2024. 20% pay cut + graduated restoration to protect jobs.
- Addendum May 2022: 1 May 2022 – 31 Mar 2027. Accelerated restoration, new CPT pay scale, pay increases.
- Appendix Jul 2023: Jul 2023 – 31 Mar 2027. Extraordinary increase (gap-year fix), enhanced LTC bonus.
- Addendum May 2024: 1 May 2024 – 31 Mar 2027. SBH increases, higher allowances, updated FO basic.
New CLA negotiations start at least 6 months before expiry, i.e. by 1 October 2026.

3. PAY STRUCTURE
3.1 Captain pay scale — effective 1 May 2024 (indicative totals at 850 SBH). Progression on 1 April each year after at least 6 months at the current scale point. Annual leave = 29 days at €165/day. CPTs previously on base-specific pay join Year 6 from 1 Apr 2024.
(columns: Scale point | Basic pay | Pilot allowance | Sector pay at 850h | Annual leave | Total annual gross)
- Year 1: €97,500 | €8,000 | €36.00/SBH | €4,785 | €140,885
- Year 2: €99,500 | €8,000 | €37.00/SBH | €4,785 | €143,735
- Year 3: €102,500 | €8,000 | €38.00/SBH | €4,785 | €147,585
- Year 4: €104,500 | €8,000 | €39.00/SBH | €4,785 | €150,435
- Year 5: €105,500 | €8,000 | €39.00/SBH | €4,785 | €151,435
- Year 6: €106,500 | €8,000 | €42.08/SBH | €4,785 | €155,053
- Year 7: €107,500 | €8,000 | €45.08/SBH | €4,785 | €158,603
- Year 8: €108,500 | €8,000 | €46.08/SBH | €4,785 | €160,453

3.2 Co-pilot pay — effective 1 May 2024 (indicative totals at 850 SBH). Annual leave: SO 29d at €72/day; FO/JFO 29d at €162/day.
(columns: Effective | Rank | Basic pay | Annual leave 29d | Pilot allowance | SBH rate | Total annual gross)
- May 2024 SO: €36,000 | €2,088 | €7,500 | €10.25 | €54,301
- May 2024 JFO: €48,000 | €4,698 | €7,500 | €18.50 | €75,923
- May 2024 FO: €51,925 | €4,698 | €7,500 | €20.82 | €81,820
- Apr 2025 SO: €36,000 | €2,088 | €7,500 | €10.75 | €54,726
- Apr 2025 JFO: €48,000 | €4,698 | €7,500 | €19.00 | €76,348
- Apr 2025 FO: €53,100 | €4,698 | €7,500 | €21.32 | €83,420
- Apr 2026 SO: €36,000 | €2,088 | €7,500 | €10.75 | €54,726
- Apr 2026 JFO: €48,000 | €4,698 | €7,500 | €19.00 | €76,348
- Apr 2026 FO: €54,700 | €4,698 | €7,500 | €21.32 | €85,020

3.3 Rank progression rules: SO→JFO from the 1st day of the month following 500 Ryanair SBH; JFO→FO following 1,500 Ryanair SBH; FO→FO2/FO3 on 1 April annually with at least 6 months at the current point; CPT progression on 1 April annually after 6-month probation or command-upgrade trial; no scale-point increases after CLA expiry (31 Mar 2027) unless a new CLA is agreed.
3.4 Basic pay includes: premium for pre- and post-flight reporting; delays and working weekends / public holidays; Annual Leave and Christmas Allowances (paid as 14th-month salary in May and December each year).

4. ALLOWANCES & OTHER PAYMENTS
4.1 Annual pilot allowance (gross p.a.) from 1 May 2024 (Captain / Co-pilot):
- Loss of licence: €2,000 / €1,750
- Health insurance: €1,500 / €1,250
- Simulator (SIM): €1,250 / €1,250
- Car parking: €1,000 / €1,000
- Medical: €1,000 / €1,000
- Uniform / IDs: €750 / €750
- Phone: €300 / €300
- Water: €200 / €200
- TOTAL: €8,000 / €7,500. Not subject to Covid reduction/restoration. Paid in equal monthly instalments.
4.2 WOFF, Annual Leave daily pay & Per diem (from 1 May 2024):
- Working Day Off (WOFF, gross/day): CPT €900; FO/JFO €450; SO €250.
- Annual Leave daily pay (gross/day): CPT €165; FO/JFO €162; SO €72.
- Per diem (overnight out of base, net at Irish tax): €75 for all ranks.
4.3 Training allowances (gross p.a., unchanged from 2019): SFI €6,000; LCC €5,000; LTC (incl. LCC) €14,000; TRI €5,000; TRE €6,500. Pilots with multiple active qualifications receive each applicable allowance; paid pro-rata for designated training months; max 3 non-training months/year. Daily SIM rates: SFI €187.50/session; TRI €290/session; TRE €290/session.
4.4 LTC enhanced bonus scheme (from Jul 2023, extended to 31 Mar 2025): replaces the previous scheme (entry at 275 training sectors, cap €3,000 p.a.); lower entry point; maximum annual cap no less than €4,500 gross p.a.; details communicated to PRCC before implementation.
4.5 Sickness benefit (discretionary, from Jun 2022): pilots with 12+ months' service receive full fixed pay for up to 6 days certified sickness absence per year (Apr–Mar). Non-contractual; conditional on full adherence to absence-reporting procedures.

5. PENSION
- Matching employer contributions: up to €8,000 p.a. for Captains and €3,000 p.a. for First Officers (when fully restored).
- Total annual pension (employer + employee): CPT €16,000 p.a. / FO €6,000 p.a.
- A new Portuguese Pension Scheme is being established, retaining the same maximum matching employer contribution levels.
- Continued contribution to the Irish Willis scheme and transfer of existing contributions to Portugal is subject to Willis scheme rules and applicable legal/tax limits.

6. ROSTERING
6.1 5/4 roster pattern: fixed cycle of 5 days early shift / 4 days off / 5 days late shift / 4 days off. Delivers 191 planned days off p.a. (58 days above the contractual 5/2 baseline). Maintained for the full agreement (to 31 Mar 2027); reverts to 5/3 on CLA expiry unless a new agreement is reached. Crewing ratio no more than 5.4 crews per aircraft (based on 850 hrs/pilot).
6.2 Roster rules: draft rosters issued each Friday for the 4 weeks commencing the Monday 3 days later; final roster issued Friday for the week commencing the Monday 3 days later; draft days off (published 4 weeks ahead) are guaranteed; roster changes that increase sectors only early-to-early or late-to-late (compulsory, can be same-day); pilots may refuse any change moving them early↔late on the same day; no pilot rostered for flying duties more than 5 consecutive days; pilots may swap a flight duty to standby but not to standby before/after days off; aviation medicals arranged in the pilot's own time; if FTL limits are reached: annual leave first, then training, then time off (N/A); 13-hour flight duty period before discretion per Air Ops Subpart FTL; no planned night flying.
6.3 Annual leave: rotating-seniority annual-leave system from Jan 2021; annual-leave days in excess of 20 and public holidays beyond 9 are allocated on roster days off within the 5/4 pattern; off days in excess of the 5/2 baseline also count as annual leave to meet the minimum 22-day standard.
6.4 Out-of-base duties: assigned by the rostering department in Dublin; triggers €75 net per diem per night plus suitable hotel accommodation; Ryanair/API books and confirms the hotel to the pilot's electronic flight bag; reasonable taxi/mileage expenses claimable where no shuttle is available (must be pre-approved); per diem applies to out-of-base assignments (confirmed Jul 2023 appendix).
6.5 Productivity safeguards: if individual productivity falls below 850 hrs/year due to extended/frequent absences, recovery on a 5/3 basis the following quarter; command and non-recurrent training rostered on 5/2 or as necessary; force-majeure rostering provisions from the existing CLA continue.

7. OTHER BENEFITS
7.1 Death-in-service: insurance cover equivalent to twice the annual basic salary on death during employment.
7.2 Legal protection: quick access to expert legal advice (up to €150,000) for civil and military statutory enquiries related to Ryanair duties; not available to any pilot with active claims against Ryanair; Ryanair retains absolute discretion over the provision.
7.3 Part-time / shared rosters: facilitated with proportionate pay and benefits, subject to Portuguese labour law and fitting within the 5/4 roster.
7.4 Secondary employment: Ryanair will consider requests for secondary employment and will not unreasonably refuse, provided there is no conflict of interest and no effect on the pilot's ability to operate within EASA FTLs.

8. INDUSTRIAL RELATIONS & SOCIAL PEACE: both parties negotiated in good faith and will not act to undermine or modify this CLA during its term; no unilateral industrial action (incl. secondary picketing or strike) on covered matters during the term while terms are honoured; the CLA pay improvements are the only cost increases for its duration — if an employee claims additional payments not covered by the CLA, the CLA payments are reduced by that amount; internal dispute resolution is the primary mechanism; if a further reduction of the Portugal flying schedule is required, Ryanair and SPAC consult to minimise job losses in full compliance with Portuguese law.

9. HISTORICAL PAY CONTEXT & KEY MILESTONES (indicative totals at 850 SBH, OPO base; CPT total / FO total annual gross):
- 1 Apr 2019 — CLA base rates: €140,593 / €73,490
- 1 Jul 2020 — COVID 20% pay cut: €113,674 / €59,892
- 1 Jul 2022 — COVID restoration +6%: €121,750 / €63,971
- 1 May 2022 — Addendum +10% restoration: €128,630 / €66,551
- 1 Apr 2023 — Full restoration to Mar 2020 levels: €140,593 / €73,490
- 1 Jul 2023 — Appendix extraordinary increase: €144,593 / €76,290
- 1 May 2024 — Addendum SBH & allowance uplifts (Yr1 CPT / FO): €140,885 / €81,820
- 1 Apr 2025 — Annual scale move + FO basic increase: €143,735 / €83,420
- 1 Apr 2026 — Annual scale move + FO basic increase: €147,585 / €85,020
Note: this is a consolidated reference summary, not a legally binding instrument; original signed agreements prevail; figures gross unless stated; pension not included in the totals.`;

const CLA_DOC = {
  name: "Ryanair / SPAC Portugal Pilots CLA",
  desc: "Apr 2019 – Mar 2027 · consolidated",
};

const SUGGESTIONS = [
  "How many annual leave days do pilots get?",
  "What is the WOFF pay for a Captain?",
  "Explain the 5/4 roster pattern.",
  "What is the per diem for out-of-base overnights?",
];

export default function App() {
  const [view, setView] = useState("login"); // login | home | member | chat
  const [num, setNum] = useState("");
  const [pwd, setPwd] = useState("");
  const [member, setMember] = useState(null);
  const [authErr, setAuthErr] = useState("");

  function login() {
    if (num.trim().toLowerCase() !== "spac test" || pwd !== "prccrules") {
      setAuthErr("Incorrect username or password.");
      return;
    }
    setAuthErr("");
    setMember({
      name: "Ana Sofia Carvalho",
      number: "04821",
      status: "Full member",
      role: "Captain (CPT)",
      scaleYear: 8,
      employer: "Ryanair DAC",
      base: "Lisbon (LIS)",
      since: "14 March 2016",
      dues: "€15.00 / month — direct debit",
      duesStatus: "Up to date",
      rep: "Rui Tavares",
      email: "ana.carvalho@example.pt",
      phone: "+351 9XX XXX XXX",
      meeting: "27 June 2026 · 14:30",
    });
    setView("home");
  }

  return (
    <div className="spac-app">
      <style>{STYLES}</style>
      {view === "login" ? (
        <Login num={num} setNum={setNum} pwd={pwd} setPwd={setPwd} onLogin={login} authErr={authErr} clearErr={() => setAuthErr("")} />
      ) : (
        <>
          <Board member={member} onLogout={() => { setView("login"); setNum(""); setPwd(""); setAuthErr(""); }} />
          <div className="shell">
            {view === "home" && <Home onPick={setView} />}
            {view === "member" && <Member member={member} onBack={() => setView("home")} />}
            {view === "health" && <Health member={member} onBack={() => setView("home")} />}
            {view === "contract" && <Contract member={member} onBack={() => setView("home")} />}
            {view === "query" && <Query member={member} onBack={() => setView("home")} />}
            {view === "chat" && <Chat onBack={() => setView("home")} memberNum={member?.number} />}
          </div>
        </>
      )}
    </div>
  );
}

function Login({ num, setNum, pwd, setPwd, onLogin, authErr, clearErr }) {
  const submit = (e) => { e.preventDefault?.(); onLogin(); };
  return (
    <div className="login-wrap">
      <svg className="flightpath" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice">
        <path d="M-50 600 C 250 520, 450 360, 1050 120" fill="none" stroke="#BFD2E2" strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round"/>
        <circle cx="760" cy="218" r="3" fill="#E0991F"/>
      </svg>
      <div className="pass">
        <div className="pass-main">
          <img className="login-logo" src={SPAC_LOGO} alt="Sindicato dos Pilotos da Aviacao Civil" />
          <div className="eyebrow">Member portal</div>
          <h1>Portuguese Civil Aviation Union</h1>
          <p className="lead">Access your member record and the Company Agreement assistant. Sign in to continue.</p>
          <div className="field">
            <label htmlFor="num">Username</label>
            <input id="num" placeholder="username" autoCapitalize="none" autoCorrect="off" value={num}
              onChange={(e) => { setNum(e.target.value); clearErr(); }} onKeyDown={(e) => e.key === "Enter" && submit(e)} />
          </div>
          <div className="field">
            <label htmlFor="pwd">Password</label>
            <input id="pwd" type="password" placeholder="••••••••" value={pwd}
              onChange={(e) => { setPwd(e.target.value); clearErr(); }} onKeyDown={(e) => e.key === "Enter" && submit(e)} />
          </div>
          {authErr && <p className="loginerr">{authErr}</p>}
          <button className="btn full" onClick={onLogin} type="button">Sign in {I.next()}</button>
          <p className="hint">For authorised SPAC members.</p>
        </div>
      </div>
    </div>
  );
}

function Board({ onLogout }) {
  return (
    <div className="board">
      <div className="brandmark"><img src={SPAC_LOGO} alt="SPAC" /></div>
      <div className="brand-txt">
        <div className="brand-name">Sindicato dos Pilotos de Aviação Civil</div>
        <div className="brand-sub">Member portal</div>
      </div>
      <div className="board-spacer" />
      <div className="prcc-block">
        <span className="prcc-name">Portuguese Ryanair Company Council</span>
        <img className="prcc-mark" src={PRCC_LOGO} alt="Portuguese Ryanair Company Council" />
      </div>
      <button className="logout" onClick={onLogout}>Sign out</button>
    </div>
  );
}

function Home({ onPick }) {
  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Welcome aboard</div>
        <h2>How can we help?</h2>
        <p className="sub">Choose one of the available services.</p>
      </div>
      <div className="menu-grid">
        <button className="tile" onClick={() => onPick("member")}>
          <span className="tag mono">01</span>
          <span className="ico">{I.id()}</span>
          <div><h3>My member record</h3><p>Personal details, role, status and dues situation.</p></div>
          <span className="go">Open record {I.next()}</span>
        </button>
        <button className="tile" onClick={() => onPick("chat")}>
          <span className="tag mono">02</span>
          <span className="ico">{I.chat()}</span>
          <div><h3>Company Agreement assistant</h3><p>Use the assistant to answer your questions about the CLA.</p></div>
          <span className="go">Open assistant {I.next()}</span>
        </button>
        <button className="tile" onClick={() => onPick("health")}>
          <span className="tag mono">03</span>
          <span className="ico">{I.health()}</span>
          <div><h3>SPAC health insurance</h3><p>Your SPAC health plan, cover and claims contact.</p></div>
          <span className="go">Open cover {I.next()}</span>
        </button>
        <button className="tile" onClick={() => onPick("contract")}>
          <span className="tag mono">04</span>
          <span className="ico">{I.pay()}</span>
          <div><h3>My contract & pay</h3><p>Salary, payments, allowances and leave for your rank.</p></div>
          <span className="go">Open conditions {I.next()}</span>
        </button>
        <button className="tile" onClick={() => onPick("query")}>
          <span className="tag mono">05</span>
          <span className="ico">{I.help()}</span>
          <div><h3>Contact a representative</h3><p>Open a query to get help from your union reps with an issue.</p></div>
          <span className="go">Open a query {I.next()}</span>
        </button>
      </div>
    </>
  );
}

function Member({ member, onBack }) {
  const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const rows = [
    ["Member number", member.number],
    ["Status", member.status],
    ["Role", member.role],
    ["Employer", member.employer],
    ["Home base", member.base],
    ["Member since", member.since],
    ["Dues", member.dues],
    ["Union representative", member.rep],
    ["Email", member.email],
    ["Mobile", member.phone],
    ["Next general meeting", member.meeting],
  ];
  return (
    <>
      <button className="back" onClick={onBack}>{I.arrow()} Back</button>
      <div className="member-card">
        <div className="mc-head">
          <div className="avatar">{initials}</div>
          <div className="who" style={{ flex: 1 }}>
            <h3>{member.name}</h3>
            <span>Member no. {member.number} · {member.role}</span>
          </div>
          <span className="pill ok">● Dues {member.duesStatus.toLowerCase()}</span>
        </div>
        <div className="mc-grid">
          {rows.map(([k, v]) => (
            <div className="cell" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
          ))}
        </div>
      </div>
      <p className="note">Demo data. In a real portal these fields would load from the union's member database.</p>
    </>
  );
}

function Health({ member, onBack }) {
  const plan = [
    ["Policy number", "SPAC-H-" + member.number],
    ["Plan", "SPAC Health — Crew Plan"],
    ["Status", "Active"],
    ["Dependants covered", "2 (spouse + 1 child)"],
    ["Outpatient cover", "90% (€60 annual excess)"],
    ["Hospitalisation", "100% — network hospitals"],
    ["Dental", "70% up to €500 / year"],
    ["Renewal date", "31 March 2027"],
    ["Claims & support", "saude@spac.pt · +351 21 000 0000"],
  ];
  return (
    <>
      <button className="back" onClick={onBack}>{I.arrow()} Back</button>
      <div className="member-card">
        <div className="mc-head">
          <div className="avatar health">{I.health()}</div>
          <div className="who" style={{ flex: 1 }}>
            <h3>SPAC health insurance</h3>
            <span>{member.name} · Member no. {member.number}</span>
          </div>
          <span className="pill ok">● Cover active</span>
        </div>
        <div className="mc-section">Your SPAC plan</div>
        <div className="mc-grid">
          {plan.map(([k, v]) => (
            <div className="cell" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
          ))}
        </div>
      </div>
      <p className="note">Plan details are demonstration data. For questions about what is covered, ask the Company Agreement assistant.</p>
    </>
  );
}

function Contract({ member, onBack }) {
  const isCaptain = /captain|cpt/i.test(member.role);
  const allowTotal = isCaptain ? "€8,000" : "€7,500";
  const cptScale = {
    1: ["€97,500", "€36.00", "€140,885"],
    2: ["€99,500", "€37.00", "€143,735"],
    3: ["€102,500", "€38.00", "€147,585"],
    4: ["€104,500", "€39.00", "€150,435"],
    5: ["€105,500", "€39.00", "€151,435"],
    6: ["€106,500", "€42.08", "€155,053"],
    7: ["€107,500", "€45.08", "€158,603"],
    8: ["€108,500", "€46.08", "€160,453"],
  };
  const yr = member.scaleYear || 1;
  const [cptBasic, cptSbh, cptTotal] = cptScale[yr] || cptScale[1];
  const payTitle = isCaptain
    ? "Pay — current rates (scale Year " + yr + ")"
    : "Pay — current rates (effective Apr 2026)";

  const pay = isCaptain
    ? [
        ["Basic pay (scale Year " + yr + ")", cptBasic, "CLA 3.1"],
        ["Pilot allowance", "€8,000", "CLA 4.1"],
        ["Sector pay (SBH)", cptSbh + " / block hour", "CLA 3.1"],
        ["Annual leave pay", "€4,785 (29 days × €165)", "CLA 3.1"],
        ["Total annual gross*", cptTotal, "CLA 3.1"],
      ]
    : [
        ["Basic pay", "€54,700", "CLA 3.2"],
        ["Pilot allowance", "€7,500", "CLA 4.1"],
        ["Sector pay (SBH)", "€21.32 / block hour", "CLA 3.2"],
        ["Annual leave pay", "€4,698 (29 days × €162)", "CLA 3.2"],
        ["Total annual gross*", "€85,020", "CLA 3.2"],
      ];

  const other = [
    ["Working day off (WOFF)", isCaptain ? "€900 / day" : "€450 / day", "CLA 4.2"],
    ["Annual leave daily pay", isCaptain ? "€165 / day" : "€162 / day", "CLA 4.2"],
    ["Per diem (out-of-base night)", "€75 / night (net)", "CLA 4.2"],
    ["Sickness benefit", "Up to 6 days full pay / year", "CLA 4.5"],
    ["Pension (employer match)", isCaptain ? "Up to €8,000 / year" : "Up to €3,000 / year", "CLA 5"],
    ["Death-in-service", "2× annual basic salary", "CLA 7.1"],
    ["Legal protection", "Up to €150,000", "CLA 7.2"],
  ];

  const leave = [
    ["Annual leave", "29 days / year", "CLA 3"],
    ["Minimum leave standard", "22 days / year", "CLA 6.3"],
    ["Roster pattern", "5/4 — 5 early · 4 off · 5 late · 4 off", "CLA 6.1"],
    ["Planned days off", "191 / year", "CLA 6.1"],
    ["Leave allocation", "Rotating seniority (from Jan 2021)", "CLA 6.3"],
  ];

  const allowance = [
    ["Loss of licence", isCaptain ? "€2,000" : "€1,750"],
    ["Health insurance", isCaptain ? "€1,500" : "€1,250"],
    ["Simulator (SIM)", "€1,250"],
    ["Car parking", "€1,000"],
    ["Medical", "€1,000"],
    ["Uniform / IDs", "€750"],
    ["Phone", "€300"],
    ["Water", "€200"],
  ];

  const section = (title, rows, refs) => (
    <React.Fragment key={title}>
      <div className="mc-section">{title}</div>
      <div className="mc-grid">
        {rows.map((r) => (
          <div className="cell" key={r[0]}>
            <div className="k">{r[0]}</div>
            <div className="v">{r[1]}{refs && r[2] ? <span className="refchip">{r[2]}</span> : null}</div>
          </div>
        ))}
      </div>
    </React.Fragment>
  );

  return (
    <>
      <button className="back" onClick={onBack}>{I.arrow()} Back</button>
      <div className="member-card">
        <div className="mc-head">
          <div className="avatar pay">{I.pay()}</div>
          <div className="who" style={{ flex: 1 }}>
            <h3>My contract & pay</h3>
            <span>{member.name} · {member.role}</span>
          </div>
          <span className="pill ok">● {member.role.replace(/\s*\(.*\)/, "")}</span>
        </div>
        {section(payTitle, pay, true)}
        {section("Allowances & other payments", other, true)}
        {section("Annual leave & roster", leave, true)}
        {section("Pilot allowance breakdown (" + allowTotal + " / year)", allowance, false)}
      </div>
      <p className="note">Figures reflect your current rank under the Ryanair / SPAC Portugal CLA (Apr 2019 – Mar 2027). Totals marked * are indicative at 850 scheduled block hours; all figures gross unless stated. References (e.g. CLA 4.2) point to the agreement section. For details, ask the Company Agreement assistant.</p>
    </>
  );
}

function Query({ member, onBack }) {
  const [topic, setTopic] = useState("Pay & allowances");
  const [priority, setPriority] = useState("Normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("Email");
  const [err, setErr] = useState("");
  const [ref, setRef] = useState("");

  function submit() {
    if (!subject.trim() || !message.trim()) { setErr("Please add a subject and describe your issue."); return; }
    setErr("");
    setRef("SPAC-Q-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000));
  }
  function reset() {
    setRef(""); setSubject(""); setMessage("");
    setTopic("Pay & allowances"); setPriority("Normal"); setContact("Email"); setErr("");
  }

  return (
    <>
      <button className="back" onClick={onBack}>{I.arrow()} Back</button>
      <div className="member-card">
        <div className="mc-head">
          <div className="avatar help">{I.help()}</div>
          <div className="who" style={{ flex: 1 }}>
            <h3>Contact a representative</h3>
            <span>Your rep: {member.rep} · {member.base}</span>
          </div>
          <span className="pill ok">● Support</span>
        </div>

        {ref ? (
          <div className="success">
            <div className="check">{I.check()}</div>
            <h3>Query sent</h3>
            <p>Your query has been sent to {member.rep}. A representative will reply by {contact === "Phone" ? "phone" : "email"}, usually within 2 working days{priority === "Urgent" ? " — marked urgent" : ""}.</p>
            <div className="ref">{ref}</div>
            <button className="btn" onClick={reset}>New query</button>
          </div>
        ) : (
          <div className="qform">
            {err && <p className="qerr">{err}</p>}
            <div className="row">
              <div className="fld">
                <label>Topic</label>
                <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                  <option>Pay & allowances</option>
                  <option>Roster & duties</option>
                  <option>Annual leave</option>
                  <option>Health insurance</option>
                  <option>Disciplinary or legal</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="fld">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option>Normal</option>
                  <option>Urgent</option>
                </select>
              </div>
            </div>
            <div className="fld">
              <label>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary of your issue" />
            </div>
            <div className="fld">
              <label>Describe your issue</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Give as much detail as you can…" />
            </div>
            <div className="fld">
              <label>Preferred reply</label>
              <select value={contact} onChange={(e) => setContact(e.target.value)}>
                <option value="Email">Email ({member.email})</option>
                <option value="Phone">Phone ({member.phone})</option>
              </select>
            </div>
            <div className="actions">
              <button className="btn" onClick={submit}>Send to representative {I.send()}</button>
            </div>
          </div>
        )}
      </div>
      <p className="note">Demonstration form — in a real portal this would open a case with your union representative. No message is actually sent.</p>
    </>
  );
}

function Chat({ onBack, memberNum }) {
  const [pdf, setPdf] = useState(CLA_DOC); // CLA preloaded by default
  const [msgs, setMsgs] = useState([]); // {role:'user'|'assistant', text}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);
  const [model, setModel] = useState({ state: "loading", pct: 0, note: "Preparing local model…" });
  const fileRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [msgs, busy]);

  // Start loading (and, on first ever use, downloading) the on-device model as
  // soon as the assistant opens, so it's ready by the time the pilot asks.
  useEffect(() => {
    let alive = true;
    const files = {};
    loadModel((p) => {
      if (!alive) return;
      if (p.status === "progress") {
        files[p.file] = typeof p.progress === "number" ? p.progress : 0;
        const vals = Object.values(files);
        const pct = Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
        setModel({ state: "loading", pct, note: `Downloading model… ${pct}%` });
      }
    })
      .then(() => alive && setModel({ state: "ready", pct: 100, note: "Local model ready · offline" }))
      .catch((e) => alive && setModel({ state: "error", pct: 0, note: "Model failed to load: " + (e?.message || e) }));
    return () => { alive = false; };
  }, []);

  function readFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf") { setErr("Please upload the Company Agreement as a PDF file."); return; }
    setErr("");
    const reader = new FileReader();
    reader.onload = () => setPdf({ name: file.name, size: file.size, data: String(reader.result).split(",")[1] });
    reader.onerror = () => setErr("Could not read the file. Please try again.");
    reader.readAsDataURL(file);
  }

  async function ask(question) {
    const q = question.trim();
    if (!q || busy) return;
    setErr("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      // Pull the most relevant agreement sections and hand only those to the
      // on-device model so the prompt stays small enough to run on a phone.
      const context = retrieve(CLA_TEXT, q, { k: 5, budget: 3500 });
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content:
          "Answer using ONLY the following extracts from the Collective Labour Agreement.\n\n" +
          "=== RELEVANT EXTRACTS ===\n" + context + "\n=== END OF EXTRACTS ===\n\n" +
          "Question: " + q },
      ];

      // Stream tokens into a single assistant bubble as they arrive.
      let started = false;
      const text = await generate(messages, {
        onToken: (t) => {
          if (!started) {
            started = true;
            setMsgs((m) => [...m, { role: "assistant", text: t }]);
          } else {
            setMsgs((m) => {
              const c = [...m];
              c[c.length - 1] = { role: "assistant", text: c[c.length - 1].text + t };
              return c;
            });
          }
        },
      });

      const answer = (text || "").trim();
      if (!started) {
        setMsgs((m) => [...m, { role: "assistant", text:
          answer || "I couldn't find an answer to that in the agreement. Please rephrase, or contact the union." }]);
      } else if (answer && answer.length) {
        // Reconcile the bubble with the model's final, fully-decoded text.
        setMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", text: answer };
          return c;
        });
      }
    } catch (e) {
      setErr("The local assistant couldn't run: " + (e?.message || e) +
        (model.state !== "ready" ? " The model may still be downloading — this needs internet only on first use." : ""));
      setMsgs((m) => m.slice(0, -1)); // remove the pending user msg so it can be re-sent
      setInput(q);
    } finally {
      setBusy(false);
    }
  }


  return (
    <>
      <button className="back" onClick={onBack}>{I.arrow()} Back</button>
      <div className="chat-card">
        <div className="chat-top">
          <span style={{ color: "var(--amber)" }}>{I.doc()}</span>
          <div className="doc">
            <><b>{pdf.name}</b> · {pdf.desc}</>
          </div>
          <span className={"modelchip " + model.state} title={model.note}>
            {model.state === "ready" ? "● Local model" : model.state === "error" ? "● Model error" : `● ${model.pct}%`}
          </span>
        </div>
        {model.state !== "ready" && (
          <div className="keybar">
            {model.state === "loading" && (
              <div className="modelbar"><span style={{ width: model.pct + "%" }} /></div>
            )}
            <span className="keyhint">
              {model.state === "error"
                ? model.note
                : "The on-device AI model is downloading (first use only, ~0.5 GB). After this it runs fully offline — no API key, no internet."}
            </span>
          </div>
        )}

        {!pdf ? (
          <div className="drop">
            <div className="ring">{I.upload()}</div>
            <h3>Upload the Company Agreement</h3>
            <p>Add the Company Agreement PDF and the assistant will answer your questions based on the document.</p>
            <div
              className={"dropzone" + (over ? " over" : "")}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); readFile(e.dataTransfer.files?.[0]); }}
            >
              <strong>Click to choose</strong> or drag the PDF file here
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => readFile(e.target.files?.[0])} />
            {err && <div className="errline" style={{ padding: 0 }}>{err}</div>}
          </div>
        ) : (
          <>
            <div className="stream" ref={streamRef}>
              {msgs.length === 0 && (
                <div className="msg bot"><span className="mini bot">{I.plane()}</span>
                  <div className="bubble">Hi! I've loaded the Ryanair / SPAC Portugal pilots' Collective Labour Agreement. Ask me anything about it — pay scales, allowances, the 5/4 roster, annual leave, pensions and more.</div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div className={"msg " + (m.role === "user" ? "user" : "bot")} key={i}>
                  <span className={"mini " + (m.role === "user" ? "user" : "bot")}>
                    {m.role === "user" ? (memberNum || "ME").toString().slice(-2) : I.plane()}
                  </span>
                  <div className="bubble">{m.text}</div>
                </div>
              ))}
              {busy && (msgs.length === 0 || msgs[msgs.length - 1].role === "user") && (
                <div className="msg bot"><span className="mini bot">{I.plane()}</span>
                  <div className="bubble"><span className="typing"><i /><i /><i /></span></div>
                </div>
              )}
            </div>

            {msgs.length === 0 && !busy && (
              <div className="chips">
                {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}
              </div>
            )}
            {err && <div className="errline">{err}</div>}

            <div className="composer">
              <textarea rows={1} placeholder="Type your question about the Company Agreement…"
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }} />
              <button className="send" onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Send">{I.send()}</button>
            </div>
          </>
        )}
      </div>
      <p className="note">Answers are generated on-device by a small AI model from the embedded agreement and may contain errors. When in doubt, always confirm with the union.</p>
    </>
  );
}
