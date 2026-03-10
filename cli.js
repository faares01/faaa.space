#!/usr/bin/env node
'use strict';

const readline = require('readline');
const https    = require('https');
const { spawn } = require('child_process');

const C = {
  r:'\x1b[0m', b:'\x1b[1m', d:'\x1b[2m', i:'\x1b[3m',
  red:'\x1b[31m', grn:'\x1b[32m', wht:'\x1b[37m', bgM:'\x1b[45m',
  pu:'\x1b[38;5;135m', pk:'\x1b[38;5;213m', lp:'\x1b[38;5;183m',
  dp:'\x1b[38;5;93m',  tl:'\x1b[38;5;87m',  gy:'\x1b[38;5;242m',
  lg:'\x1b[38;5;248m', dg:'\x1b[38;5;35m',  dy:'\x1b[38;5;220m',
  lm:'\x1b[38;5;154m', or:'\x1b[38;5;208m',
};
const W   = () => process.stdout.columns || 80;
const H   = () => process.stdout.rows    || 24;
const pl  = (s='') => process.stdout.write(s+'\n');
const p   = s      => process.stdout.write(s);
const clr = ()     => p('\x1b[2J\x1b[H');
const mv  = (r,c)  => p(`\x1b[${r};${c}H`);
const hide= ()     => p('\x1b[?25l');
const show= ()     => p('\x1b[?25h');

// ── HTTP ──
function httpGet(url){
  return new Promise(res=>{
    https.get(url,{headers:{'Content-Type':'application/json'}},r=>{
      let d='';r.on('data',x=>d+=x);
      r.on('end',()=>{try{res(JSON.parse(d));}catch{res(null);}});
    }).on('error',()=>res(null));
  });
}
function httpPost(host,path,body){
  return new Promise(res=>{
    const data=JSON.stringify(body);
    const req=https.request({hostname:host,path,method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},
      r=>{let d='';r.on('data',x=>d+=x);r.on('end',()=>{try{res(JSON.parse(d));}catch{res(null);}});});
    req.on('error',()=>res(null));req.write(data);req.end();
  });
}

// ── NHOST ──
const NH='nlbllfpowhdjugrkrvcr.hasura.eu-central-1.nhost.run';
const NP='/v1/graphql';
const gql=(q,v={})=>httpPost(NH,NP,{query:q,variables:v});

// ── TOKEN (persists in ~/.faaa_token) ──
function getToken(){
  try{
    const os=require('os'),fs=require('fs'),path=require('path');
    const f=path.join(os.homedir(),'.faaa_token');
    if(fs.existsSync(f)){const t=fs.readFileSync(f,'utf8').trim();if(t)return t;}
    const t='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
    fs.writeFileSync(f,t);return t;
  }catch{return 'u'+Date.now().toString(36);}
}
const TOK=getToken();

// ── VISITORS ──
let visitorCount=0;
let pingIv=null;
async function visitorPing(){
  try{
    await gql(`mutation($t:String!){insert_cil_visitors_one(object:{token:$t,last_ping:"now()"},on_conflict:{constraint:cil_visitors_token_key,update_columns:[last_ping]}){token}}`,{t:TOK});
    const cutoff=new Date(Date.now()-120000).toISOString();
    const r=await gql(`query($c:timestamptz!){cil_visitors_aggregate(where:{last_ping:{_gte:$c}}){aggregate{count}}}`,{c:cutoff});
    visitorCount=r?.data?.cil_visitors_aggregate?.aggregate?.count??0;
  }catch{}
}
async function visitorLeave(){
  try{await gql(`mutation($t:String!){delete_cil_visitors(where:{token:{_eq:$t}}){affected_rows}}`,{t:TOK});}catch{}
}

// ── CHARACTER MESSAGES ──
const CHAR_MSGS=['hey human ˘ᵕ˘','welcome to my terminal','you found me!','nice terminal btw',
  'try the mini game ↓','say hi in chat ↓','faaa.space ✦','i see you...','pure node.js ✦',
  'no dependencies','3am vibes','stay a while','press 7 for chat','press 8 for game'];
let charIdx=Math.floor(Math.random()*CHAR_MSGS.length);
let charIv=null;

// ── LOGO ──
const LOGO=[
  `${C.pu}${C.b}  ███████╗ █████╗  █████╗ ${C.r}`,
  `${C.pu}${C.b}  ██╔════╝██╔══██╗██╔══██╗${C.r}`,
  `${C.dp}${C.b}  █████╗  ███████║███████║${C.r}`,
  `${C.dp}${C.b}  ██╔══╝  ██╔══██║██╔══██║${C.r}`,
  `${C.pk}${C.b}  ██║     ██║  ██║██║  ██║${C.r}`,
  `${C.pk}${C.b}  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝${C.r}`,
];

