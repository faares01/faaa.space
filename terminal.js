#!/usr/bin/env node

'use strict';

const readline  = require('readline');
const https     = require('https');

// ─────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────
const c = {
  reset:   '\x1b[0m',  bold:    '\x1b[1m',
  dim:     '\x1b[2m',  italic:  '\x1b[3m',
  red:     '\x1b[31m', green:   '\x1b[32m',
  yellow:  '\x1b[33m', white:   '\x1b[37m',
  bgMag:   '\x1b[45m',
  purple:  '\x1b[38;5;135m', pink:    '\x1b[38;5;213m',
  lpurple: '\x1b[38;5;183m', dpurple: '\x1b[38;5;93m',
  teal:    '\x1b[38;5;87m',  grey:    '\x1b[38;5;242m',
  lgrey:   '\x1b[38;5;248m', dgreen:  '\x1b[38;5;35m',
  lime:    '\x1b[38;5;154m', dyellow: '\x1b[38;5;220m',
  bgDark:  '\x1b[48;5;17m',  bgDark2: '\x1b[48;5;232m',
};

const pl  = (s = '') => process.stdout.write(s + '\n');
const p   = (s)      => process.stdout.write(s);
const clr = ()       => process.stdout.write('\x1b[2J\x1b[H');
const hideCursor = () => p('\x1b[?25l');
const showCursor = () => p('\x1b[?25h');

// ─────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────
const SECTIONS = [
  { key: '1', icon: '✦',  label: 'About Me',  id: 'about'    },
  { key: '2', icon: '💬', label: 'Blog',       id: 'blog'     },
  { key: '3', icon: '🔗', label: 'Links',      id: 'links'    },
  { key: '4', icon: '📡', label: 'Signal',     id: 'signal'   },
  { key: '5', icon: '🕹️', label: 'Projects',  id: 'projects' },
  { key: '6', icon: '🎮', label: 'Discord',    id: 'discord'  },
  { key: 'q', icon: '←',  label: 'Quit',       id: 'quit'     },
];

const ASCII_LOGO = [
  `${c.purple}${c.bold}  ███████╗ █████╗  █████╗ ${c.reset}`,
  `${c.purple}${c.bold}  ██╔════╝██╔══██╗██╔══██╗${c.reset}`,
  `${c.dpurple}${c.bold}  █████╗  ███████║███████║${c.reset}`,
  `${c.dpurple}${c.bold}  ██╔══╝  ██╔══██║██╔══██║${c.reset}`,
  `${c.pink}${c.bold}  ██║     ██║  ██║██║  ██║${c.reset}`,
  `${c.pink}${c.bold}  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝${c.reset}`,
];

const TAGLINE = `${c.lpurple}${c.italic}  // personal corner of the internet${c.reset}`;
const WEBSITE = `${c.teal}  ✦ faaa.space${c.reset}`;
const VERSION = `${c.grey}  v1.0.0${c.reset}`;

// ─────────────────────────────────────────
// HTTP HELPER
// ─────────────────────────────────────────
function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

function post(hostname, path, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(payload); req.end();
  });
}

// ─────────────────────────────────────────
// DISCORD STATUS (Lanyard)
// ─────────────────────────────────────────
const DISCORD_ID = '1111705596543119370';

function statusDot(status) {
  switch (status) {
    case 'online':    return `${c.dgreen}●${c.reset}`;
    case 'idle':      return `${c.dyellow}●${c.reset}`;
    case 'dnd':       return `${c.red}●${c.reset}`;
    default:          return `${c.grey}●${c.reset}`;
  }
}
function statusLabel(status) {
  switch (status) {
    case 'online':    return `${c.dgreen}Online${c.reset}`;
    case 'idle':      return `${c.dyellow}Idle${c.reset}`;
    case 'dnd':       return `${c.red}Do Not Disturb${c.reset}`;
    default:          return `${c.grey}Offline${c.reset}`;
  }
}

