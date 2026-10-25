(()=>{
const $=(s,e=document)=>e.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';'),rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const sec=ms=>(ms/1000).toFixed(2)+'s',dig=ms=>(ms/1000).toFixed(2).padStart(5,'0');
const MAXP=20,WIN=10,PRE='cronometro-jogo-',MARG=100;
const CFG={config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:global.stun.twilio.com:3478'},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},{urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},{urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}]}};
const MODES={
closest:{n:'Tempo mais Próximo',i:'🎯',min:1,d:'Cada jogador para o cronômetro no tempo-alvo. Quem ficar mais longe é eliminado. Sobra um.'},
exact:{n:'Cravar o Tempo',i:'📍',min:1,d:'Os 2 mais próximos ganham 1 ponto; quem crava (±0,10s) ganha 2. Vence quem chegar a 10.'},
doubt:{n:'Duvido',i:'🤨',min:2,d:'Cronômetro secreto. Na sua vez, aperte ou duvide. Duvidou antes do alvo? Você perde. Depois? Perde quem apertou por último.'},
team:{n:'Tempo e Time',i:'🤝',min:1,d:'Em duplas: o 1º para o cronômetro, o 2º continua de onde parou e tenta fechar o alvo. Top 3 duplas = 1 ponto; cravar = 2. Vence quem chegar a 10.'}};
const HIDE=[[1,'Esconder após 1 s'],[2,'Esconder após 2 s'],[3,'Esconder após 3 s'],[0,'Esconder já'],[-1,'Nunca esconder']];
const App={screen:'home',online:false,myId:null,state:null,cfg:{n:2,names:[],mode:'closest',hide:1},att:{}};
const E={st:null,net:null};
const P=id=>E.st.players.find(p=>p.id===id),T=id=>E.st.teams.find(t=>t.id===id);
const tName=t=>t.members.map(m=>P(m).name).join(' & ');
const ctl=()=>!App.online||App.myId==='p0';
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',3500)}

/* ===== ENGINE (roda no host / local) ===== */
const newSt=()=>({phase:'lobby',mode:'closest',hide:1,players:[],teams:[],round:0,target:0,done:{},parts:[],current:null,last:null,clicks:0,t0:0,res:null,final:false,winners:[],msg:'',online:false,initial:0});
const live=()=>E.st.players.filter(p=>p.alive&&!p.left);
function nextAlive(id){const ps=E.st.players,i=ps.findIndex(p=>p.id===id);for(let k=1;k<=ps.length;k++){const p=ps[(i+k)%ps.length];if(p.alive&&!p.left)return p.id}return null}
function startGame(){const st=E.st,lv=st.players.filter(p=>!p.left);
 if(lv.length<MODES[st.mode].min)return toast('Mínimo de jogadores: '+MODES[st.mode].min);
 st.players.forEach(p=>{p.score=0;p.alive=!p.left});st.initial=lv.length;st.teams=[];st.round=0;
 if(st.mode==='team'){const ids=lv.map(p=>p.id).sort(()=>Math.random()-.5);for(let i=0;i<ids.length;i+=2)st.teams.push({id:'T'+i,members:ids.slice(i,i+2),score:0})}
 nextRound()}
function endGame(winners,res){const st=E.st;st.final=true;st.winners=winners;st.res=res||st.res;st.phase='result';sync()}
function nextRound(){const st=E.st;
 if((st.mode==='closest'||st.mode==='doubt')&&st.initial>1&&live().length<=1)return endGame(live().map(p=>p.name),{kind:'abort'});
 st.round++;st.done={};st.res=null;st.msg='';st.final=false;st.winners=[];st.clicks=0;st.last=null;
 if(st.mode==='doubt'){st.target=rnd(5,15);st.phase='intro';const l=live();st.current=l[(st.round-1)%l.length].id;sync()}
 else{st.target=st.mode==='team'?rnd(6,20):rnd(3,12);st.phase='attempt';
  st.parts=st.mode==='team'?st.teams.filter(t=>t.members.some(m=>!P(m).left)).map(t=>t.id):live().map(p=>p.id);check()}}
function active(){const st=E.st,off={};let pend=[];if(st.phase!=='attempt')return{act:[],off,n:0};
 if(st.mode==='team')st.parts.forEach(id=>{let o=0;for(const m of T(id).members){if(P(m).left)continue;if(st.done[m]!==undefined){o+=st.done[m];continue}off[m]=o;pend.push(m);break}});
 else pend=st.parts.filter(id=>!P(id).left&&st.done[id]===undefined);
 return{act:st.online?pend:pend.slice(0,1),off,n:pend.length}}
const check=()=>active().n===0?resolve():sync();
function act(pid,a){const st=E.st;
 if(a.t==='submit'&&st.phase==='attempt'){if(!active().act.includes(pid)||st.done[pid]!==undefined)return;const t=+a.time;if(!(t>=0&&t<6e5))return;st.done[pid]=Math.round(t);check()}
 else if(st.phase==='doubt'&&st.current===pid){
  if(a.t==='click'){st.last=pid;st.clicks++;st.current=nextAlive(pid);sync()}
  else if(a.t==='doubt'&&st.clicks>0){const el=performance.now()-st.t0,passed=el>=st.target*1000,lid=passed?st.last:pid,l=P(lid);if(l)l.alive=false;
   st.res={kind:'doubt',doubter:P(pid).name,passed,el:Math.round(el),loser:l?l.name:'—'};
   const lv=live();lv.length<=1?endGame(lv.map(p=>p.name)):(st.phase='result',sync())}}}
function resolve(){const st=E.st,Tg=st.target*1000,m=st.mode;let rows;
 if(m==='team')rows=st.parts.map(id=>{const t=T(id),ps=t.members.filter(x=>st.done[x]!==undefined);return ps.length?{id,name:tName(t),time:ps.reduce((a,x)=>a+st.done[x],0),ps:ps.map(x=>P(x).name+' '+sec(st.done[x])).join(' + ')}:null}).filter(Boolean);
 else rows=st.parts.filter(id=>st.done[id]!==undefined).map(id=>({id,name:P(id).name,time:st.done[id]}));
 rows.forEach(r=>{r.delta=r.time-Tg;r.diff=Math.abs(r.delta)});rows.sort((a,b)=>a.diff-b.diff);
 if(!rows.length)return endGame([],{kind:'abort'});
 let fin=null;
 if(m==='closest'){
  if(st.initial>1&&rows.length>1){const w=rows[rows.length-1].diff,ls=rows.filter(r=>r.diff===w);
   if(ls.length<rows.length)ls.forEach(r=>{r.out=true;P(r.id).alive=false});else st.msg='Empate total: ninguém sai.'}
  if(st.initial>1&&live().length<=1)fin=live().map(p=>p.name)}
 else{const n=Math.min(m==='exact'?2:3,rows.length),thr=rows[n-1].diff;
  rows.forEach(r=>{r.crava=r.diff<=MARG;r.pts=r.crava?2:r.diff<=thr?1:0;(m==='team'?T(r.id):P(r.id)).score+=r.pts});
  const en=m==='team'?st.teams.filter(t=>t.members.some(x=>!P(x).left)):st.players.filter(p=>!p.left),mx=Math.max(...en.map(e=>e.score));
  if(mx>=WIN){const top=en.filter(e=>e.score===mx);if(top.length===1)fin=[m==='team'?tName(top[0]):top[0].name];else st.msg='Empate na liderança! Mais uma rodada.'}}
 st.res={kind:'attempt',rows};fin?endGame(fin):(st.phase='result',sync())}
function playerLeft(pid){const st=E.st,p=P(pid);if(!p)return;
 if(st.phase==='lobby'){st.players=st.players.filter(x=>x.id!==pid);return sync()}
 p.left=true;p.alive=false;
 if(st.phase==='attempt')check();
 else if(st.phase==='doubt'||st.phase==='intro'){const lv=live();if(lv.length<=1)endGame(lv.map(x=>x.name),{kind:'abort'});else{if(st.current===pid)st.current=nextAlive(pid);sync()}}
 else sync()}
function pub(){const st=E.st,a=active();return{phase:st.phase,mode:st.mode,hide:st.hide,players:st.players.map(p=>({id:p.id,name:p.name,score:p.score||0,alive:p.alive!==false,left:!!p.left})),
 teams:st.teams.map(t=>({id:t.id,members:t.members,score:t.score,name:tName(t)})),round:st.round,target:st.target,done:Object.keys(st.done),act:a.act,off:a.off,parts:st.parts,
 current:st.current,last:st.last,clicks:st.clicks,res:st.res,final:st.final,winners:st.winners,msg:st.msg}}
function sync(){const s=pub();if(E.net&&E.net.role==='host')for(const id in E.net.conns)try{E.net.conns[id].send({t:'state',s})}catch(e){}
 App.state=s;App.screen=App.online&&s.phase==='lobby'?'lobby':'game';render()}

/* ===== REDE (PeerJS: salas) ===== */
const busy=m=>{$('#app').innerHTML='<div class="wrap"><div class="card">'+m+'</div></div>'};
function createRoom(name){if(typeof Peer==='undefined')return toast('Biblioteca online não carregou.');busy('Criando sala…');
 const go=n=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZ';let code='';for(let i=0;i<4;i++)code+=c[rnd(0,c.length-1)];const peer=new Peer(PRE+code,CFG);
  peer.on('open',()=>{E.net={role:'host',peer,conns:{},code,idc:1};E.st=newSt();E.st.online=true;E.st.players.push({id:'p0',name,score:0,alive:true,left:false});App.online=true;App.myId='p0';sync()});
  peer.on('connection',hostConn);peer.on('disconnected',()=>peer.reconnect());
  peer.on('error',e=>{if(e.type==='unavailable-id'&&n<5){peer.destroy();go(n+1)}else{toast('Erro: '+e.type);home()}})};go(0)}
function hostConn(c){let pid=null;
 c.on('data',m=>{if(!m||typeof m!=='object')return;const st=E.st;
  if(m.t==='join'&&!pid){const rej=x=>{c.send({t:'err',msg:x});setTimeout(()=>c.close(),300)};
   if(st.phase!=='lobby')return rej('A partida já começou.');if(st.players.length>=MAXP)return rej('Sala cheia (20).');
   pid='p'+E.net.idc++;let nm=String(m.name||'Jogador').trim().slice(0,14)||'Jogador',b=nm,k=2;while(st.players.some(p=>p.name===nm))nm=b+' '+k++;
   st.players.push({id:pid,name:nm,score:0,alive:true,left:false});E.net.conns[pid]=c;c.send({t:'welcome',id:pid});sync()}
  else if(pid&&['submit','click','doubt'].includes(m.t))act(pid,m)});
 c.on('close',()=>{if(pid){delete E.net.conns[pid];playerLeft(pid)}})}
function joinRoom(name,code){if(typeof Peer==='undefined')return toast('Biblioteca online não carregou.');if(code.length!==4)return toast('Digite o código da sala (4 letras).');busy('Entrando na sala…');
 const peer=new Peer(CFG);let ok=false;const fail=m=>{if(!ok){toast(m);try{peer.destroy()}catch(e){}home()}};setTimeout(()=>fail('Sala não encontrada.'),12000);
 peer.on('error',e=>fail(e.type==='peer-unavailable'?'Sala não encontrada.':'Erro: '+e.type));
 peer.on('open',()=>{const c=peer.connect(PRE+code,{reliable:true});E.net={role:'client',peer,hostConn:c,code};
  c.on('open',()=>c.send({t:'join',name}));
  c.on('data',m=>{if(m.t==='welcome'){ok=true;App.online=true;App.myId=m.id}else if(m.t==='err')fail(m.msg);else if(m.t==='state'){App.state=m.s;App.screen=m.s.phase==='lobby'?'lobby':'game';render()}});
  c.on('close',()=>{if(ok){toast('Conexão com o anfitrião encerrada.');home()}})})}
function home(){try{E.net&&E.net.peer.destroy()}catch(e){}E.net=null;E.st=null;App.online=false;App.state=null;App.screen='home';render();scrollTo(0,0)}
const send=m=>E.net.hostConn.send(m);

/* ===== UI ===== */
const modePick=(cur,ed)=>'<div class="modes">'+Object.entries(MODES).map(([k,m])=>`<button class="mode ${k===cur?'sel':''}" data-a="pick" data-v="${k}" ${ed?'':'disabled'}><span class="ic">${m.i}</span><b>${m.n}</b><small>${m.d}</small></button>`).join('')+'</div>';
const hideSel=(v,ed)=>ed?`<select data-a="hide">${HIDE.map(([x,l])=>`<option value="${x}" ${x==v?'selected':''}>${l}</option>`).join('')}</select>`:`<small>${HIDE.find(h=>h[0]==v)[1]}</small>`;
function syncNames(){document.querySelectorAll('.pn').forEach(i=>App.cfg.names[+i.dataset.i]=i.value)}
function render(){const r=$('#app'),y=scrollY,s=App.state,c=App.cfg;let h='';
 if(App.screen==='home')h=`<div class="wrap"><h1>⏱️ CRONÔMETRO</h1><p class="sub">Pare no tempo certo. Duvide. Cravar. Jogue em dupla.</p>
  <div class="row"><button class="btn big" data-a="goLocal">🏠 Modo Local</button><button class="btn big alt" data-a="goOnline">🌐 Modo Online</button></div>${modePick('',false)}</div>`;
 else if(App.screen==='local'){h=`<div class="wrap"><div class="top"><button class="btn ghost" data-a="home">← Voltar</button><h2>Modo Local</h2></div>
  <div class="card"><b>Jogadores (1 a 20)</b><div class="row"><button class="btn ghost" data-a="n-">−</button><b style="font-size:1.6rem">${c.n}</b><button class="btn ghost" data-a="n+">+</button></div>
  <div class="names">${Array.from({length:c.n},(_,i)=>`<input class="pn" data-i="${i}" maxlength="14" placeholder="Jogador ${i+1}" value="${esc(c.names[i]||'')}">`).join('')}</div></div>
  <div class="card">${modePick(c.mode,true)}${hideSel(c.hide,true)}</div><button class="btn big" data-a="startLocal">▶ Começar</button></div>`}
 else if(App.screen==='onlineMenu'){let nm='',sala='';try{nm=localStorage.cronoNome||'';sala=(new URLSearchParams(location.search).get('sala')||'').toUpperCase()}catch(e){}
  h=`<div class="wrap"><div class="top"><button class="btn ghost" data-a="home">← Voltar</button><h2>Modo Online</h2></div><div class="card">
  <input id="nm" maxlength="14" placeholder="Seu nome" value="${esc(nm)}"><button class="btn" data-a="create">Criar sala</button><small>ou entre numa sala</small>
  <input id="cd" maxlength="4" placeholder="CÓDIGO" value="${esc(sala)}" style="text-transform:uppercase;text-align:center"><button class="btn alt" data-a="join">Entrar</button></div></div>`}
 else if(App.screen==='lobby'){const ed=ctl();h=`<div class="wrap"><div class="top"><button class="btn ghost" data-a="leave">Sair</button><small>${s.players.length}/20 jogadores</small></div>
  <div class="card"><small>Código da sala</small><div class="code">${E.net.code}</div><small>Em qualquer aparelho: “Modo Online → Entrar”</small><button class="btn ghost" data-a="copy">📋 Copiar link da sala</button></div>
  <div class="card"><div class="board" style="width:100%">${s.players.map(p=>`<div class="chip ${p.id===App.myId?'me':''}">${p.id==='p0'?'👑 ':''}${esc(p.name)}</div>`).join('')}</div></div>
  <div class="card">${modePick(s.mode,ed)}${hideSel(s.hide,ed)}${ed?'<button class="btn big" data-a="startOnline">▶ Começar</button>':'<p class="note">Aguardando o anfitrião iniciar…</p>'}</div></div>`}
 else if(App.screen==='game'){const m=MODES[s.mode];h=`<div class="wrap"><div class="top"><span class="tag">${m.i} ${m.n}</span><span>Rodada ${s.round}</span>${App.online?`<small>Sala ${E.net.code}</small>`:''}<button class="btn ghost" data-a="leave">Sair</button></div>
  <main class="card">${stage(s)}</main>${board(s)}</div>`}
 r.innerHTML=h;scrollTo(0,y)}
const pn=(s,id)=>(s.players.find(p=>p.id===id)||{name:'—'}).name;
const clockH=d=>`<div class="clock" id="ck"><svg viewBox="0 0 100 100"><circle class="ticks" cx="50" cy="50" r="40"/><circle class="tr" cx="50" cy="50" r="46"/><circle class="arc" id="arc" cx="50" cy="50" r="46"/></svg><div class="digits" id="clk">${d}</div></div>`;
function stage(s){const on=App.online,tgt=`<div class="target"><span>Alvo${s.mode==='team'?' da dupla':''}</span><b>${s.target}s</b></div>`;
 if(s.phase==='intro')return tgt+`<p class="note">Cronômetro secreto: começa quando o anfitrião apertar COMEÇAR. Na sua vez, aperte ou duvide. Primeiro a jogar: <b>${esc(pn(s,s.current))}</b>. A 1ª jogada não pode duvidar.</p>`+(ctl()?'<button class="btn big" data-a="dStart">COMEÇAR</button>':'<p class="note">Aguardando o anfitrião…</p>');
 if(s.phase==='doubt'){const mine=!on||s.current===App.myId;return tgt+`<div class="clock hid"><svg viewBox="0 0 100 100"><circle class="ticks" cx="50" cy="50" r="40"/><circle class="tr" cx="50" cy="50" r="46"/><circle class="arc" cx="50" cy="50" r="46"/></svg><div class="digits">??.??</div></div>
  <div class="who">Vez de <b>${esc(pn(s,s.current))}</b></div><p class="note">${s.last?'Último a apertar: <b>'+esc(pn(s,s.last))+'</b>':'Ninguém apertou ainda.'}</p>`+
  (mine?`<div class="row"><button class="btn big" data-a="dClick">APERTAR</button><button class="btn big bad" data-a="dDoubt" ${s.clicks?'':'disabled'}>DUVIDO!</button></div>`:'<p class="note">Aguardando…</p>')}
 if(s.phase==='attempt'){const who=on?(s.act.includes(App.myId)?App.myId:null):s.act[0];
  if(who){const key=s.round+'-'+who;if(App.att.key!==key)App.att={key,who,run:false,done:false,ready:on};const a=App.att,off=s.off[who]||0,name=pn(s,who);
   if(!a.ready)return `<div class="who">Passe o dispositivo para <b>${esc(name)}</b></div>`+tgt+'<button class="btn big" data-a="ready">ESTOU PRONTO</button>';
   return (!on?`<div class="who">Vez de <b>${esc(name)}</b></div>`:'')+(s.mode==='team'?`<p class="note">${off?`Seu parceiro parou em <b>${sec(off)}</b>. Continue a contagem a partir daí!`:'1º da dupla: pare o cronômetro; seu parceiro continua de onde você parar.'}</p>`:'')+tgt+clockH(dig(off))+`<button class="btn big" id="tap" data-tap="1">${a.run?'PARAR':'INICIAR'}</button>`}
  const dn=s.done.includes(App.myId);return tgt+`<p class="who">${dn?'✔ Tempo registrado!':'Aguarde sua vez…'}</p><p class="note">Terminaram: ${s.done.length}</p>`}
 if(s.phase==='result'){const r=s.res||{};let b='';
  if(r.kind==='attempt'){b=tgtLine(s)+`<table><tr><th>#</th><th>Nome</th><th>Tempo</th><th>Dif.</th><th></th></tr>${r.rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}${x.ps?`<br><small>${esc(x.ps)}</small>`:''}</td><td>${sec(x.time)}</td><td>${x.delta>=0?'+':'−'}${sec(x.diff)}</td><td>${s.mode==='closest'?(x.out?'❌':'✅'):(x.crava?'⭐ +2':'+'+x.pts)}</td></tr>`).join('')}</table>`}
  else if(r.kind==='doubt')b=`<p class="who"><b>${esc(r.doubter)}</b> duvidou! O tempo estava em <b>${sec(r.el)}</b> (alvo ${s.target}s) — ${r.passed?'já tinha passado':'ainda não tinha passado'}.</p><p class="who">Perdeu: <b style="color:var(--bad)">${esc(r.loser)}</b></p>`;
  else b='<p class="note">Partida encerrada: jogadores saíram.</p>';
  if(s.msg)b+=`<p class="note">${esc(s.msg)}</p>`;
  if(s.final)b+=`<div class="win">🏆 ${s.winners.length?'Vencedor: '+esc(s.winners.join(', ')):'Sem vencedor'}</div>`;
  const bt=!ctl()?'<p class="note">Aguardando o anfitrião…</p>':s.final?`<div class="row"><button class="btn" data-a="again">Jogar de novo</button><button class="btn ghost" data-a="menu">${App.online?'Voltar ao lobby':'Menu'}</button></div>`:'<button class="btn big" data-a="next">Próxima rodada</button>';
  return b+bt}return ''}
const tgtLine=s=>`<div class="target"><span>Alvo</span><b>${s.target}s</b></div>`;
function board(s){const sc=s.mode==='exact'||s.mode==='team',it=s.mode==='team'?s.teams.map(t=>({n:t.name,v:t.score,al:true,me:t.members.includes(App.myId)})):s.players.map(p=>({n:p.name,v:p.score,al:p.alive&&!p.left,me:p.id===App.myId,l:p.left}));
 return '<section class="board">'+it.map(i=>`<div class="chip ${i.al?'':'out'} ${i.me?'me':''}"><span>${esc(i.n)}</span><b>${sc?i.v:(i.l?'saiu':'')}</b></div>`).join('')+'</section>'}

/* cronômetro do jogador */
function tick(){const a=App.att,s=App.state;if(!a.run)return;if(!s||s.phase!=='attempt'){a.run=false;return}
 const el=performance.now()-a.t0,off=s.off[a.who]||0,hid=s.hide>=0&&el>=s.hide*1000,d=$('#clk'),c=$('#ck'),arc=$('#arc');
 if(d){d.textContent=hid?'??.??':dig(off+el);c.classList.toggle('hid',hid);arc.style.strokeDashoffset=289*(1-Math.min(1,(off+el)/(s.target*1000)))}
 requestAnimationFrame(tick)}
function tap(){const a=App.att,s=App.state;if(!a.who||a.done||!s||s.phase!=='attempt')return;
 if(!a.run){a.run=true;a.t0=performance.now();$('#tap').textContent='PARAR';tick()}
 else{const time=Math.round(performance.now()-a.t0);a.run=false;a.done=true;App.online&&E.net.role==='client'?send({t:'submit',time}):act(App.online?'p0':a.who,{t:'submit',time})}}
document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-tap]')){e.preventDefault();tap()}});

/* ações */
const A={
 home,goLocal(){App.screen='local';render();scrollTo(0,0)},goOnline(){App.screen='onlineMenu';render();scrollTo(0,0)},
 'n+'(){syncNames();App.cfg.n=Math.min(MAXP,App.cfg.n+1);render()},'n-'(){syncNames();App.cfg.n=Math.max(1,App.cfg.n-1);render()},
 pick(b){const v=b.dataset.v;if(App.screen==='local'){syncNames();App.cfg.mode=v;render()}else if(App.screen==='lobby'&&ctl()){E.st.mode=v;sync()}},
 startLocal(){syncNames();const c=App.cfg,ps=[];if(c.n<MODES[c.mode].min)return toast('Este modo precisa de pelo menos '+MODES[c.mode].min+' jogadores.');
  for(let i=0;i<c.n;i++){let nm=(c.names[i]||'').trim()||'Jogador '+(i+1),b=nm,k=2;while(ps.some(p=>p.name===nm))nm=b+' '+k++;ps.push({id:'p'+i,name:nm,score:0,alive:true,left:false})}
  E.net=null;E.st=newSt();Object.assign(E.st,{mode:c.mode,hide:c.hide,players:ps});App.online=false;App.myId=null;startGame()},
 create(){const n=($('#nm').value.trim()||'Anfitrião').slice(0,14);try{localStorage.cronoNome=n}catch(e){}createRoom(n)},
 join(){const n=($('#nm').value.trim()||'Jogador').slice(0,14);try{localStorage.cronoNome=n}catch(e){}joinRoom(n,$('#cd').value.trim().toUpperCase())},
 copy(){const l=location.origin+location.pathname+'?sala='+E.net.code;navigator.clipboard?navigator.clipboard.writeText(l).then(()=>toast('Link copiado!'),()=>prompt('Copie o link:',l)):prompt('Copie o link:',l)},
 startOnline(){startGame()},leave(){if(confirm('Sair da partida?'))home()},
 ready(){App.att.ready=true;render()},dStart(){E.st.phase='doubt';E.st.t0=performance.now();sync()},
 dClick(){App.online&&E.net.role==='client'?send({t:'click'}):act(App.online?'p0':App.state.current,{t:'click'})},
 dDoubt(){App.online&&E.net.role==='client'?send({t:'doubt'}):act(App.online?'p0':App.state.current,{t:'doubt'})},
 next:()=>nextRound(),again:()=>startGame(),
 menu(){if(App.online){const st=E.st;st.players=st.players.filter(p=>!p.left);st.players.forEach(p=>{p.score=0;p.alive=true});st.teams=[];st.phase='lobby';sync()}else{App.screen='local';render()}}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&A[b.dataset.a]&&b.tagName!=='SELECT')A[b.dataset.a](b)});
document.addEventListener('change',e=>{if(e.target.dataset.a!=='hide')return;const v=+e.target.value;if(App.screen==='local')App.cfg.hide=v;else if(ctl()){E.st.hide=v;sync()}});
try{if(new URLSearchParams(location.search).get('sala'))App.screen='onlineMenu'}catch(e){}
render();
})();