// ── SECTIONS ──
const SECTIONS=[
  {key:'1',icon:'✦', label:'About Me',   id:'about'},
  {key:'2',icon:'💬',label:'Blog',        id:'blog'},
  {key:'3',icon:'🔗',label:'Links',       id:'links'},
  {key:'4',icon:'📡',label:'Signal',      id:'signal'},
  {key:'5',icon:'🕹️',label:'Projects',  id:'projects'},
  {key:'6',icon:'🎮',label:'Discord',     id:'discord'},
  {key:'7',icon:'💌',label:'Chat',        id:'chat'},
  {key:'8',icon:'🚀',label:'Mini Game',   id:'game'},
  {key:'q',icon:'←', label:'Back to site',id:'quit'},
];

// ── STATIC STARS (generated once, never move) ──
let _staticStars=null;
function getStaticStars(){
  if(_staticStars) return _staticStars;
  _staticStars=Array.from({length:55},()=>({
    x:Math.floor(2+Math.random()*58),
    y:Math.floor(Math.random()*38),
    ch:['·','·','.','*','✦','+'][Math.floor(Math.random()*6)],
    col:[C.gy,C.gy,C.lp,C.pu,C.pk,C.tl][Math.floor(Math.random()*6)],
  }));
  return _staticStars;
}

// ══════════════════════════════════════════════
// INTRO — space animation + press ENTER
// ══════════════════════════════════════════════
async function playIntro(){
  hide(); clr();
  const w=W(), h=H();

  // 3 depth layers for parallax smoothness
  const stars=Array.from({length:130},()=>{
    const layer=Math.floor(Math.random()*3);
    return {
      fx: Math.random()*w,           // float x
      fy: Math.random()*h,           // float y
      spd: [0.06,0.18,0.48][layer],  // far/mid/near
      twk: Math.random()*Math.PI*2,  // twinkle phase
      twkSpd: 0.06+Math.random()*0.1,
      ch: ['·','·','.','*','+','✦'][Math.floor(Math.random()*6)],
      col: [[C.gy,C.gy],[C.lp,C.pu],[C.pk,C.tl]][layer][Math.floor(Math.random()*2)],
    };
  });

  function drawStars(){
    stars.forEach(s=>{
      s.fx -= s.spd;
      s.twk += s.twkSpd;
      if(s.fx<0) s.fx=w-1;
      if(Math.sin(s.twk)<-0.5) return; // twinkle blink
      const x=Math.round(s.fx), y=Math.round(s.fy)+1;
      if(x>=1&&x<=w&&y>=1&&y<=h){ mv(y,x); p(s.col+s.ch+C.r); }
    });
  }

  // Phase 1 — loading only, no stars, logo centered with padding
  const total=50;
  await new Promise(ok=>{
    let f=0;
    const iv=setInterval(()=>{
      clr();
      // Logo — pushed down so it doesn't clip at top
      const logoTop=Math.max(3, Math.floor(h/2)-8);
      LOGO.forEach((l,i)=>{ mv(logoTop+i, 2); p(l); });
      // Loading bar below logo
      const barY=logoTop+LOGO.length+2;
      const prog=Math.floor((f/total)*22);
      const bar='█'.repeat(prog)+'░'.repeat(22-prog);
      mv(barY,   2); p(C.pu+'['+C.tl+bar+C.pu+']'+C.r);
      mv(barY+1, 6); p(C.gy+'loading...'+C.r);
      f++;
      if(f>=total){ clearInterval(iv); ok(); }
    },30);
  });

  // Phase 2 — stars appear static (drawn once), press ENTER
  {
    const logoTop=Math.max(3, Math.floor(h/2)-8);
    const textY=logoTop+LOGO.length+2;
    clr();
    // draw stars once, frozen
    stars.forEach(s=>{
      const x=Math.round(s.fx), y=Math.round(s.fy)+1;
      if(x>=1&&x<=w&&y>=1&&y<=h){ mv(y,x); p(s.col+s.ch+C.r); }
    });
    LOGO.forEach((l,i)=>{ mv(logoTop+i, 2); p(l); });
    mv(textY,   2); p(C.lp+C.i+'// personal corner of the internet'+C.r);
    mv(textY+2, 2); p(C.pk+C.b+'press  '+C.r+C.tl+C.b+'ENTER'+C.r+C.pk+C.b+'  to enter my world'+C.r);
    mv(textY+4, 2); p(C.gy+'✦ faaa.space'+C.r);
  }
}