async function fetchDiscord() {
  const data = await get(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
  return data?.data || null;
}

function renderDiscord(d) {
  const W  = 44;
  const ESC = /\x1b\[[0-9;]*m/g;
  const tl = `\x1b[38;5;93m\u256d${'\u2500'.repeat(W)}\u256e\x1b[0m`;
  const bl = `\x1b[38;5;93m\u2570${'\u2500'.repeat(W)}\u256f\x1b[0m`;
  const div= `\x1b[38;5;93m\u251c${'\u2500'.repeat(W)}\u2524\x1b[0m`;
  const ml = (s) => {
    const vis = s.replace(ESC,'').length;
    const pad = Math.max(0, W - vis - 1);
    return `\x1b[38;5;93m\u2502\x1b[0m ${s}${' '.repeat(pad)}\x1b[38;5;93m\u2502\x1b[0m`;
  };

  if (!d) {
    return [
      '',
      `  ${tl}`,
      `  ${ml('\x1b[38;5;242m// could not fetch status\x1b[0m')}`,
      `  ${ml('\x1b[38;5;242m   (no internet or API down)\x1b[0m')}`,
      `  ${bl}`,
      '',
    ];
  }

  const status   = d.discord_status || 'offline';
  const user     = d.discord_user   || {};
  const spotify  = d.listening_to_spotify ? d.spotify : null;
  const acts     = (d.activities || []).filter(a => a.type !== 2);
  const custom   = acts.find(a => a.type === 4);
  const activity = acts.find(a => a.type === 0);

  const uname = (user.global_name || user.username || 'FAA').slice(0, 18);
  const tag   = (user.username || 'faares').slice(0, 18);

  const lines = [
    '',
    `  ${tl}`,
    `  ${ml(`\x1b[37m\x1b[1m  ${uname}\x1b[0m  \x1b[38;5;242m@${tag}\x1b[0m`)}`,
    `  ${ml(`  ${statusDot(status)}  ${statusLabel(status)}`)}`,
  ];

  if (custom && custom.state) {
    lines.push(`  ${div}`);
    const txt = custom.state.slice(0, W - 6);
    lines.push(`  ${ml(`\x1b[38;5;248m\ud83d\udcac  ${txt}\x1b[0m`)}`);
  }

  if (spotify) {
    lines.push(`  ${div}`);
    lines.push(`  ${ml(`\x1b[38;5;154m\x1b[1m\u266b  Listening to Spotify\x1b[0m`)}`);
    const song   = spotify.song.slice(0, W - 6);
    const artist = spotify.artist.slice(0, W - 9);
    const album  = spotify.album.slice(0, W - 9);
    lines.push(`  ${ml(`\x1b[37m    ${song}\x1b[0m`)}`);
    lines.push(`  ${ml(`\x1b[38;5;242m    by \x1b[38;5;248m${artist}\x1b[0m`)}`);
    lines.push(`  ${ml(`\x1b[38;5;242m    on \x1b[38;5;248m${album}\x1b[0m`)}`);
  }

  if (activity) {
    lines.push(`  ${div}`);
    const aname = (activity.name || '').slice(0, W - 6);
    const adet  = (activity.details || '').slice(0, W - 4);
    const ast   = (activity.state  || '').slice(0, W - 4);
    lines.push(`  ${ml('\x1b[38;5;87m\u25b6  ' + aname + '\x1b[0m')}`);
    if (adet) lines.push(`  ${ml('\x1b[38;5;248m    ' + adet + '\x1b[0m')}`);
    if (ast)  lines.push(`  ${ml('\x1b[38;5;242m    ' + ast  + '\x1b[0m')}`);
  }

  lines.push(`  ${div}`);
  lines.push(`  ${ml('\x1b[38;5;242mDiscord ID:  \x1b[38;5;87m' + DISCORD_ID + '\x1b[0m')}`);
  lines.push(`  ${bl}`);
  lines.push('');
  return lines;
}

// ─────────────────────────────────────────
// BLOG (Nhost)
// ─────────────────────────────────────────
const NHOST_HOST = 'nlbllfpowhdjugrkrvcr.hasura.eu-central-1.nhost.run';
const NHOST_PATH = '/v1/graphql';

async function fetchBlog() {
  const res = await post(NHOST_HOST, NHOST_PATH, {
    query: `query { posts(order_by: {created_at: desc}, limit: 8) { id title content created_at } }`
  });
  return res?.data?.posts || null;
}

function renderBlog(posts, selected) {
  if (!posts) {
    return [
      '',
      `${c.purple}${c.bold}  💬 BLOG${c.reset}`,
      `  ${c.grey}──────────────────────────────────────${c.reset}`,
      '',
      `  ${c.grey}// could not fetch posts${c.reset}`,
      `  ${c.grey}   read them at${c.reset} ${c.teal}faaa.space${c.reset}`,
      '',
    ];
  }
  if (!posts.length) {
    return [
      '',
      `${c.purple}${c.bold}  💬 BLOG${c.reset}`,
      `  ${c.grey}──────────────────────────────────────${c.reset}`,
      '',
      `  ${c.grey}// no posts yet${c.reset}`,
      '',
    ];
  }

  if (selected !== undefined && selected !== null) {
    // single post view
    const post = posts[selected];
    if (!post) return [];
    const date = new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const lines = [
      '',
      `${c.purple}${c.bold}  💬 ${post.title}${c.reset}`,
      `  ${c.grey}${date}${c.reset}`,
      `  ${c.grey}──────────────────────────────────────${c.reset}`,
      '',
    ];
    // word-wrap content at ~52 chars
    const words = (post.content || '').split(' ');
    let line = '';
    words.forEach(w => {
      if ((line + ' ' + w).trim().length > 52) {
        lines.push(`  ${c.lgrey}${line.trim()}${c.reset}`);
        line = w;
      } else {
        line = (line + ' ' + w).trim();
      }
    });
    if (line) lines.push(`  ${c.lgrey}${line.trim()}${c.reset}`);
    lines.push('');
    lines.push(`  ${c.grey}──────────────────────────────────────${c.reset}`);
    lines.push(`  ${c.grey}Press ${c.reset}${c.lpurple}b${c.reset}${c.grey} back to posts list${c.reset}`);
    lines.push('');
    return lines;
  }

  // post list
  const lines = [
    '',
    `${c.purple}${c.bold}  💬 BLOG${c.reset}`,
    `  ${c.grey}──────────────────────────────────────${c.reset}`,
    `  ${c.grey}${posts.length} post${posts.length !== 1 ? 's' : ''}  —  ↑↓ navigate, Enter to read${c.reset}`,
    '',
  ];
  posts.forEach((post, i) => {
    const date = new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const isActive = i === (blogSelectedIdx || 0);
    if (isActive) {
      lines.push(`  ${c.bgMag}${c.white}${c.bold}  ▶ ${post.title.slice(0, 40).padEnd(40)}  ${c.grey}${date}  ${c.reset}`);
    } else {
      lines.push(`  ${c.grey}  ${i+1}.${c.reset} ${c.lgrey}${post.title.slice(0, 40)}${c.reset}  ${c.grey}${date}${c.reset}`);
    }
  });
  lines.push('');
  return lines;
}

// ─────────────────────────────────────────
// STATIC CONTENT
// ─────────────────────────────────────────
function getContent(id) {
  switch (id) {
    case 'about':
      return [
        '',
        `${c.purple}${c.bold}  ✦ ABOUT ME${c.reset}`,
        `  ${c.grey}──────────────────────────────────────${c.reset}`,
        '',
        `  ${c.white}${c.bold}Fares Almori${c.reset}  ${c.grey}(he/him)${c.reset}`,
        `  ${c.grey}Saudi Arabia 🇸🇦${c.reset}`,
        '',
        `  ${c.lpurple}developer · designer · builder${c.reset}`,
        '',
        `  ${c.lgrey}I build things for the web.${c.reset}`,
        `  ${c.lgrey}This CLI is one of them.${c.reset}`,
        '',
        `  ${c.grey}──────────────────────────────────────${c.reset}`,
        `  ${c.grey}Discord ID:${c.reset}  ${c.teal}1111705596543119370${c.reset}`,
        `  ${c.grey}GitHub:${c.reset}      ${c.teal}github.com/faares01${c.reset}`,
        `  ${c.grey}Site:${c.reset}        ${c.teal}faaa.space${c.reset}`,
        '',
      ];

    case 'links':
      return [
        '',
        `${c.purple}${c.bold}  🔗 LINKS${c.reset}`,
        `  ${c.grey}──────────────────────────────────────${c.reset}`,
        '',
        `  ${c.pink}Instagram${c.reset}   ${c.teal}instagram.com/faares.8${c.reset}`,
        `  ${c.pink}Snapchat${c.reset}    ${c.teal}snapchat.com/@faares.9${c.reset}`,
        `  ${c.pink}GitHub${c.reset}      ${c.teal}github.com/faares01${c.reset}`,
        `  ${c.pink}Spotify${c.reset}     ${c.teal}open.spotify.com/user/31vjxguunsbs...${c.reset}`,
        `  ${c.pink}Steam${c.reset}       ${c.teal}steamcommunity.com/profiles/76561199503547319${c.reset}`,
        '',
        `  ${c.grey}──────────────────────────────────────${c.reset}`,
        `  ${c.grey}Main site:${c.reset}  ${c.teal}faaa.space${c.reset}`,
        '',
      ];

    case 'signal':
      return [
        '',
        `${c.purple}${c.bold}  📡 SIGNAL${c.reset}`,
        `  ${c.grey}──────────────────────────────────────${c.reset}`,
        '',
        `  ${c.lgrey}Signal is an anonymous real-time chat${c.reset}`,
        `  ${c.lgrey}built into the site.${c.reset}`,
        '',
        `  ${c.lpurple}How it works:${c.reset}`,
        `  ${c.grey}1.${c.reset} ${c.lgrey}Open${c.reset} ${c.teal}faaa.space${c.reset}`,
        `  ${c.grey}2.${c.reset} ${c.lgrey}Login (any username/password)${c.reset}`,
        `  ${c.grey}3.${c.reset} ${c.lgrey}Click 📡 Signal in the taskbar${c.reset}`,
        `  ${c.grey}4.${c.reset} ${c.lgrey}Request a chat — anonymous & private${c.reset}`,
        '',
        `  ${c.grey}No accounts. No data stored.${c.reset}`,
        `  ${c.grey}Just two people in a chat.${c.reset}`,
        '',
      ];

    case 'projects':
      return [
        '',
        `${c.purple}${c.bold}  🕹️ PROJECTS${c.reset}`,
        `  ${c.grey}──────────────────────────────────────${c.reset}`,
        '',
        `  ${c.white}${c.bold}faaa.space${c.reset}`,
        `  ${c.grey}  Personal site built in pure HTML/CSS/JS.${c.reset}`,
        `  ${c.teal}  → faaa.space${c.reset}`,
        '',
        `  ${c.white}${c.bold}faaa (this CLI)${c.reset}`,
        `  ${c.grey}  Terminal card — run with${c.reset} ${c.teal}npx faaa${c.reset}`,
        `  ${c.grey}  No dependencies. Pure Node.js.${c.reset}`,
        `  ${c.teal}  → github.com/faares01/faaa.space${c.reset}`,
        '',
      ];

    default:
      return [];
  }
}

// ─────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────
function drawHome(selectedIdx) {
  clr();
  pl();
  ASCII_LOGO.forEach(l => pl(l));
  pl(TAGLINE);
  pl(WEBSITE);
  pl(VERSION);
  pl();
  pl(`  ${c.grey}──────────────────────────────────────${c.reset}`);
  pl();
  SECTIONS.forEach((s, i) => {
    if (i === selectedIdx) {
      pl(`  ${c.bgMag}${c.white}${c.bold}  [${s.key}] ${s.icon} ${s.label.padEnd(14)}  ${c.reset}`);
    } else {
      pl(`  ${c.grey} [${s.key}]${c.reset} ${c.lgrey}${s.icon} ${s.label}${c.reset}`);
    }
  });
  pl();
  pl(`  ${c.grey}──────────────────────────────────────${c.reset}`);
  pl(`  ${c.grey}↑↓ navigate   Enter/number select   q quit${c.reset}`);
  pl();
}

// ─────────────────────────────────────────
// SECTION SCREEN
// ─────────────────────────────────────────
function drawSection(lines) {
  clr();
  pl();
  lines.forEach(l => pl(l));
  // footer only if not blog (blog handles its own footer)
  const hasFooter = lines.some(l => l.includes('back to posts') || l.includes('go back'));
  if (!hasFooter) {
    pl(`  ${c.grey}──────────────────────────────────────${c.reset}`);
    pl(`  ${c.grey}Press ${c.reset}${c.lpurple}b${c.reset}${c.grey} to go back  │  ${c.reset}${c.lpurple}q${c.reset}${c.grey} to quit${c.reset}`);
    pl();
  }
}

// ─────────────────────────────────────────
// LOADING SPINNER
// ─────────────────────────────────────────
function spinner(msg) {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  return setInterval(() => {
    p(`\r  ${c.purple}${frames[i++ % frames.length]}${c.reset}  ${c.grey}${msg}${c.reset}  `);
  }, 80);
}

// ─────────────────────────────────────────
// STATIC (curl)
// ─────────────────────────────────────────
function printStatic() {
  pl();
  ASCII_LOGO.forEach(l => pl(l));
  pl(TAGLINE);
  pl(WEBSITE);
  pl();
  pl(`  ${c.grey}──────────────────────────────────────────────${c.reset}`);
  pl(`  ${c.white}${c.bold}Fares Almori${c.reset}  ${c.grey}he/him · Saudi Arabia 🇸🇦${c.reset}`);
  pl(`  ${c.lpurple}developer · designer · builder${c.reset}`);
  pl(`  ${c.grey}──────────────────────────────────────────────${c.reset}`);
  pl();
  pl(`  ${c.pink}Site${c.reset}        ${c.teal}faaa.space${c.reset}`);
  pl(`  ${c.pink}GitHub${c.reset}      ${c.teal}github.com/faares01${c.reset}`);
  pl(`  ${c.pink}Instagram${c.reset}   ${c.teal}instagram.com/faares.8${c.reset}`);
  pl(`  ${c.pink}Snapchat${c.reset}    ${c.teal}snapchat.com/@faares.9${c.reset}`);
  pl(`  ${c.pink}Spotify${c.reset}     ${c.teal}open.spotify.com/user/31vjxguunsbs...${c.reset}`);
  pl(`  ${c.pink}Steam${c.reset}       ${c.teal}steamcommunity.com/profiles/76561199503547319${c.reset}`);
  pl();
  pl(`  ${c.grey}──────────────────────────────────────────────${c.reset}`);
  pl(`  ${c.grey}Run interactively:${c.reset}  ${c.teal}npx faaa${c.reset}`);
  pl(`  ${c.grey}Visitor Marks:${c.reset}      ${c.teal}faaa.space  →  🖊 Marks${c.reset}`);
  pl(`  ${c.grey}Anonymous chat:${c.reset}     ${c.teal}faaa.space  →  📡 Signal${c.reset}`);
  pl();
}

// ─────────────────────────────────────────
// INTERACTIVE
// ─────────────────────────────────────────
let blogPosts      = null;  // null=not loaded, []+=loaded
let blogSelectedIdx = 0;
let blogPostView   = null;  // index of open post, null=list

function runInteractive() {
  hideCursor();
  let selectedIdx = 0;
  let inSection   = false;
  let currentId   = null;

  drawHome(selectedIdx);

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  process.stdin.on('keypress', async (str, key) => {
    if (key.ctrl && key.name === 'c') { exit(); return; }
    if (!inSection && key.name === 'q') { exit(); return; }

    // ── inside blog post view ──
    if (inSection && currentId === 'blog' && blogPostView !== null) {
      if (key.name === 'b' || key.name === 'escape') {
        blogPostView = null;
        drawSection(renderBlog(blogPosts, null));
      } else if (key.name === 'q') { exit(); }
      return;
    }

    // ── inside blog list view ──
    if (inSection && currentId === 'blog' && blogPosts) {
      if (key.name === 'b' || key.name === 'escape') {
        inSection = false; currentId = null;
        drawHome(selectedIdx);
      } else if (key.name === 'q') { exit(); }
      else if (key.name === 'up') {
        blogSelectedIdx = Math.max(0, blogSelectedIdx - 1);
        drawSection(renderBlog(blogPosts, null));
      } else if (key.name === 'down') {
        blogSelectedIdx = Math.min((blogPosts.length || 1) - 1, blogSelectedIdx + 1);
        drawSection(renderBlog(blogPosts, null));
      } else if (key.name === 'return' || key.name === 'space') {
        blogPostView = blogSelectedIdx;
        drawSection(renderBlog(blogPosts, blogPostView));
      }
      return;
    }

    // ── inside other sections ──
    if (inSection) {
      if (key.name === 'b' || key.name === 'escape') {
        inSection = false; currentId = null;
        drawHome(selectedIdx);
      } else if (key.name === 'q') { exit(); }
      return;
    }

    // ── home navigation ──
    if (key.name === 'up') {
      selectedIdx = (selectedIdx - 1 + SECTIONS.length) % SECTIONS.length;
      drawHome(selectedIdx);
    } else if (key.name === 'down') {
      selectedIdx = (selectedIdx + 1) % SECTIONS.length;
      drawHome(selectedIdx);
    } else if (key.name === 'return' || key.name === 'space') {
      const s = SECTIONS[selectedIdx];
      if (s.id === 'quit') { exit(); return; }
      await openSection(s.id);
      inSection = true; currentId = s.id;
    } else {
      const found = SECTIONS.find(s => s.key === str);
      if (found) {
        if (found.id === 'quit') { exit(); return; }
        selectedIdx = SECTIONS.indexOf(found);
        await openSection(found.id);
        inSection = true; currentId = found.id;
      }
    }
  });
}

async function openSection(id) {
  if (id === 'blog') {
    blogSelectedIdx = 0; blogPostView = null;
    if (!blogPosts) {
      // show loading
      clr(); pl();
      pl(`${c.purple}${c.bold}  💬 BLOG${c.reset}`);
      pl(`  ${c.grey}──────────────────────────────────────${c.reset}`);
      pl();
      const spin = spinner('fetching posts...');
      blogPosts = await fetchBlog();
      clearInterval(spin); p('\r' + ' '.repeat(40) + '\r');
    }
    drawSection(renderBlog(blogPosts, null));
    return;
  }

  if (id === 'discord') {
    clr(); pl();
    pl(`${c.purple}${c.bold}  🎮 DISCORD STATUS${c.reset}`);
    pl(`  ${c.grey}──────────────────────────────────────${c.reset}`);
    pl();
    const spin = spinner('fetching discord status...');
    const data = await fetchDiscord();
    clearInterval(spin); p('\r' + ' '.repeat(40) + '\r');
    drawSection(renderDiscord(data));
    return;
  }

  drawSection(getContent(id));
}

function exit() {
  showCursor(); clr(); pl();
  ASCII_LOGO.forEach(l => pl(l));
  pl();
  pl(`  ${c.lpurple}${c.italic}thanks for stopping by ˘ᵕ˘${c.reset}`);
  pl(`  ${c.teal}faaa.space${c.reset}`);
  pl();
  process.exit(0);
}

// ─────────────────────────────────────────
// ENTRY
// ─────────────────────────────────────────
if (!process.stdout.isTTY) {
  printStatic();
  process.exit(0);
} else {
  runInteractive();
}