// ══════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════
function drawHome(sel){
  clr();
  pl(); pl(); pl();
  LOGO.forEach(l=>pl(l));
  pl(`${C.lp}${C.i}  // personal corner of the internet${C.r}`);
  pl(`${C.tl}  ✦ faaa.space${C.r}`);
  pl();
  pl(`  ${C.gy}${'─'.repeat(38)}${C.r}`);
  pl();
  SECTIONS.forEach((s,i)=>{
    const a=i===sel;
    if(a) pl(`  ${C.bgM}${C.wht}${C.b}  [${s.key}] ${s.icon} ${s.label.padEnd(15)}  ${C.r}`);
    else  pl(`  ${C.gy} [${s.key}]${C.r} ${C.lg}${s.icon} ${s.label}${C.r}`);
  });
  pl();
  pl(`  ${C.gy}${'─'.repeat(38)}${C.r}`);
  const vc=visitorCount>0?visitorCount:'...';
  pl(`  ${C.gy}👀 ${C.r}${C.tl}${vc}${C.r}${C.gy} visitor${visitorCount!==1?'s':''} online${C.r}`);
  pl(`  ${C.gy}↑↓ navigate   number select   q quit${C.r}`);
  pl();
  // Character bubble — colors outside padEnd so .length is accurate
  const msg=CHAR_MSGS[charIdx%CHAR_MSGS.length];
  const face='(o ._.) FAA';
  const IW=Math.max(msg.length,face.length)+4;
  const dash='\u2500'.repeat(IW);
  const facePad=face.padEnd(IW-4);
  const msgPad =msg.padEnd(IW-4);
  pl('  '+C.dp+'\u256d'+dash+'\u256e'+C.r);
  pl('  '+C.dp+'|  '+C.r+C.pk+facePad+C.r+C.dp+'  |'+C.r);
  pl('  '+C.dp+'|  '+C.r+C.lp+msgPad +C.r+C.dp+'  |'+C.r);
  pl('  '+C.dp+'\u2570'+dash+'\u256f'+C.r);
  pl();
}

// ══════════════════════════════════════════════
// SECTION WRAPPER
// ══════════════════════════════════════════════
function drawSection(lines,footer=true){
  clr();pl();
  lines.forEach(l=>pl(l));
  if(footer){
    pl(`  ${C.gy}${'─'.repeat(38)}${C.r}`);
    pl(`  ${C.lp}b${C.r}${C.gy} back  │  ${C.lp}q${C.r}${C.gy} quit${C.r}`);
    pl();
  }
}

// ══════════════════════════════════════════════
// STATIC CONTENT
// ══════════════════════════════════════════════
function getContent(id){
  const hr=`  ${C.gy}${'─'.repeat(38)}${C.r}`;
  switch(id){
    case 'about': return ['',`${C.pu}${C.b}  ✦ ABOUT ME${C.r}`,hr,'',
      `  ${C.wht}${C.b}Fares Almori${C.r}  ${C.gy}// FAA (he/him)${C.r}`,'',
      `  ${C.lg}hey !! i'm Fares almori, also known as${C.r}`,
      `  ${C.lg}FAA. i'm just a guy who spends too much${C.r}`,
      `  ${C.lg}time online making things.${C.r}`,'',
      `  ${C.lg}this is my personal space on the web${C.r}`,
      `  ${C.pk}。◕‿◕。${C.r}${C.lg} feel free to look around${C.r}`,
      `  ${C.lg}& leave a message in the chat !!${C.r}`,'',
      `  ${C.gy}Interests${C.r}`,
      `  ${C.lp}dev  music  web design  discord bots${C.r}`,
      `  ${C.lp}games  coding  foooooodss  potato chip${C.r}`,'',hr,
      `  ${C.gy}Discord:${C.r}  ${C.tl}1111705596543119370${C.r}`,
      `  ${C.gy}GitHub:${C.r}   ${C.tl}github.com/faares01${C.r}`,
      `  ${C.gy}Site:${C.r}     ${C.tl}faaa.space${C.r}`,''];
    case 'links': return ['',`${C.pu}${C.b}  🔗 LINKS${C.r}`,hr,'',
      `  ${C.pk}Instagram${C.r}   ${C.tl}instagram.com/faares.8${C.r}`,
      `  ${C.pk}Snapchat${C.r}    ${C.tl}snapchat.com/@faares.9${C.r}`,
      `  ${C.pk}GitHub${C.r}      ${C.tl}github.com/faares01${C.r}`,
      `  ${C.pk}Spotify${C.r}     ${C.tl}open.spotify.com/user/31vjxguunsbs...${C.r}`,
      `  ${C.pk}Steam${C.r}       ${C.tl}steamcommunity.com/profiles/76561199503547319${C.r}`,'',hr,
      `  ${C.gy}Main site:${C.r}  ${C.tl}faaa.space${C.r}`,''];
    case 'signal': return ['',`${C.pu}${C.b}  📡 SIGNAL${C.r}`,hr,'',
      `  ${C.lg}Anonymous real-time chat on the site.${C.r}`,'',
      `  ${C.lp}How to use:${C.r}`,
      `  ${C.gy}1.${C.r} ${C.lg}Open${C.r} ${C.tl}faaa.space${C.r}`,
      `  ${C.gy}2.${C.r} ${C.lg}Login (any username/password)${C.r}`,
      `  ${C.gy}3.${C.r} ${C.lg}Click 📡 Signal in taskbar${C.r}`,
      `  ${C.gy}4.${C.r} ${C.lg}Request a private anonymous chat${C.r}`,'',
      `  ${C.gy}No accounts. No data stored.${C.r}`,''];
    case 'projects': return ['',`${C.pu}${C.b}  🕹️ PROJECTS${C.r}`,hr,'',
      `  ${C.wht}${C.b}faaa.space${C.r}`,`  ${C.gy}  Personal site built in pure HTML/CSS/JS.${C.r}`,`  ${C.tl}  → faaa.space${C.r}`,'',
      `  ${C.wht}${C.b}faaa / cil (this CLI)${C.r}`,
      `  ${C.gy}  Terminal card — run with${C.r} ${C.tl}npx faaa${C.r}`,
      `  ${C.gy}  No dependencies. Pure Node.js.${C.r}`,`  ${C.tl}  → github.com/faares01/faaa.space${C.r}`,''];
    default: return [];
  }
}

// ══════════════════════════════════════════════
// DISCORD
// ══════════════════════════════════════════════
const DID='1111705596543119370';
function sDot(s){return s==='online'?`${C.dg}●${C.r}`:s==='idle'?`${C.dy}●${C.r}`:s==='dnd'?`${C.red}●${C.r}`:`${C.gy}●${C.r}`;}
function sLbl(s){return s==='online'?`${C.dg}Online${C.r}`:s==='idle'?`${C.dy}Idle${C.r}`:s==='dnd'?`${C.red}Do Not Disturb${C.r}`:`${C.gy}Offline${C.r}`;}
function renderDiscord(d){
  const BW=44,ESC=/\x1b\[[0-9;]*m/g;
  const tl=`${C.dp}╭${'─'.repeat(BW)}╮${C.r}`;
  const bl=`${C.dp}╰${'─'.repeat(BW)}╯${C.r}`;
  const div=`${C.dp}├${'─'.repeat(BW)}┤${C.r}`;
  const ml=s=>{const v=s.replace(ESC,'').length;return `${C.dp}│${C.r} ${s}${' '.repeat(Math.max(0,BW-v-1))}${C.dp}│${C.r}`;};
  if(!d) return ['',`  ${tl}`,`  ${ml(`${C.gy}// could not fetch — no internet?${C.r}`)}`,`  ${bl}`,''];
  const st=d.discord_status||'offline',u=d.discord_user||{};
  const sp=d.listening_to_spotify?d.spotify:null;
  const acts=(d.activities||[]).filter(a=>a.type!==2);
  const cust=acts.find(a=>a.type===4),act=acts.find(a=>a.type===0);
  const un=(u.global_name||u.username||'FAA').slice(0,18);
  const tg=(u.username||'faares').slice(0,18);
  const ls=['',`  ${tl}`,`  ${ml(`${C.wht}${C.b}  ${un}${C.r}  ${C.gy}@${tg}${C.r}`)}`,`  ${ml(`  ${sDot(st)}  ${sLbl(st)}`)}`];
  if(cust?.state){ls.push('  '+div);ls.push('  '+ml(C.lg+'💬  '+cust.state.slice(0,BW-6)+C.r));}
  if(sp){ls.push('  '+div);ls.push('  '+ml(C.lm+C.b+'♫  Listening to Spotify'+C.r));ls.push('  '+ml(C.wht+'    '+sp.song.slice(0,BW-6)+C.r));ls.push('  '+ml(C.gy+'    by '+C.lg+sp.artist.slice(0,BW-9)+C.r));ls.push('  '+ml(C.gy+'    on '+C.lg+sp.album.slice(0,BW-9)+C.r));}
  if(act){const an=act.name.slice(0,BW-6);ls.push('  '+div);ls.push('  '+ml(C.tl+'▶  '+an+C.r));if(act.details)ls.push('  '+ml(C.lg+'    '+act.details.slice(0,BW-6)+C.r));}
  ls.push('  '+div);ls.push('  '+ml(C.gy+'ID:  '+C.tl+DID+C.r));ls.push('  '+bl);ls.push('');
  return ls;
}

// ══════════════════════════════════════════════
// BLOG
// ══════════════════════════════════════════════
let blogCache=null,blogSel=0,blogPost=null;
async function fetchBlog(){
  const r=await gql(`query{posts(order_by:{created_at:desc},limit:8){id title content created_at}}`);
  return r?.data?.posts||null;
}
function renderBlogList(posts){
  const hr=`  ${C.gy}${'─'.repeat(38)}${C.r}`;
  const ls=['',`${C.pu}${C.b}  💬 BLOG${C.r}`,hr,`  ${C.gy}${posts.length} posts — ↑↓ navigate, Enter read${C.r}`,''];
  posts.forEach((post,i)=>{
    const date=new Date(post.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const a=i===blogSel;
    if(a) ls.push(`  ${C.bgM}${C.wht}${C.b}  ▶ ${post.title.slice(0,36).padEnd(36)} ${C.gy}${date} ${C.r}`);
    else  ls.push(`  ${C.gy}  ${i+1}.${C.r} ${C.lg}${post.title.slice(0,36)}${C.r}  ${C.gy}${date}${C.r}`);
  });
  ls.push('');
  ls.push(`  ${C.gy}${'─'.repeat(38)}${C.r}`);
  ls.push(`  ${C.lp}b${C.r}${C.gy} back  │  ${C.lp}q${C.r}${C.gy} quit${C.r}`);
  ls.push('');
  return ls;
}
function renderBlogPost(post){
  const date=new Date(post.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const ls=['',`${C.pu}${C.b}  💬 ${post.title}${C.r}`,`  ${C.gy}${date}${C.r}`,`  ${C.gy}${'─'.repeat(38)}${C.r}`,''];
  const words=(post.content||'').split(' ');let line='';
  words.forEach(w=>{
    if((line+' '+w).trim().length>52){ls.push(`  ${C.lg}${line.trim()}${C.r}`);line=w;}
    else line=(line+' '+w).trim();
  });
  if(line) ls.push(`  ${C.lg}${line.trim()}${C.r}`);
  ls.push('');ls.push(`  ${C.gy}${'─'.repeat(38)}${C.r}`);
  ls.push(`  ${C.lp}b${C.r}${C.gy} back to list  │  ${C.lp}q${C.r}${C.gy} quit${C.r}`);ls.push('');
  return ls;
}

// ══════════════════════════════════════════════
// CHAT
// ══════════════════════════════════════════════
let chatMsgs=[],chatSel=0,isAdmin=false,chatBusy=false;
async function fetchChat(){
  const r=await gql(`query{cil_messages(order_by:{created_at:desc},limit:30){id username content created_at admin_reply}}`);
  chatMsgs=r?.data?.cil_messages||[];
}
function renderChat(){
  const hr=`  ${C.gy}${'─'.repeat(38)}${C.r}`;
  const ls=['',`${C.pu}${C.b}  💌 CLI CHAT${C.r}`,hr];
  if(isAdmin) ls[2]=`${C.pu}${C.b}  💌 CLI CHAT${C.r}  ${C.pk}[ADMIN]${C.r}`;
  ls.push(`  ${C.gy}${chatMsgs.length} message${chatMsgs.length!==1?'s':''}${C.r}`,'');
  if(!chatMsgs.length){
    ls.push(`  ${C.gy}// no messages yet — be the first!${C.r}`);
  } else {
    chatMsgs.slice(0,12).forEach((m,i)=>{
      const date=new Date(m.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
      const a=i===chatSel&&isAdmin;
      if(a) ls.push(`  ${C.bgM}${C.wht}${C.b} ▶ ${m.username.slice(0,10).padEnd(10)} ${m.content.slice(0,24).padEnd(24)} ${date} ${C.r}`);
      else  ls.push(`  ${C.pk}${m.username.slice(0,10).padEnd(10)}${C.r}  ${C.lg}${m.content.slice(0,30)}${C.r}  ${C.gy}${date}${C.r}`);
      if(m.admin_reply) ls.push(`    ${C.tl}  ↳ FAA: ${m.admin_reply.slice(0,36)}${C.r}`);
    });
  }
  ls.push('',hr);
  if(isAdmin) ls.push(`  ${C.gy}↑↓ select  ${C.r}${C.pk}r${C.r}${C.gy} reply  ${C.r}${C.red}x${C.r}${C.gy} delete  ${C.r}${C.lp}b${C.r}${C.gy} back${C.r}`);
  else        ls.push(`  ${C.lp}e${C.r}${C.gy} send message  │  ${C.lp}a${C.r}${C.gy} admin  │  ${C.lp}b${C.r}${C.gy} back${C.r}`);
  ls.push('');return ls;
}

// ══════════════════════════════════════════════
// MINI GAME — Space Dodge
// ══════════════════════════════════════════════
let gameRunning=false,gameScore=0,gameBest=0;
let gameY=5,gameAsts=[],gameFrame=0,gameIv=null;
const GW=32,GH=12;

function startGame(onEnd){
  gameRunning=true;gameScore=0;gameFrame=0;gameY=Math.floor(GH/2);gameAsts=[];
  function spawn2(){gameAsts.push({x:GW-1,y:Math.floor(Math.random()*GH),ch:['*','#','@','✦','◆'][Math.floor(Math.random()*5)]});}
  function draw(){
    clr();pl();
    pl(`  ${C.pu}${C.b}  🚀 SPACE DODGE${C.r}   ${C.gy}score:${C.r} ${C.tl}${gameScore}${C.r}   ${C.gy}best:${C.r} ${C.lp}${gameBest}${C.r}`);
    pl(`  ${C.gy}  ↑↓ to dodge  │  q to quit${C.r}`);pl();
    pl(`  ${C.dp}╔${'═'.repeat(GW+2)}╗${C.r}`);
    for(let y=0;y<GH;y++){
      let row='';
      for(let x=0;x<GW;x++){
        if(x===2&&y===gameY){row+=`${C.tl}▶${C.r}`;continue;}
        const a=gameAsts.find(a=>Math.round(a.x)===x&&a.y===y);
        if(a){row+=`${C.pk}${a.ch}${C.r}`;continue;}
        // star trail behind ship
        if(x===0&&y===gameY){row+=`${C.dp}·${C.r}`;continue;}
        if(x===1&&y===gameY){row+=`${C.dp}-${C.r}`;continue;}
        row+=' ';
      }
      pl(`  ${C.dp}║${C.r} ${row} ${C.dp}║${C.r}`);
    }
    pl(`  ${C.dp}╚${'═'.repeat(GW+2)}╝${C.r}`);
  }
  draw();
  gameIv=setInterval(()=>{
    gameFrame++;gameScore++;
    const spd=0.45+(gameScore/400);
    gameAsts.forEach(a=>{a.x-=spd;});
    gameAsts=gameAsts.filter(a=>a.x>-1);
    const spawnRate=Math.max(7,18-Math.floor(gameScore/60));
    if(gameFrame%spawnRate===0) spawn2();
    const hit=gameAsts.some(a=>Math.round(a.x)===2&&a.y===gameY);
    if(hit){
      clearInterval(gameIv);gameRunning=false;
      if(gameScore>gameBest) gameBest=gameScore;
      clr();pl();
      pl(`  ${C.red}${C.b}  ✕ GAME OVER${C.r}`);
      pl(`  ${C.gy}${'─'.repeat(38)}${C.r}`);pl();
      pl(`  ${C.wht}Score:${C.r}  ${C.tl}${gameScore}${C.r}`);
      pl(`  ${C.wht}Best:${C.r}   ${C.lp}${gameBest}${C.r}`);pl();
      if(gameScore>0&&gameScore===gameBest) pl(`  ${C.dy}${C.b}  ✦ NEW HIGH SCORE!${C.r}`);
      pl(`  ${C.gy}${'─'.repeat(38)}${C.r}`);
      pl(`  ${C.lp}r${C.r}${C.gy} retry  │  ${C.lp}b${C.r}${C.gy} back${C.r}`);pl();
      onEnd();return;
    }
    draw();
  },75);
}

// ══════════════════════════════════════════════
// ASK INPUT (switches rawMode off temporarily)
// ══════════════════════════════════════════════
function askInput(prompt){
  return new Promise(res=>{
    show();
    // Pause main keypress handler while reading line
    if(global._khHandler) process.stdin.removeListener('keypress', global._khHandler);
    if(process.stdin.isTTY) process.stdin.setRawMode(false);
    const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:false});
    rl.once('line',ans=>{
      rl.close();
      setImmediate(()=>{
        if(process.stdin.isTTY) process.stdin.setRawMode(true);
        readline.emitKeypressEvents(process.stdin);
        hide();
        // Re-register main handler
        if(global._khHandler) process.stdin.on('keypress', global._khHandler);
        res(ans.trim());
      });
    });
    p(prompt);
  });
}

// ══════════════════════════════════════════════
// SPINNER
// ══════════════════════════════════════════════
function spinner(msg){
  const fr=['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];let i=0;
  return setInterval(()=>{p(`\r  ${C.pu}${fr[i++%fr.length]}${C.r}  ${C.gy}${msg}${C.r}  `);},80);
}

// ══════════════════════════════════════════════
// STATIC (curl)
// ══════════════════════════════════════════════
function printStatic(){
  pl();LOGO.forEach(l=>pl(l));
  pl(`${C.lp}${C.i}  // personal corner of the internet${C.r}`);
  pl(`${C.tl}  ✦ faaa.space${C.r}`);pl();
  pl(`  ${C.gy}${'─'.repeat(46)}${C.r}`);
  pl(`  ${C.wht}${C.b}Fares Almori${C.r}  ${C.gy}he/him · Saudi Arabia 🇸🇦${C.r}`);
  pl(`  ${C.lp}developer · designer · builder${C.r}`);
  pl(`  ${C.gy}${'─'.repeat(46)}${C.r}`);pl();
  pl(`  ${C.pk}Site${C.r}        ${C.tl}faaa.space${C.r}`);
  pl(`  ${C.pk}GitHub${C.r}      ${C.tl}github.com/faares01${C.r}`);
  pl(`  ${C.pk}Instagram${C.r}   ${C.tl}instagram.com/faares.8${C.r}`);
  pl(`  ${C.pk}Snapchat${C.r}    ${C.tl}snapchat.com/@faares.9${C.r}`);
  pl(`  ${C.pk}Spotify${C.r}     ${C.tl}open.spotify.com/user/31vjxguunsbs...${C.r}`);
  pl(`  ${C.pk}Steam${C.r}       ${C.tl}steamcommunity.com/profiles/76561199503547319${C.r}`);pl();
  pl(`  ${C.gy}${'─'.repeat(46)}${C.r}`);
  pl(`  ${C.gy}Run interactively:${C.r}  ${C.tl}npx faaa${C.r}`);pl();
}

// ══════════════════════════════════════════════
// EXIT
// ══════════════════════════════════════════════
function doExit(){
  if(pingIv)  clearInterval(pingIv);
  if(charIv)  clearInterval(charIv);
  if(gameIv)  clearInterval(gameIv);
  visitorLeave().finally(()=>{
    show();clr();pl();
    LOGO.forEach(l=>pl(l));pl();
    pl(`  ${C.lp}${C.i}thanks for stopping by ˘ᵕ˘${C.r}`);
    try{const cmd=process.platform==='darwin'?'open':process.platform==='win32'?'start':'xdg-open';spawn(cmd,['https://faaa.space'],{detached:true,stdio:'ignore'}).unref();}catch{}
    pl(`  \x1b]8;;https://faaa.space\x1b\\${C.tl}← faaa.space${C.r}\x1b]8;;\x1b\\`);pl();
    process.exit(0);
  });
}

// ══════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════
async function runInteractive(){
  hide();
  await playIntro();

  // Wait ENTER
  await new Promise(res=>{
    if(process.stdin.isTTY) process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);
    const h=(str,key)=>{
      if(!key) return;
      if(key.ctrl&&key.name==='c'){show();process.exit(0);}
      if(key.name==='return'||key.name==='space'){process.stdin.removeListener('keypress',h);if(global._introIv){clearInterval(global._introIv);global._introIv=null;}res();}
    };
    process.stdin.on('keypress',h);
  });

  // Start background tasks
  visitorPing();
  pingIv=setInterval(visitorPing,30000);
  charIv=setInterval(()=>{charIdx++;},8000);

  let sel=0;
  let screen='home'; // home|section|blog|discord|chat|game|gameover
  let gameOver=false;

  drawHome(sel);

  const kh=async(str,key)=>{
    if(!key) return;
    if(key.ctrl&&key.name==='c'){doExit();return;}

    // ── GAME OVER ──
    if(screen==='gameover'){
      if(str==='r'){screen='game';startGame(()=>{screen='gameover';});}
      else if(str==='b'||key.name==='escape'){screen='home';drawHome(sel);}
      return;
    }

    // ── GAME ──
    if(screen==='game'&&gameRunning){
      if(key.name==='up')   gameY=Math.max(0,gameY-1);
      if(key.name==='down') gameY=Math.min(GH-1,gameY+1);
      if(str==='q'||key.name==='escape'){clearInterval(gameIv);gameRunning=false;screen='home';drawHome(sel);}
      return;
    }

    // ── BLOG POST ──
    if(screen==='blog'&&blogPost!==null){
      if(str==='b'||key.name==='escape'){blogPost=null;drawSection(renderBlogList(blogCache),false);}
      else if(str==='q') doExit();
      return;
    }

    // ── BLOG LIST ──
    if(screen==='blog'){
      if(str==='b'||key.name==='escape'){screen='home';drawHome(sel);}
      else if(str==='q') doExit();
      else if(key.name==='up'){blogSel=Math.max(0,blogSel-1);drawSection(renderBlogList(blogCache),false);}
      else if(key.name==='down'){blogSel=Math.min((blogCache.length||1)-1,blogSel+1);drawSection(renderBlogList(blogCache),false);}
      else if(key.name==='return'||key.name==='space'){blogPost=blogCache[blogSel];drawSection(renderBlogPost(blogPost),false);}
      return;
    }

    // ── CHAT ──
    if(screen==='chat'){
      if(str==='b'||key.name==='escape'){screen='home';isAdmin=false;chatBusy=false;drawHome(sel);return;}
      if(str==='q'){doExit();return;}
      if(chatBusy) return;

      // Admin: navigate (never blocked)
      if(isAdmin&&key.name==='up'){chatSel=Math.max(0,chatSel-1);drawSection(renderChat(),false);return;}
      if(isAdmin&&key.name==='down'){chatSel=Math.min(Math.max(0,chatMsgs.length-1),chatSel+1);drawSection(renderChat(),false);return;}

      if(!isAdmin&&str==='a'){
        chatBusy=true;
        try{
          const u=await askInput(`  ${C.pk}admin username: ${C.r}`);
          const pw=await askInput(`  ${C.pk}admin password: ${C.r}`);
          if(u==='faares0'&&pw==='Fares100') isAdmin=true;
          else{ clr();pl();pl(`  ${C.red}// wrong credentials${C.r}`);await new Promise(r=>setTimeout(r,900)); }
        }finally{ chatBusy=false; }
        drawSection(renderChat(),false);
        return;
      }

      if(!isAdmin&&str==='e'){
        chatBusy=true;
        try{
          const uname=await askInput(`  ${C.lp}your name: ${C.r}`);
          if(uname){
            const content=await askInput(`  ${C.lp}message: ${C.r}`);
            if(content){
              const sp=spinner('sending...');
              await gql(`mutation($u:String!,$c:String!){insert_cil_messages_one(object:{username:$u,content:$c}){id}}`,{u:uname.slice(0,20),c:content.slice(0,200)});
              clearInterval(sp);p('\r'+' '.repeat(35)+'\r');
              await fetchChat();
            }
          }
        }finally{ chatBusy=false; }
        drawSection(renderChat(),false);
        return;
      }

      if(isAdmin&&str==='x'){
        if(!chatMsgs[chatSel]) return;
        chatBusy=true;
        try{
          const sp=spinner('deleting...');
          await gql(`mutation($id:uuid!){delete_cil_messages_by_pk(id:$id){id}}`,{id:chatMsgs[chatSel].id});
          clearInterval(sp);p('\r'+' '.repeat(35)+'\r');
          await fetchChat();
          chatSel=Math.max(0,chatSel-1);
        }finally{ chatBusy=false; }
        drawSection(renderChat(),false);
        return;
      }

      if(isAdmin&&str==='r'){
        if(!chatMsgs[chatSel]) return;
        chatBusy=true;
        try{
          const reply=await askInput(`  ${C.pk}admin reply: ${C.r}`);
          if(reply){
            const sp=spinner('replying...');
            await gql(`mutation($id:uuid!,$r:String!){update_cil_messages_by_pk(pk_columns:{id:$id},_set:{admin_reply:$r}){id}}`,{id:chatMsgs[chatSel].id,r:reply.slice(0,200)});
            clearInterval(sp);p('\r'+' '.repeat(35)+'\r');
            await fetchChat();
          }
        }finally{ chatBusy=false; }
        drawSection(renderChat(),false);
        return;
      }
      return;
    }

    // ── SECTION ──
    if(screen==='section'){
      if(str==='b'||key.name==='escape'){screen='home';drawHome(sel);}
      else if(str==='q') doExit();
      return;
    }

    // ── HOME ──
    if(screen==='home'){
      if(str==='q'){doExit();return;}
      if(key.name==='up'){sel=(sel-1+SECTIONS.length)%SECTIONS.length;drawHome(sel);}
      else if(key.name==='down'){sel=(sel+1)%SECTIONS.length;drawHome(sel);}
      else if(key.name==='return'||key.name==='space'){await open(SECTIONS[sel].id);}
      else{const f=SECTIONS.find(s=>s.key===str);if(f)await open(f.id);}
    }
  };

  async function open(id){
    if(id==='quit'){doExit();return;}

    if(id==='blog'){
      screen='blog';blogSel=0;blogPost=null;
      if(!blogCache){
        clr();pl();pl(`${C.pu}${C.b}  💬 BLOG${C.r}`);pl();
        const sp=spinner('fetching posts...');
        blogCache=await fetchBlog()||[];
        clearInterval(sp);p('\r'+' '.repeat(40)+'\r');
      }
      drawSection(renderBlogList(blogCache.length?blogCache:[{id:'0',title:'no posts yet',content:'',created_at:new Date().toISOString()}]),false);
      return;
    }

    if(id==='discord'){
      clr();pl();pl(`${C.pu}${C.b}  🎮 DISCORD STATUS${C.r}`);pl();
      const sp=spinner('fetching discord status...');
      const d=await httpGet(`https://api.lanyard.rest/v1/users/${DID}`);
      clearInterval(sp);p('\r'+' '.repeat(40)+'\r');
      screen='section';drawSection(renderDiscord(d?.data||null));
      return;
    }

    if(id==='chat'){
      screen='chat';chatSel=0;isAdmin=false;
      clr();pl();pl(`${C.pu}${C.b}  💌 CLI CHAT${C.r}`);pl();
      const sp=spinner('loading chat...');
      await fetchChat();
      clearInterval(sp);p('\r'+' '.repeat(40)+'\r');
      drawSection(renderChat(),false);
      return;
    }

    if(id==='game'){
      screen='game';
      startGame(()=>{screen='gameover';});
      return;
    }

    screen='section';
    drawSection(getContent(id));
  }

  global._khHandler=kh;
  process.stdin.on('keypress',kh);
}

// ══════════════════════════════════════════════
// ENTRY
// ══════════════════════════════════════════════
if(!process.stdout.isTTY){
  printStatic();process.exit(0);
} else {
  readline.emitKeypressEvents(process.stdin);
  if(process.stdin.isTTY) process.stdin.setRawMode(true);
  runInteractive();
}
