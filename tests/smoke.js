// usage: FAKE=YYYY-MM-DD node tests/smoke.js <so-viec.html> <vi|en> <demo|owner>
// Runs the page's main script in a fake DOM and checks rendering, i18n and ledger writes.
if(process.env.FAKE){const R=Date, off=new R(process.env.FAKE+'T12:00:00')-new R(); global.Date=class extends R{constructor(...a){ if(a.length) super(...a); else super(R.now()+off)} static now(){return R.now()+off}}}
const fs=require('fs'); const html=fs.readFileSync(process.argv[2],'utf8');
const navLang=process.argv[3], owner=process.argv[4]==='owner';
const els={}, docL={}; let fails=0;
function ok(c,m){ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++ }
function mk(id){return {id,innerHTML:'',textContent:'',hidden:false,className:'',dataset:{},attrs:{},L:{},
 addEventListener(e,f){(this.L[e]=this.L[e]||[]).push(f)},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},querySelectorAll(){return []},querySelector(){return null},focus(){},classList:{add(){},remove(){},toggle(){},contains(){return false}}}}
function el(id){return els[id]||(els[id]=mk(id))}
el('msgBack').hidden=true; ['howtoDemo','demoBack','howto'].forEach(id=>{ if(new RegExp('id="'+id+'"[^>]*hidden').test(html)) el(id).hidden=true });
// CSS with all whitespace removed, so the style checks below work on the source and the minified build alike.
const STYLE=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,'');
// The small "copy task id" button (catask#ID for the AI worker) is intended everywhere; other copy buttons are not.
const noCpId=h=>h.replace(/<button[^>]*data-cp-id[^>]*>[\s\S]*?<\/button>/g,'');
const VI=/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const snapByPath={}; let settingsDoc=null;
// view: count innerHTML writes; each write recreates the .scroll boxes (scrollTop 0), like a real DOM
const V=el('view'); let _vh='', gen=0, boxes=[]; V.sets=0;
Object.defineProperty(V,'innerHTML',{get(){return _vh},set(x){_vh=x;V.sets++;gen++;boxes=null}});
function mkBoxes(){ const out=[]; const re=/<(section|aside|div) class="([^"]*)"( data-lane="(\w+)")?[^>]*>/g; let m, lane=null;
  while((m=re.exec(_vh))){ if(m[4]) lane=m[4]; if(/(^| )scroll( |$)/.test(m[2])){ const ln=/lane/.test(m[2])?null:lane; out.push({scrollTop:0,gen,ln:m[0].includes('class="scroll"')?lane:null,closest(s){return s==='[data-lane]'&&this.ln?{getAttribute:()=>this.ln}:null}}) } }
  return out }
V.querySelectorAll=(q)=>{ if(q==='.scroll'){ if(!boxes) boxes=mkBoxes(); return boxes } return [] };
const i18nEls=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>{const e=mk('i18n:'+m[1]);e.attrs['data-i18n']=m[1];return e});
const ariaEls=[...html.matchAll(/data-i18n-aria="([^"]+)"/g)].map(m=>{const e=mk('aria:'+m[1]);e.attrs['data-i18n-aria']=m[1];return e});
global.document={title:'',getElementById:el,addEventListener(e,f){(docL[e]=docL[e]||[]).push(f)},documentElement:{lang:''},
 querySelectorAll:(q)=>q==='[data-i18n]'?i18nEls:q==='[data-i18n-aria]'?ariaEls:[]};
const winL={}; global.location={hash:'',reloads:0,reload(){this.reloads++}};
global.window={addEventListener:(e,f)=>{winL[e]=f},scrollY:0,pageYOffset:0,scrollTo(x,y){this.scrollY=this.pageYOffset=y;this.scrolled=(this.scrolled||0)+1}};
const T=new Date(); const iso=d=>d.toISOString().slice(0,10); const add=n=>{const d=new Date(T.getFullYear(),T.getMonth(),T.getDate()+n,12);return iso(d)};
const TODAY=add(0); const weekday=![0,6].includes(T.getDay());
const updates=[]; let snapCbs=[];
const ownerTodos=[
 {id:'A',title:'TASK_A_P2_due_tomorrow',kind:'ask',from:'Alpha (Dev)',tier:'week',priority:'P2',due:add(1),source:'teams',url:'https://teams.microsoft.com/x',status:'open',firstSeen:add(-1),plannedFor:TODAY},
 {id:'B',title:'TASK_B_P0_nodue',kind:'ask',from:'Beta (Dev)',tier:'now',priority:'P0',due:'',source:'teams',status:'open',firstSeen:TODAY,plannedFor:TODAY},
 {id:'C',title:'TASK_C_P1_nodue_older',kind:'ask',from:'Gamma (Dev)',tier:'now',priority:'P1',due:'',source:'teams',status:'open',firstSeen:add(-5),plannedFor:TODAY},
 {id:'D',title:'TASK_D_P3_overdue',kind:'ask',from:'Delta (Dev)',tier:'watch',priority:'P3',due:add(-1),source:'outlook',status:'open',firstSeen:add(-3),plannedFor:TODAY},
 {id:'E',title:'TASK_E_legacy_noprio',kind:'ask',from:'Eps (Dev)',tier:'watch',due:'',source:'teams',status:'open',firstSeen:TODAY,plannedFor:TODAY},
];
globalThis.__calls=[]; globalThis.__jira={desc:'',html:false,sp:null,editErr:null,readErr:null};
const mcpMock={callTool:(srv,tool,inp,opt)=>{ __calls.push({srv,tool,inp:JSON.parse(JSON.stringify(inp)),opt}); const J=__jira;
  if(srv!=='Atlassian') return Promise.reject({code:'server_not_connected'});
  if(tool==='getJiraIssue'){ if(J.readErr) return Promise.reject(J.readErr); return Promise.resolve({payload:{key:inp.issueIdOrKey,fields:{summary:'x',description:J.desc,'Story Points':J.sp},appliedContentFormat:J.html?'html':'markdown'}}) }
  if(tool==='editJiraIssue'){ if(J.editErr) return Promise.reject(J.editErr); if(inp.fields&&'description' in inp.fields) J.desc=inp.fields.description; if(inp.additional_fields) J.sp=inp.additional_fields['Story Points']; return Promise.resolve({payload:{ok:true}}) }
  return Promise.reject({code:'bad_request'}) }};
globalThis.__mcp=mcpMock;
if (owner) window.claude={use:(k)=>Promise.resolve(k==='user'?{isOwner:()=>true}:k==='mcp'?globalThis.__mcp:{
  collection:(name)=>{const q={orderBy:()=>q,limit:()=>q,onSnapshot:(cb)=>{snapCbs.push(()=>cb({docs:name==='todos'?ownerTodos.map(o=>({id:o.id,data:()=>o})):name==='days'?[{data:()=>({date:TODAY,top3:['B','A','C'],timeline:[],generatedAt:TODAY+'T19:03:00+07:00'})}]:[]}))}};return q},
  doc:(path)=>({onSnapshot:(cb)=>{const fire=()=>cb(path==='meta/settings'?{exists:!!settingsDoc,data:()=>JSON.parse(JSON.stringify(settingsDoc))}:{exists:true,data:()=>({displayName:'Test User',language:navLang,projects:[{id:'work',label:''}],signals:false})});snapByPath[path]=fire;snapCbs.push(fire)},
    update:(p)=>{updates.push([path,JSON.parse(JSON.stringify(p)),'update']);const o=ownerTodos.find(x=>'todos/'+x.id===path);if(o)Object.assign(o,JSON.parse(JSON.stringify(p)));return Promise.resolve()},
    set:(p)=>{updates.push([path,JSON.parse(JSON.stringify(p)),'set']);if(path==='meta/settings')settingsDoc=JSON.parse(JSON.stringify(p));return Promise.resolve()}})})};
if (owner) settingsDoc={language:navLang,signals:false,storeQuotes:true,channels:['teamsChats','teamsChannelMentions','outlookMail','jiraMail','calendar'],workHours:{start:'09:00',end:'18:00',days:[1,2,3,4,5]},vipPeople:[{name:'Boss One',why:'lead'}],keyChats:[{id:'19:x@thread.v2',topic:'Mobile chat'}],excludeChats:[{id:'19:fun@thread.v2',topic:'Fun chat'}],keywords:['SF-'],role:'Engineer',currentWork:'lending',timezone:'Asia/Ho_Chi_Minh',updatedAt:'2026-11-08T10:00:00.000Z',updatedBy:'skill'};
global.localStorage={getItem:()=>null,setItem(){}}; global.CSS={escape:s=>s};
Object.defineProperty(globalThis,'navigator',{value:{language:navLang},configurable:true,writable:true});
global.getComputedStyle=()=>({getPropertyValue:()=>''});
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
// The page calls window.__cataskTestHook (when defined) with its state, so this works on the minified build too.
window.__cataskTestHook=function(h){ globalThis.S=h.S; globalThis.__sig=h.setSignals };
eval(scripts[0]); if(!globalThis.S){ console.log('FAIL page did not call __cataskTestHook'); process.exit(1) }
const view=els.view;
function go(tab){ location.hash='#'+tab; winL.hashchange(); return view.innerHTML }
function change(id,checked){ view.L.change.forEach(f=>f({target:{getAttribute:k=>k==='data-check'?id:null,checked}})) }
function click(sel,attr,val){ const t={getAttribute:k=>k===attr?val:null,dataset:{}}; view.L.click.forEach(f=>f({preventDefault(){},target:{closest:s=>s===sel?t:null}})) }
const all=()=>[...html.matchAll(/x/g)];
function demoTests(){
  const tabs=['hom-nay','theo-nguoi','tuan','ngay','chi-phi'], out={};
  for(const tb of tabs){ out[tb]=go(tb); ok(out[tb].length>200, `${navLang} ${tb} renders (${out[tb].length})`) }
  const joined=Object.values(out).join('');
  ok(/class="pri p0"/.test(out['hom-nay']) && /class="pri p1"/.test(out['hom-nay']) && /class="pri p2"/.test(out['hom-nay']) && /class="pri p3"/.test(out['hom-nay']), 'P0..P3 badges on Today');
  ok(/class="pri p/.test(out['theo-nguoi']),'P badges on People'); ok(/class="pri p/.test(out['ngay']),'P badges on Day'); if(weekday) ok(/class="pri p/.test(out['tuan']),'P badges on Week');
  ok(!/Chép|Copy|data-copy/.test(noCpId(joined+els.howtoGrid.innerHTML)), 'no Chép/Copy buttons (besides copy-task-id)');
  ok(/data-view="demo-2"/.test(out['theo-nguoi']), 'View message button in People');
  ok(/class="flag"/.test(out['hom-nay']), 'VIP/key-chat flags render');
  // people tab mark done + undo
  go('theo-nguoi'); change('demo-2',true);
  let td=S.allTodos.find(x=>x.id==='demo-2'); ok(td.status==='done'&&td.doneAt===TODAY&&td.movedBy==='user'&&td.prevStatus==='open','people: mark done');
  ok(/class="it is-done" data-id="demo-2"/.test(view.innerHTML),'people: struck through after re-render');
  change('demo-2',false); ok(td.status==='open'&&td.doneAt===null,'people: undo restores open');
  change('demo-5',true); change('demo-5',false); ok(S.allTodos.find(x=>x.id==='demo-5').status==='waiting','people: undo restores waiting');
  // top3
  go('hom-nay'); change('demo-1',true); ok(S.allTodos.find(x=>x.id==='demo-1').status==='done','top3/board: mark done');
  ok(/<li class="is-done">/.test(view.innerHTML),'top3: li struck through');
  change('demo-1',false);
  // week undo
  if(weekday){ go('tuan'); ok(/data-check="demo-8" checked/.test(view.innerHTML),'week: done task has checked box');
  change('demo-8',false); ok(S.allTodos.find(x=>x.id==='demo-8').status==='open','week: untick reopens'); } else console.log('SKIP week (today is a weekend; Week tab shows Mon-Fri)');
  // day timeline
  const dh=go('ngay'); ok(/data-check="demo-4"/.test(dh),'day: todo milestone has checkbox');
  change('demo-4',true); ok(S.allTodos.find(x=>x.id==='demo-4').status==='done','day: mark done');
  // priority cycle
  go('hom-nay'); click('[data-pri]','data-pri','demo-3'); ok(S.allTodos.find(x=>x.id==='demo-3').priority==='P3'&&S.allTodos.find(x=>x.id==='demo-3').priorityBy==='user','priority cycles P2->P3 with priorityBy user');
  // view message
  go('theo-nguoi'); click('[data-view]','data-view','demo-2');
  const d=els.msgDlg.innerHTML;
  ok(els.msgBack.hidden===false,'dialog opens');
  ok(d.includes(navLang==='vi'?'Lỗi đăng nhập trên Android 12':'Android 12 login bug is still there'),'dialog shows quote text');
  ok(d.includes('href="https://teams.microsoft.com/"') && d.includes(navLang==='vi'?'Mở trong Teams ↗':'Open in Teams ↗'),'dialog has open-in-Teams link');
  ok(/role="dialog"/.test(html)&&/aria-modal="true"/.test(html),'dialog aria');
  ok(d.includes(navLang==='vi'?'Trích lúc':'Quoted at'),'dialog shows quoted-at');
  docL.keydown.forEach(f=>f({key:'Escape',preventDefault(){}})); ok(els.msgBack.hidden===true,'Esc closes dialog');
  // no-quote item: link fallback only (demo-6 has no quote, no url -> hidden)
  const seg=(h,id)=>((h.split('data-id="'+id+'"')[1]||'').split('class="it')[0]);
  let ph=go('theo-nguoi'); ok(/data-view="demo-6"/.test(seg(ph,'demo-6')),'no quote/url but why -> Xem tin button shown');
  click('[data-view]','data-view','demo-6'); const d6=els.msgDlg.innerHTML;
  ok(els.msgBack.hidden===false && d6.includes(navLang==='vi'?'Chưa có trích đoạn':'No excerpt yet'),'no-quote dialog shows no-excerpt note');
  ok(d6.includes(navLang==='vi'?'Gấu Trúc hẹn gửi trong hôm nay.':'Pat said they’d send them today.') && !/dlg-open/.test(d6) && !/<blockquote>/.test(d6),'no-quote dialog shows why, no blockquote, no open link');
  docL.keydown.forEach(f=>f({key:'Escape',preventDefault(){}}));
  dlgSigTests();
  const t6=S.allTodos.find(x=>x.id==='demo-6'), why6=t6.why; t6.why='';
  ph=go('theo-nguoi'); ok(!/view-msg/.test(seg(ph,'demo-6')),'no quote + no url + no why -> button hidden'); t6.why=why6;
  // Xem tin visible on every surface
  const th=go('hom-nay');
  ok(/<div class="who"><span class="who-l">[\s\S]*?<\/span><button type="button" class="view-msg" data-view="demo-1"/.test(th),'board card: Xem tin pill in who row');
  ok(!/<div class="moves">[^]*?view-msg/.test(th.split('<div class="moves">').slice(1).map(x=>x.split('</div>')[0]).join('')),'Xem tin not inside hover-only moves');
  ok(!/class="open-link"[^>]*>(Mở|Open) ↗<\/a><\/div><div class="moves">/.test(th) && !/<div class="meta">[^<]*(<span[^>]*>[^<]*<\/span>)*<a class="open-link"/.test(th),'board card: separate Mở ↗ link removed');
  const rail=th.split('class="three"')[1].split('</ol>')[0]; ok(/data-view="demo-/.test(rail),'top-3 rail has Xem tin');
  ok(/class="tt-link" data-view="demo-1"/.test(th),'task title opens dialog (tt-link)');
  if(weekday){ const t8=S.allTodos.find(x=>x.id==='demo-8'), q8=t8.quote; delete t8.quote; t8.status='done'; t8.doneAt=TODAY; ok(!/data-view="demo-8"/.test(go('tuan')),'week item without quote/url/why: no button');
    t8.url='https://teams.microsoft.com/'; ok(/class="view-msg" data-view="demo-8"/.test(go('tuan')),'week item with url: Xem tin'); delete t8.url; t8.quote=q8 }
  ok(/class="view-msg" data-view="demo-4"/.test(go('ngay')),'day item mapped to todo has Xem tin');
  ok(/class="tx tt-link" data-view="demo-4"/.test(go('ngay')),'day title opens dialog');
  ok(/&#x1F4AC;/.test(th),'speech-bubble icon');
  // scroll preserved on full re-render (mark done) and no re-render on priority change
  go('hom-nay'); const bx=V.querySelectorAll('.scroll'); const tl=bx.find(b=>b.ln==='today'); ok(!!tl,'fake layout finds today lane');
  if(tl){ tl.scrollTop=240; const g0=gen; window.scrollY=window.pageYOffset=500;
    change('demo-1',true); ok(gen>g0,'mark done re-renders');
    const tl2=V.querySelectorAll('.scroll').find(b=>b.ln==='today'); ok(tl2&&tl2!==tl&&tl2.scrollTop===240,'lane scrollTop restored after re-render');
    ok(window.scrollY===500,'window scroll unchanged after re-render'); change('demo-1',false);
    const tl3=V.querySelectorAll('.scroll').find(b=>b.ln==='today'); tl3.scrollTop=180; const n0=V.sets, g1=gen;
    click('[data-pri]','data-pri','demo-1'); ok(V.sets===n0 && gen===g1,'priority click: no full re-render (in-place badge swap)');
    ok(V.querySelectorAll('.scroll').find(b=>b.ln==='today').scrollTop===180 && window.scrollY===500,'priority click: lane + window scroll unchanged');
  }
  ok(STYLE.includes('.view.anim>*') && !/(^|[}])\.view>\*\{animation/.test(STYLE),'view enter animation only on tab switch');
}
/* ---- signals in the View message dialog ---- */
const esc2=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function openD(id){ click('[data-view]','data-view',id); const d=els.msgDlg.innerHTML; docL.keydown.forEach(f=>f({key:'Escape',preventDefault(){}})); return d }
function dlgSigTests(){
  const en=navLang==='en', head=en?'Communication signals':'Tín hiệu giao tiếp';
  const t2=S.allTodos.find(x=>x.id==='demo-2'), t8=S.allTodos.find(x=>x.id==='demo-8'), t6=S.allTodos.find(x=>x.id==='demo-6');
  ok(t2.quote&&t2.signals.some(s=>s.type==='silent_treatment'),'demo: quoted todo with silent_treatment');
  ok(t8.quote&&t8.signals.some(s=>s.type==='kudos'),'demo: quoted todo with kudos');
  __sig(false); go('theo-nguoi');
  let d=openD('demo-2'); ok(!/dlg-sig/.test(d)&&!d.includes(head),'signals off: no signals row in dialog, no heading');
  __sig(true); go('theo-nguoi');
  d=openD('demo-2'); const lab=en?'Silent treatment':'Silent treatment', note=esc2(t2.signals[0].note);
  ok(/<section class="dlg-sig" aria-labelledby="dlgSigH"><h3 id="dlgSigH">/.test(d)&&d.includes(head),'signals on: dialog signals row with accessible heading');
  ok(d.includes('<span class="tag">'+lab+'</span>')&&!/<button[^>]*class="tag/.test(d),'dialog badge is a plain span (not a button)');
  ok(d.includes('<li><b>'+lab+'</b>: '+note+'</li>'),'dialog lists label in bold + note');
  const iq=d.indexOf('</blockquote>'), is=d.indexOf('<section class="dlg-sig"'), inote=d.indexOf('class="dlg-note"');
  ok(iq>0&&is===iq+'</blockquote>'.length&&is<inote,'signals row directly after the quote, before the quoted-at note');
  d=openD('demo-8'); const kl=en?'Kudos':'Được ghi nhận';
  ok(d.includes('<span class="tag good">'+kl+'</span>')&&d.includes('<li class="good"><b>'+kl+'</b>'),'kudos uses good style in dialog');
  const sv=t6.signals; t6.signals=[{type:'false_urgency',note:'FALLBACK_NOTE'}];
  d=openD('demo-6'); const iw=d.indexOf('class="dlg-why"'), iwEnd=d.indexOf('</p>',iw), is6=d.indexOf('class="dlg-sig"');
  ok(!/<blockquote>/.test(d)&&iw>0&&is6>iwEnd&&is6<d.indexOf('class="dlg-note"')&&d.includes('FALLBACK_NOTE'),'fallback dialog: signals row after Context block');
  t6.signals=sv;
  if(en){ const all=['demo-2','demo-8'].map(openD).join(''); ok(!VI.test(all),'EN dialog: no VI strings') }
  ok(/\.card[^{]*\{|class="tag/.test(go('hom-nay'))&&/<button type="button" class="tag[^"]*" aria-expanded="false" aria-controls=/.test(view.innerHTML),'card badges unchanged (toggle buttons)');
  __sig(false); go('theo-nguoi');
}

/* ---- hand to AI ---- */
const D=()=>els.msgDlg;
function dclick(attr,val){ const t={getAttribute:k=>k===attr?String(val):null}; els.msgBack.L.click.forEach(f=>f({preventDefault(){},target:{closest:s=>s==='['+attr+']'?t:null}})) }
function dchange(attr,val,props){ (D().L.change||[]).forEach(f=>f({target:Object.assign({getAttribute:k=>k===attr?val:null},props||{})})) }
function dinput(value){ (D().L.input||[]).forEach(f=>f({target:{getAttribute:k=>k==='data-ai-note'?'':null,value}})) }
function escD(){ docL.keydown.forEach(f=>f({key:'Escape',preventDefault(){},target:{}})) }
function aiDemoTests(){
  const en=navLang==='en', T=id=>S.allTodos.find(x=>x.id===id);
  let h=go('hom-nay');
  ok(/data-ai-req="demo-1"/.test(h)&&/data-ai-req="demo-5"/.test(h),'AI button on open + waiting tasks');
  ok(!/data-ai-req="demo-8"/.test(h),'AI button hidden on done task');
  ok(/class="ai-chip ai-queued" data-ai-open="demo-3"/.test(h)&&/class="ai-chip ai-running" data-ai-open="demo-4"/.test(h)&&/class="ai-chip ai-needs_review" data-ai-open="demo-2"/.test(h),'chips per status on board');
  ok(!/data-ai-req="demo-[234]"/.test(h),'chip replaces the button');
  ok(h.includes(en?'⏳ Waiting for AI':'⏳ Chờ AI')&&h.includes(en?'🤖 AI working':'🤖 AI đang làm')&&h.includes(en?'✨ AI done — view':'✨ AI xong — xem'),'chip labels');
  const rail=h.split('class="three"')[1].split('</ol>')[0]; ok(/data-ai-open="demo-2"/.test(rail)&&/data-ai-req="demo-1"/.test(rail),'top-3 has AI chip/button');
  const ph=go('theo-nguoi'); ok(/data-ai-open="demo-2"/.test(ph)&&/data-ai-req="demo-1"/.test(ph),'people rows have AI chip/button');
  ok(/class="tally-ai" data-ai-open="demo-2"[^>]*><b>2<\/b><span>✨ (AI ready|AI xong)<\/span>/.test(els.tally.innerHTML),'masthead ✨ 1 AI ready');
  ok(STYLE.includes('no-preference){.ai-chip.ai-running{animation')&&STYLE.includes('prefers-reduced-motion:reduce){*'),'running pulse only with motion allowed');
  // msg dialog footer
  click('[data-view]','data-view','demo-1'); ok(/data-ai-req="demo-1"/.test(D().innerHTML),'View message dialog footer has AI button');
  dclick('data-ai-req','demo-1'); ok(S.dlgMode==='req'&&/data-ai-kind="custom"/.test(D().innerHTML)&&els.msgBack.hidden===false,'footer button switches dialog to request form'); escD();
  // request form
  go('hom-nay'); click('[data-ai-req]','data-ai-req','demo-1'); let f=D().innerHTML;
  ok(/<fieldset class="ai-kinds"><legend>/.test(f)&&(f.match(/type="radio" name="ai-kind"/g)||[]).length===4&&/value="draft_reply" data-ai-kind="draft_reply" checked/.test(f),'form: teams chips (4), draft_reply preselected, legend');
  ok(/<label class="ai-note-l" for="aiNote">/.test(f)&&/id="aiNote"[^>]*maxlength="300"/.test(f)&&f.includes(en?'AI only drafts — you send it yourself.':'AI chỉ soạn nháp — bạn tự gửi.'),'form: labelled instruction (300) + safety note');
  ok(/data-ai-read/.test(f)&&f.includes(en?'Re-read the source message':'Đọc lại tin gốc để có thêm bối cảnh'),'form: readSource checkbox');
  if(en) ok(!VI.test(f),'EN form: no VI strings');
  dchange('data-ai-kind','custom'); ok(D().innerHTML.includes(en?'required for &quot;Other…&quot;':'bắt buộc với &quot;Khác…&quot;'),'custom marks note required');
  const t1=T('demo-1'), n0=V.sets; dclick('data-ai-submit',''); ok(!t1.ai&&/role="alert"/.test(D().innerHTML)&&S.dlgMode==='req','custom without note blocked');
  dinput('Viết ngắn gọn '+'x'.repeat(400)); dchange('data-ai-read','',{checked:true}); dclick('data-ai-submit','');
  ok(t1.ai&&t1.ai.status==='queued'&&t1.ai.kind==='custom'&&t1.ai.note.length===300&&t1.ai.readSource===true&&t1.ai.attempt===1&&t1.ai.updatedBy==='page'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/.test(t1.ai.requestedAt)&&Array.isArray(t1.ai.steps),'submit writes ai.queued with kind/note/readSource '+JSON.stringify(t1.ai&&{s:t1.ai.status,k:t1.ai.kind}));
  ok(els.msgBack.hidden===true&&!els.snack.hidden&&/data-undo/.test(els.snack.innerHTML)&&els.snack.innerHTML.includes(en?'Handed to AI':'Đã giao AI')&&/&#x1F916;/.test(els.snack.innerHTML),'dialog closes, snackbar with Undo');
  ok(/class="ai-chip ai-queued" data-ai-open="demo-1"/.test(go('hom-nay')),'card now shows queued chip');
  snackClick('[data-undo]'); ok(t1.ai===null&&t1.status==='open'&&/data-ai-req="demo-1"/.test(go('hom-nay')),'undo restores no-ai (null) and the button');
  // panel needs_review
  click('[data-ai-open]','data-ai-open','demo-2'); let d=D().innerHTML; const t2=T('demo-2');
  ok(S.dlgMode==='ai'&&/id="msgTitle"/.test(d)&&d.includes(esc2(t2.ai.result.text.split('\n')[0]))&&/class="ai-result"/.test(d),'panel shows result text');
  ok(/data-copy[^>]*>📋 (Copy|Chép)</.test(d)&&/<ul class="ai-src"><li><a href="https:\/\/teams.microsoft.com\/" target="_blank" rel="noopener">/.test(d)&&/<ol class="ai-steps">/.test(d),'panel: copy button, sources, steps');
  ok(/data-ai-act="accept"/.test(d)&&/data-ai-act="redo"/.test(d)&&/data-ai-act="cancel"/.test(d)&&d.includes(en?'AI only drafts':'AI chỉ soạn nháp'),'needs_review actions + safety note');
  if(en) ok(!VI.test(d),'EN panel: no VI strings');
  const resText=t2.ai.result.text; let copied=null; navigator.clipboard={writeText:x=>{copied=x;return Promise.resolve()}}; dclick('data-copy','');
  globalThis.__chain.push(async()=>{ await wait(5); ok(copied===resText&&S.lastCopy==='aiCopied','copy writes result text to clipboard'); delete navigator.clipboard });
  dclick('data-ai-act','accept'); ok(t2.ai.status==='accepted'&&t2.ai.result&&els.msgBack.hidden,'accept -> accepted, keeps result');
  ok(!/data-ai-open="demo-2"/.test(go('hom-nay'))&&/data-ai-req="demo-2"/.test(view.innerHTML)&&/class="tally-ai" data-ai-open="demo-9"[^>]*><b>1<\/b>/.test(els.tally.innerHTML),'accepted: chip gone, button back, tally count drops to 1');
  snackClick('[data-undo]'); ok(t2.ai.status==='needs_review','undo accept');
  go('hom-nay'); click('[data-ai-open]','data-ai-open','demo-2'); dinput('ngắn hơn'); dclick('data-ai-act','redo');
  ok(t2.ai.status==='queued'&&t2.ai.attempt===2&&t2.ai.note==='ngắn hơn'&&!t2.ai.result&&t2.ai.steps.length===0,'redo -> queued, attempt+1, new note, result cleared');
  const t4=T('demo-4'); go('hom-nay'); click('[data-ai-open]','data-ai-open','demo-4'); d=D().innerHTML;
  ok(/data-ai-act="cancel"/.test(d)&&!/data-ai-act="accept"/.test(d)&&d.includes(t4.ai.steps[1].text),'running panel: steps + cancel only');
  dclick('data-ai-act','cancel'); ok(t4.ai.status==='cancelled'&&!/data-ai-open="demo-4"/.test(go('hom-nay')),'cancel -> cancelled, chip gone');
  const t3=T('demo-3'); t3.ai=Object.assign({},t3.ai,{status:'error',error:'Không đọc được thread'}); go('hom-nay');
  ok(/class="ai-chip ai-error" data-ai-open="demo-3"/.test(view.innerHTML),'error chip');
  click('[data-ai-open]','data-ai-open','demo-3'); ok(/class="ai-err" role="alert"/.test(D().innerHTML)&&/data-ai-act="retry"/.test(D().innerHTML),'error panel shows error + retry');
  dclick('data-ai-act','retry'); ok(t3.ai.status==='queued'&&t3.ai.attempt===2&&!t3.ai.error,'retry -> queued attempt 2');
  // live refresh of an open panel
  click('[data-ai-open]','data-ai-open','demo-3'); t3.ai=Object.assign({},t3.ai,{status:'running',steps:[{at:TODAY+'T18:30:00+07:00',text:'LIVE_STEP'}]}); render0();
  ok(D().innerHTML.includes('LIVE_STEP')&&/ai-chip ai-running/.test(D().innerHTML),'open panel refreshes on data change'); escD();
  ok(!/Chép|Copy|data-copy/.test(noCpId(['hom-nay','theo-nguoi','tuan','ngay'].map(go).join(''))),'no copy button outside the AI panel (besides copy-task-id)');
  openSet(); ok(/data-set-tg="aiAgent" checked/.test(P().innerHTML),'demo: AI switch on'); pchange('data-set-tg','aiAgent',{checked:false});
  ok(!/data-ai-|ai-chip/.test(go('hom-nay'))&&!/tally-ai/.test(els.tally.innerHTML),'demo: switching off hides AI UI locally');
  pclick('data-set-cancel'); ok(/data-ai-/.test(go('hom-nay')),'demo: cancel brings AI UI back');
}
/* ---- new AI form: chips per source, apply option, context ---- */
function dinA(attr,value){ (D().L.input||[]).forEach(f=>f({target:{getAttribute:k=>k===attr?'':null,value}})) }
const kinds=h=>[...h.matchAll(/data-ai-kind="(\w+)"/g)].map(m=>m[1]).join(',');
function aiFormTests(){
  const en=navLang==='en', T=id=>S.allTodos.find(x=>x.id===id);
  go('hom-nay');
  click('[data-ai-req]','data-ai-req','demo-1'); let f=D().innerHTML;
  ok(kinds(f)==='draft_reply,summary,draft_nudge,custom','teams chips: reply, summary(thread), nudge, other');
  ok(f.includes(en?'Summarize the thread':'Tóm tắt thread')&&f.includes(en?'Draft a nudge':'Soạn tin nhắc'),'teams chip labels');
  ok(!/data-ai-mode/.test(f),'teams task: no apply option');
  ok(/<h2 id="msgTitle">/.test(f)&&f.includes(esc2(T('demo-1').title))&&/<details class="ai-known"><summary>/.test(f),'header: task title + collapsed "AI already knows"');
  const kb=f.split('class="ai-known"')[1].split('</details>')[0];
  ok(kb.includes(esc2(T('demo-1').why))&&kb.includes('<q>')&&kb.includes(en?'Olive Owl':'Cú Mèo')&&kb.includes('09:12')&&kb.includes('href="https://teams.microsoft.com/"')&&/<dd>P[0-3]<\/dd>/.test(kb),'known block: why, quote with sender/time, link, priority');
  ok(/id="aiNote"[^>]*>[^<]+<\/textarea>/.test(f),'instruction prefilled from the default chip');
  ok(/<textarea id="aiCtx" class="set-in ai-ctx" data-ai-ctx rows="5" maxlength="2000" placeholder="[^"]+"/.test(f)&&/data-cnt="ctx">0\/2000</.test(f),'context textarea: 2000 limit, counter, placeholder');
  ok(/class="dlg-actions ai-foot"/.test(f)&&STYLE.includes('.ai-foot{position:sticky'),'sticky footer buttons');
  ok(f.includes(en?'Hand over: draft':'Giao soạn nháp'),'submit label for draft mode');
  if(en) ok(!VI.test(f),'EN form (teams): no VI strings');
  dchange('data-ai-kind','summary'); ok(S.aiForm.note===(en?'Summarize: who needs what, by when, where it stands, the next step.':'Tóm tắt: ai cần gì, hạn khi nào, đang ở đâu, bước tiếp theo.'),'chip change replaces an untouched prefill');
  dinput('MY OWN'); dchange('data-ai-kind','draft_nudge'); ok(S.aiForm.note==='MY OWN','chip change keeps a user-written instruction');
  dinA('data-ai-ctx','y'.repeat(2500)); ok(S.aiForm.context.length===2000,'context capped at 2000');
  escD();
  click('[data-ai-req]','data-ai-req','demo-7'); f=D().innerHTML;
  ok(kinds(f)==='meeting_prep,custom','calendar chips: meeting prep + other'); escD();
  // jira task (demo-9 is in review; use a fresh request on a copy-free state)
  const t9=T('demo-9'), a9=t9.ai; t9.ai=null; go('hom-nay');
  click('[data-ai-req]','data-ai-req','demo-9'); f=D().innerHTML;
  ok(kinds(f)==='jira_description,jira_ac,jira_estimate,summary,code,custom','jira chips: description, AC, estimate, summary(ticket), code, other');
  ok(f.includes(en?'Summarize the ticket':'Tóm tắt ticket'),'jira summary label');
  ok(/data-ai-mode="draft" checked/.test(f)&&/data-ai-mode="apply"/.test(f)&&f.includes('MOB-2048'),'jira kind: apply option shown, draft default');
  ok(f.includes(en?'click “Approve &amp; update Jira” and confirm':'bấm “Duyệt &amp; cập nhật Jira” và xác nhận'),'apply sub-line');
  if(en) ok(!VI.test(f),'EN form (jira): no VI strings');
  dchange('data-ai-mode','apply'); f=D().innerHTML;
  ok(f.includes(en?'Hand over: draft for Jira':'Giao soạn để cập nhật')&&f.includes(en?'AI never writes to Jira itself':'AI không tự ghi lên Jira'),'apply mode: submit label + safety line');
  dchange('data-ai-kind','summary'); ok(!/data-ai-mode/.test(D().innerHTML)&&S.aiForm.mode==='draft','non-jira kind hides apply and resets to draft');
  dchange('data-ai-kind','jira_estimate'); dchange('data-ai-mode','apply');
  dinput('Ước lượng giúp'); dinA('data-ai-ctx','CTX partner'); dchange('data-ai-read','',{checked:true}); dclick('data-ai-submit','');
  const q=t9.ai;
  ok(q&&q.status==='queued'&&q.kind==='jira_estimate'&&q.instruction==='Ước lượng giúp'&&q.note==='Ước lượng giúp'&&q.context==='CTX partner'&&q.mode==='apply'&&q.readSource===true,'submit stores kind/instruction/note/context/mode');
  ok(q&&JSON.stringify(q.target)===JSON.stringify({system:'jira',issueKey:'MOB-2048',field:'storyPoints',cloudId:'example.atlassian.net'}),'submit stores target {system, issueKey, field, cloudId} '+JSON.stringify(q&&q.target));
  // url-only key
  const t3=T('demo-3'), a3=t3.ai, u3=t3.url; t3.ai=null; t3.url='https://x.atlassian.net/browse/ABC-12'; go('hom-nay');
  click('[data-ai-req]','data-ai-req','demo-3'); ok(/data-ai-kind="jira_description"/.test(D().innerHTML)&&/ABC-12/.test(D().innerHTML),'jira key parsed from url when no ref'); escD();
  t3.url=u3; t3.ai=a3; t9.ai=a9; go('hom-nay');
  // legacy kind still displays
  const t4=T('demo-4'), a4=t4.ai; t4.ai=Object.assign({},a4,{kind:'draft'}); click('[data-ai-open]','data-ai-open','demo-4');
  ok(D().innerHTML.includes(en?'Draft a reply':'Soạn nháp trả lời'),'legacy kind "draft" displays'); escD(); t4.ai=a4;
}
function aiApplyDemoTests(){
  const en=navLang==='en', T=id=>S.allTodos.find(x=>x.id===id);
  let h=go('hom-nay');
  ok(/class="ai-chip ai-applied" data-ai-open="demo-10"/.test(h)&&h.includes(en?'🔗 Updated in Jira':'🔗 Đã cập nhật Jira'),'applied chip on board');
  const t9=T('demo-9');
  click('[data-ai-open]','data-ai-open','demo-9'); let d=D().innerHTML;
  ok(d.includes(en?'Current in Jira':'Hiện tại trên Jira')&&d.includes(en?'(empty)':'(đang trống)'),'apply panel: before (empty)');
  ok(/<textarea id="aiAfter" class="set-in ai-after" data-ai-after/.test(d)&&d.includes(esc2(t9.ai.result.proposed.after.split('\n')[0])),'apply panel: editable after');
  ok(/data-ai-act="apply"[^>]*>(Approve &amp; update Jira|Duyệt &amp; cập nhật Jira)</.test(d)&&/data-ai-act="redo"/.test(d)&&/data-ai-act="cancel"/.test(d)&&/data-copy/.test(d),'apply panel: approve, redo, cancel, copy');
  ok(d.includes('MOB-2048 · '+(en?'description':'mô tả')),'panel meta: target');
  if(en) ok(!VI.test(d),'EN apply panel: no VI strings');
  dinA('data-ai-after','EDITED AFTER');
  dclick('data-ai-act','apply'); d=D().innerHTML;
  ok(/class="ai-confirm"/.test(d)&&d.includes(en?'Overwrite the description of MOB-2048':'Ghi đè mô tả của MOB-2048')&&/data-ai-act="apply-ok"/.test(d)&&!/data-ai-act="apply"[ >]/.test(d),'confirm step inside the panel');
  dclick('data-ai-act','apply-no'); ok(!/ai-confirm/.test(D().innerHTML)&&S.aiForm.after==='EDITED AFTER','confirm cancel keeps the edit');
  dclick('data-ai-act','apply'); dclick('data-ai-act','apply-ok');
  ok(t9.ai.status==='applied'&&t9.ai.result.proposed.after==='EDITED AFTER'&&t9.ai.appliedAt&&t9.ai.result.appliedUrl==='https://example.atlassian.net/browse/MOB-2048','demo apply: applied locally with edited after + link');
  ok(!/data-undo/.test(els.snack.innerHTML)&&els.snack.innerHTML.includes('MOB-2048'),'no Undo for an external write');
  d=D().innerHTML; ok(/class="ai-ok"/.test(d)&&/href="https:\/\/example.atlassian.net\/browse\/MOB-2048"/.test(d),'panel shows "updated in Jira at…" with link');
  escD();
  // storyPoints validation
  t9.ai=Object.assign({},t9.ai,{status:'needs_review',target:Object.assign({},t9.ai.target,{field:'storyPoints'}),result:Object.assign({},t9.ai.result,{proposed:{field:'storyPoints',before:'',after:'abc'}})});
  click('[data-ai-open]','data-ai-open','demo-9'); ok(/<input id="aiAfter" class="set-in ai-sp"/.test(D().innerHTML),'story points: number input');
  dclick('data-ai-act','apply'); ok(/class="ai-err" role="alert"/.test(D().innerHTML)&&t9.ai.status==='needs_review','non-numeric story points blocked');
  dclick('data-ai-act','accept'); ok(t9.ai.status==='accepted','use it by hand -> accepted');
  escD();
}
/* ---- owner: page applies via the viewer's Atlassian connector (mcp) ---- */
async function aiMcpAsync(){
  const J=__jira; let en=document.documentElement.lang==='en';
  const base={id:'J',title:'TASK_J_jira',kind:'ask',from:'Jay (PM)',tier:'week',priority:'P2',source:'jira',url:'https://veepme.atlassian.net/browse/SF-3101',ref:{source:'jira',issueKey:'SF-3101'},status:'open',firstSeen:TODAY,plannedFor:add(1)};
  const mkAi=(o)=>Object.assign({status:'needs_review',kind:'jira_description',instruction:'',note:'',context:'',mode:'apply',target:{system:'jira',issueKey:'SF-3101',field:'description',cloudId:'veepme.atlassian.net'},requestedAt:TODAY+'T10:00:00+07:00',steps:[],attempt:1,updatedBy:'worker',
    result:{text:'note',proposed:{field:'description',before:'',after:'NEW DESC'}}},o||{});
  let Jt=S.allTodos.find(x=>x.id==='J'); if(!Jt){ Jt=JSON.parse(JSON.stringify(base)); S.allTodos.push(Jt); ownerTodos.push(Jt) }
  const reset=(o,mcp)=>{ Jt.ai=mkAi(o); S.mcpP=null; S.mcp=undefined; S.mcpBlocked=null; globalThis.__mcp=mcp===undefined?mcpMock:mcp; __calls.length=0; Object.assign(J,{desc:'',html:false,sp:null,editErr:null,readErr:null}); escD() };
  const open=async()=>{ click('[data-ai-open]','data-ai-open','J'); await wait(15); return D().innerHTML };
  // a) mcp null
  reset({},null); let d=await open(); en=document.documentElement.lang==='en'; console.log('INFO owner apply tests run in page language '+document.documentElement.lang);
  ok(d.includes(en?'Connect Atlassian on claude.ai to update from the page':'Kết nối Atlassian trên claude.ai để cập nhật từ trang')&&!/data-ai-act="apply"/.test(d)&&/data-copy/.test(d),'mcp null: no apply button, connect hint, copy kept');
  // b) success
  reset(); d=await open();
  const peek=__calls[0];
  ok(peek&&peek.srv==='Atlassian'&&peek.tool==='getJiraIssue'&&JSON.stringify(peek.inp)===JSON.stringify({cloudId:'veepme.atlassian.net',issueIdOrKey:'SF-3101',responseContentFormat:'markdown',view:'compact'})&&peek.opt&&peek.opt.cache===false,'review time: getJiraIssue read (fresh, compact markdown)');
  ok(/data-ai-act="apply"/.test(d),'mcp ok: apply button');
  dinA('data-ai-after','EDITED DESC'); dclick('data-ai-act','apply'); ok(__calls.length===1,'first click only shows the confirm (no call)');
  const n0=updates.length; dclick('data-ai-act','apply-ok'); await wait(30);
  const ed=__calls.filter(c=>c.tool==='editJiraIssue');
  ok(__calls[1]&&__calls[1].tool==='getJiraIssue','re-read right before applying');
  ok(ed.length===1&&JSON.stringify(ed[0].inp)===JSON.stringify({cloudId:'veepme.atlassian.net',issueIdOrKey:'SF-3101',fields:{description:'EDITED DESC'},contentFormat:'markdown'}),'editJiraIssue gets only the description '+JSON.stringify(ed[0]&&ed[0].inp));
  const w=updates.slice(n0).filter(x=>x[0]==='todos/J'); const wa=w.length&&w[w.length-1][1].ai;
  ok(wa&&wa.status==='applied'&&wa.appliedAt&&wa.result.appliedUrl==='https://veepme.atlassian.net/browse/SF-3101'&&wa.result.proposed.after==='EDITED DESC'&&wa.updatedBy==='page','db: ai applied + appliedAt + appliedUrl + edited after');
  ok(!/data-undo/.test(els.snack.innerHTML),'owner apply: no Undo');
  ok(/class="ai-ok"/.test(D().innerHTML)&&/class="ai-chip ai-applied"/.test(D().innerHTML),'panel switches to applied');
  // c) tool_error
  reset(); J.editErr={code:'tool_error',message:'Field description cannot be set'}; d=await open();
  const n1=updates.length; dclick('data-ai-act','apply'); dclick('data-ai-act','apply-ok'); await wait(30);
  ok(D().innerHTML.includes('Field description cannot be set')&&/class="ai-err" role="alert"/.test(D().innerHTML)&&Jt.ai.status==='needs_review'&&updates.length===n1,'tool_error: message shown, stays needs_review, no db write');
  ok(/data-ai-act="apply"/.test(D().innerHTML),'tool_error: can try again');
  // d) drift
  reset(); J.desc='SOMEONE EDITED'; d=await open();
  ok(d.includes('SOMEONE EDITED')&&d.includes(en?'Jira changed since AI read it':'Jira đã đổi từ lúc AI đọc'),'review shows live current value + drift note');
  dclick('data-ai-act','apply'); dclick('data-ai-act','apply-ok'); await wait(30);
  d=D().innerHTML; ok(/data-ai-act="apply-force"/.test(d)&&d.includes(en?'SF-3101 was edited after AI read it':'SF-3101 đã bị sửa từ lúc AI đọc')&&!__calls.some(c=>c.tool==='editJiraIssue'),'drift: second confirm required, no write yet');
  dclick('data-ai-act','apply-force'); await wait(30);
  ok(__calls.filter(c=>c.tool==='editJiraIssue').length===1&&Jt.ai.status==='applied','drift: overwrite after second confirm');
  // e) media guard (live read) + stored beforeMedia
  reset(); J.html=true; J.desc='<p>see <img src="x"></p>'; d=await open();
  ok(d.includes(en?'images or special formatting':'ảnh/định dạng đặc biệt')&&!/data-ai-act="apply"/.test(d)&&/data-copy/.test(d),'media guard: no apply, copy only');
  reset({result:{text:'n',proposed:{field:'description',before:'x',after:'y',beforeMedia:true}}}); d=await open();
  ok(!/data-ai-act="apply"/.test(d)&&__calls.length===0,'beforeMedia from worker: no apply, no read');
  // f) story points
  reset({kind:'jira_estimate',target:{system:'jira',issueKey:'SF-3101',field:'storyPoints',cloudId:'veepme.atlassian.net'},result:{text:'why',proposed:{field:'storyPoints',before:'',after:'8'}}}); d=await open();
  ok(__calls[0]&&__calls[0].inp.view==='evidence','story points read uses evidence view');
  dclick('data-ai-act','apply'); ok(D().innerHTML.includes(en?'Set the story points of SF-3101 to 8?':'Đặt story point của SF-3101 thành 8?'),'story points confirm text');
  dclick('data-ai-act','apply-ok'); await wait(30);
  const es=__calls.filter(c=>c.tool==='editJiraIssue')[0];
  ok(es&&JSON.stringify(es.inp)===JSON.stringify({cloudId:'veepme.atlassian.net',issueIdOrKey:'SF-3101',additional_fields:{'Story Points':8}}),'editJiraIssue gets only Story Points '+JSON.stringify(es&&es.inp));
  // g) not_granted on read
  reset(); J.readErr={code:'not_granted',message:'x'}; d=await open();
  ok(S.mcpBlocked==='not_granted'&&!/data-ai-act="apply"/.test(d)&&d.includes(en?'Connect Atlassian on claude.ai':'Kết nối Atlassian trên claude.ai'),'not_granted: apply hidden, connect hint');
  // h) server_not_connected on write path
  reset(); d=await open(); J.readErr={code:'server_not_connected',message:'x'}; dclick('data-ai-act','apply'); dclick('data-ai-act','apply-ok'); await wait(30);
  ok(S.mcpBlocked==='server_not_connected'&&!/data-ai-act="apply"/.test(D().innerHTML)&&!__calls.some(c=>c.tool==='editJiraIssue'),'server_not_connected: apply hidden, no write');
  // i) ambiguous write failure
  reset(); J.editErr={code:'server_unavailable',retryable:true,message:'x'}; d=await open(); dclick('data-ai-act','apply'); dclick('data-ai-act','apply-ok'); await wait(30);
  ok(D().innerHTML.includes(en?'Not sure whether Jira was updated':'Không rõ Jira đã cập nhật chưa')&&__calls.filter(c=>c.tool==='editJiraIssue').length===1,'ambiguous write error: says check Jira, no auto retry');
  if(en){ ok(!VI.test(D().innerHTML),'EN owner apply panel: no VI strings') } else console.log('SKIP EN owner panel check (page is in '+document.documentElement.lang+')');
  escD(); globalThis.__mcp=mcpMock;
}

function render0(){ winL.hashchange() }
function aiOwnerTests(){ globalThis.__chain.push(aiOwnerAsync) }
async function aiOwnerAsync(){
  const en=navLang==='en';
  const A=S.allTodos.find(x=>x.id==='A'); A.ai={status:'needs_review',kind:'draft',note:'',requestedAt:TODAY+'T10:00:00+07:00',steps:[],attempt:1,result:{text:'HIDDEN_RESULT'}};
  let h=go('hom-nay');
  ok(!/data-ai-req=|data-ai-open=|ai-chip/.test(h)&&!/tally-ai/.test(els.tally.innerHTML),'owner default (aiAgent off): no AI button, chip or tally');
  click('[data-ai-open]','data-ai-open','A'); ok(els.msgBack.hidden===true,'aiAgent off: AI panel cannot open');
  click('[data-view]','data-view','A'); ok(!/data-ai-/.test(D().innerHTML),'aiAgent off: no AI entry in View message dialog'); escD();
  ok(A.ai&&A.ai.result.text==='HIDDEN_RESULT','aiAgent off: ai data untouched');
  openSet(); ok(/id="sh-ai"/.test(P().innerHTML)&&/data-set-tg="aiAgent"(?! checked)/.test(P().innerHTML)&&/AI assistant \(beta\)|Trợ lý AI \(thử nghiệm\)/.test(P().innerHTML),'settings: AI section with switch, off');
  pchange('data-set-tg','aiAgent',{checked:true}); h=view.innerHTML;
  ok(/class="ai-chip ai-needs_review" data-ai-open="A"/.test(h)&&/data-ai-req="B"/.test(h)&&/tally-ai/.test(els.tally.innerHTML),'switch on: AI UI appears right away');
  pchange('data-set-tg','aiAgent',{checked:false}); ok(!/data-ai-/.test(view.innerHTML),'switch off again hides it');
  pchange('data-set-tg','aiAgent',{checked:true});
  const n0=updates.length; pclick('data-set-save'); await wait(30);
  const w=updates.slice(n0); const ws=w.find(x=>x[0]==='meta/settings'), wp=w.find(x=>x[0]==='meta/profile');
  ok(ws&&ws[1].aiAgent===true&&wp&&wp[1].aiAgent===true&&!S.setOpen,'save writes meta/settings.aiAgent + meta/profile.aiAgent');
  delete A.ai; h=go('hom-nay');
  ok(/data-ai-req="A"/.test(h),'owner: AI button on open task');
  S.canWrite=false; h=go('hom-nay'); ok(!/data-ai-req=/.test(h),'not writable (non-owner) -> AI button hidden'); S.canWrite=true;
  click('[data-ai-req]','data-ai-req','A'); dinput('short please'); const n=updates.length; dclick('data-ai-submit','');
  const w2=updates.slice(n); ok(w2.length===1&&w2[0][0]==='todos/A'&&w2[0][2]==='update'&&w2[0][1].ai.status==='queued'&&w2[0][1].ai.kind==='draft_reply'&&w2[0][1].ai.instruction==='short please'&&w2[0][1].ai.mode==='draft'&&!('target' in w2[0][1].ai)&&w2[0][1].ai.note==='short please'&&!('readSource' in w2[0][1].ai)&&Object.keys(w2[0][1]).sort().join()==='ai,updatedAt','owner: one db write {ai, updatedAt} '+JSON.stringify(w2.map(x=>x[1])));
  await wait(10); snackClick('[data-undo]'); await wait(20);
  const u=updates.filter(x=>x[0]==='todos/A').pop(); ok(u&&u[1].ai===null&&Object.keys(u[1]).sort().join()==='ai,updatedAt','owner: undo writes ai:null only');
}
function ownerTests(){
  const h=go('hom-nay'); const lane=h.split('data-lane="today"')[1].split('data-lane="tomorrow"')[0];
  const pos=k=>lane.indexOf(k);
  ok(pos('TASK_D')<pos('TASK_A'),'overdue first');
  ok(pos('TASK_A')<pos('TASK_B'),'P2 due tomorrow above P0 no due');
  ok(pos('TASK_B')<pos('TASK_C'),'P0 above P1 when neither has due');
  ok(pos('TASK_C')<pos('TASK_E'),'P1 above legacy watch (derived P3)');
  ok(/data-pri="E"[^>]*>P3</.test(h),'legacy tier watch -> P3');
  const rail=h.split('class="three"')[1].split('</ol>')[0]; ok(rail.indexOf('TASK_A')<rail.indexOf('TASK_B'),'top3 uses same comparator');
  change('B',true); const u=updates.pop(); ok(u&&u[0]==='todos/B'&&u[1].status==='done'&&u[1].movedBy==='user'&&u[1].prevStatus==='open'&&u[1].doneAt===TODAY,'owner: db write on mark done '+JSON.stringify(u&&u[1]));
  go('theo-nguoi'); change('B',false); /* same doc as the previous write: queued until it lands */
  const asyncB=new Promise(r=>setTimeout(()=>{ const u2=updates.pop(); ok(u2&&u2[0]==='todos/B'&&u2[1].status==='open'&&u2[1].doneAt===null&&u2[1].movedBy==='user','owner: db write on undo from People'); r() },20));
  globalThis.__chain.push(()=>asyncB);
  const n0=V.sets; click('[data-pri]','data-pri','C'); const u3=updates.pop(); ok(u3&&u3[1].priority==='P2'&&u3[1].priorityBy==='user','owner: priority write');
  ok(V.sets===n0,'owner: priority change does not re-render the view');
  const ph=go('theo-nguoi'); ok(/class="view-msg" data-view="A"/.test(ph),'owner: url but no quote -> Xem tin button');
  ok(!/data-view="B"/.test(ph),'owner: no quote/url/why -> no button');
  click('[data-view]','data-view','A'); const dA=els.msgDlg.innerHTML;
  ok(els.msgBack.hidden===false && dA.includes(navLang==='vi'?'Chưa có trích đoạn':'No excerpt yet') && dA.includes('href="https://teams.microsoft.com/x"'),'owner: no-excerpt dialog with open link');
  docL.keydown.forEach(f=>f({key:'Escape',preventDefault(){}}));
  { const A=S.allTodos.find(x=>x.id==='A'); A.signals=[{type:'after_hours',note:'OWNER_SIG_NOTE'}];
    __sig(false); let dd=openD('A'); ok(!/dlg-sig/.test(dd),'owner: signals off -> none in dialog');
    __sig(true); dd=openD('A'); ok(/class="dlg-sig"/.test(dd)&&dd.includes('OWNER_SIG_NOTE')&&dd.indexOf('class="dlg-sig"')<dd.indexOf('class="dlg-note"'),'owner: fallback dialog shows signals before the no-excerpt note');
    if(navLang==='en') ok(!VI.test(dd),'owner EN dialog: no VI strings');
    __sig(false); delete A.signals }
  // snapshot echo of our own write is skipped; a real change re-renders (coalesced)
  globalThis.__echoCheck=(done)=>{ const n1=V.sets; snapCbs[0]();
    setTimeout(()=>{ ok(V.sets===n1,'owner: echo snapshot skipped (no re-render)');
      ownerTodos.find(x=>x.id==='D').title='TASK_D_changed_remotely'; snapCbs[0](); snapCbs[0]();
      setTimeout(()=>{ ok(V.sets===n1+1 && /TASK_D_changed_remotely/.test(V.innerHTML),'owner: remote change -> one coalesced re-render'); done() },40) },40) };
}
/* ---- settings drawer + undo snackbar ---- */
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const P=()=>els.setPanel;
function pfire(type,target){ (P().L[type]||[]).forEach(f=>f({preventDefault(){},target})) }
function pclick(attr,val,extra){ const t={getAttribute:k=>k===attr?String(val):(extra&&extra[k]!=null?String(extra[k]):null)}; pfire('click',{closest:s=>s==='['+attr+']'?t:null}) }
function pchange(attr,val,props){ pfire('change',Object.assign({getAttribute:k=>k===attr?val:null},props)) }
function pinput(attr,val,value){ pfire('input',{getAttribute:k=>k===attr?val:null,value}) }
function openSet(){ els.setBtn.L.click.forEach(f=>f()) }
function escKey(){ docL.keydown.forEach(f=>f({key:'Escape',preventDefault(){},target:{}})) }
function snackClick(sel){ els.snack.L.click.forEach(f=>f({target:{closest:s=>s===sel?{}:null}})) }
function ctrlZ(target){ let pd=false; docL.keydown.forEach(f=>f({key:'z',ctrlKey:true,preventDefault(){pd=true},target})); return pd }
const UF=['status','plannedFor','doneAt','prevStatus','priority','priorityBy','movedBy','updatedAt'];
const pick=td=>JSON.stringify(UF.map(k=>td[k]===undefined?null:td[k]));
const btnLabel=()=>i18nEls.find(e=>e.attrs['data-i18n']==='setBtn').textContent;
const laneOf=(h,id)=>{ for(const l of ['today','tomorrow','waiting','done']){ const seg=(h.split('data-lane="'+l+'"')[1]||'').split('data-lane=')[0]; if(seg.includes('data-id="'+id+'"')) return l } return null };
function demoSettingsUndo(){
  const en=navLang==='en';
  ok(/id="setBtn"/.test(html)&&/data-i18n="setBtn"/.test(html)&&html.indexOf('id="infoBtn"')<html.indexOf('id="setBtn"'),'settings button in nav next to info');
  ok(btnLabel()===(en?'⚙ Settings':'⚙ Cài đặt'),'settings button label '+btnLabel());
  ok(/id="setPanel" role="dialog" aria-modal="true" aria-labelledby="setTitle"/.test(html),'settings dialog aria');
  openSet(); ok(els.setBack.hidden===false&&/id="setTitle"/.test(P().innerHTML),'settings opens');
  const ph=P().innerHTML;
  ok(['who','lang','ch','wh','vip','chat','kw','role','priv'].every(x=>ph.includes('id="sh-'+x+'"')),'all sections present');
  ok(/data-set-save disabled/.test(ph),'save disabled when nothing changed');
  ok(ph.includes('Asia/Ho_Chi_Minh')&&ph.includes(en?'update my profile':'cập nhật hồ sơ'),'identity read-only with hint');
  ok(en?!VI.test(ph):!/\b(Settings|Save|Cancel|Language|Working hours|Keywords|Privacy|Important people|Key chats|Add|Remove)\b/.test(ph),'panel i18n: no other-language UI strings');
  escKey(); ok(els.setBack.hidden===true&&!S.setOpen,'Esc closes settings');
  openSet(); pclick('data-set-x'); ok(els.setBack.hidden===true,'close button closes settings');
  openSet(); go('hom-nay'); ok(!/class="tag/.test(view.innerHTML),'signals off: no badges');
  pchange('data-set-tg','signals',{checked:true}); ok(/class="tag/.test(view.innerHTML),'toggling signals on shows badges right away');
  pchange('data-set-tg','signals',{checked:false}); ok(!/class="tag/.test(view.innerHTML),'toggling signals off hides badges');
  pchange('data-set-tg','signals',{checked:true}); pclick('data-set-cancel'); ok(!/class="tag/.test(view.innerHTML)&&els.setBack.hidden,'cancel reverts the signals preview');
  openSet(); pchange('data-set-wh','end',{value:'08:00'});
  ok(!/data-set-save disabled/.test(P().innerHTML)&&P().innerHTML.includes(en?'Unsaved changes':'Có thay đổi chưa lưu'),'dirty indicator + save enabled');
  pclick('data-set-save'); ok(S.setOpen&&P().innerHTML.includes(en?'End time must be after':'Giờ kết thúc phải sau')&&S.settings.workHours.end==='18:00','validation blocks end<=start');
  pchange('data-set-wh','end',{value:'09:00'}); pclick('data-set-save'); ok(S.setOpen&&S.settings.workHours.end==='18:00','validation blocks end==start');
  pchange('data-set-wh','end',{value:'18:00'});
  ['teamsChats','teamsChannelMentions','outlookMail','jiraMail','calendar'].forEach(c=>pchange('data-set-ch',c,{checked:false}));
  pclick('data-set-save'); ok(S.setOpen&&P().innerHTML.includes(en?'Pick at least one channel':'Chọn ít nhất một kênh'),'validation: at least one channel');
  pchange('data-set-ch','calendar',{checked:true});
  pinput('data-set-in','kw',' mob- , NEWKW ,newkw'); pclick('data-set-add','kw');
  ok(S.setDraft.keywords.filter(k=>/^mob-$/i.test(k)).length===1&&S.setDraft.keywords.filter(k=>/^newkw$/i.test(k)).length===1,'keywords trimmed + deduped '+JSON.stringify(S.setDraft.keywords));
  pinput('data-set-in','kw','x'.repeat(60)); pclick('data-set-add','kw'); ok(S.setDraft.keywords.some(k=>k.length===40),'keyword capped at 40');
  pinput('data-set-in','vipName','  Zed Z  '); pinput('data-set-in','vipWhy','QA lead'); pclick('data-set-add','vip'); ok(S.setDraft.vipPeople.some(p=>p.name==='Zed Z'&&p.why==='QA lead'),'vip added (trimmed)');
  pinput('data-set-in','vipName','zed z'); pclick('data-set-add','vip'); ok(S.setDraft.vipPeople.filter(p=>/zed z/i.test(p.name)).length===1&&P().innerHTML.includes(en?'Already in the list':'Đã có trong danh sách'),'vip dedupe');
  pinput('data-set-in','vipName','n'.repeat(90)); pclick('data-set-add','vip'); ok(S.setDraft.vipPeople.some(p=>p.name.length===60),'vip name capped at 60');
  const nChat=S.setDraft.keyChats.length; pclick('data-set-rm','chat',{'data-i':0}); ok(S.setDraft.keyChats.length===nChat-1,'remove key chat');
  ok(S.setDraft.excludeChats.length===1&&/data-set-rm="xchat"/.test(P().innerHTML)&&/id="sh-xchat"/.test(P().innerHTML),'skipped chats listed with remove');
  pclick('data-set-rm','xchat',{'data-i':0}); ok(S.setDraft.excludeChats.length===0,'remove skipped chat');
  pclick('data-set-rm','kw',{'data-i':0}); ok(!S.setDraft.keywords.some(k=>k==='MOB-'),'remove keyword chip');
  pinput('data-set-f','role','r'.repeat(120)); pinput('data-set-f','currentWork','w'.repeat(400));
  const before=updates.length; pclick('data-set-save');
  ok(!S.setOpen&&S.settings.keywords.some(k=>/newkw/i.test(k))&&S.settings.role.length===80&&S.settings.currentWork.length===300&&updates.length===before,'demo save: local state only, capped, no db write');
  ok(els.status.textContent===(en?'Demo: not saved.':'Bản demo: không lưu.'),'demo save toast');
  /* undo snackbar */
  S.snackMs=100000;
  go('theo-nguoi'); const t5=S.allTodos.find(x=>x.id==='demo-5'); ok(t5.status==='waiting','demo-5 waiting before');
  const s5=pick(t5); change('demo-5',true);
  ok(!els.snack.hidden&&/data-undo/.test(els.snack.innerHTML)&&els.snack.innerHTML.includes('<span class="snack-v">'+(en?'Done':'Đã xong')+'</span><b class="snack-t">'+t5.title)&&/role="status" aria-live="polite"/.test(html.split('id="snack"')[1].slice(0,60)),'snackbar after mark done (role=status, polite)');
  if(en) ok(!VI.test(els.snack.innerHTML),'en snackbar has no Vietnamese'); else ok(!/\b(Undo|Marked|Dismiss)\b/.test(els.snack.innerHTML),'vi snackbar has no English UI');
  ok(/class="snack-ic" aria-hidden="true">&#x2713;</.test(els.snack.innerHTML),'done icon ✓ (entity)');
  ok(!/\(demo|\(bản demo/.test(els.snack.innerHTML),'no "(demo" suffix in snack');
  ok(new RegExp('class="snack-undo"[^>]*>'+(en?'Undo':'Hoàn tác')+'<').test(els.snack.innerHTML)&&!/\.snack-undo\s*\{[^}]*text-transform:\s*uppercase/.test(html),'Undo in sentence case, not uppercased by CSS');
  ok(/class="snack-kbd" aria-hidden="true">Ctrl\+Z</.test(els.snack.innerHTML)&&/aria-keyshortcuts="Control\+Z"/.test(els.snack.innerHTML),'keyboard hint Ctrl+Z (non-Mac)');
  ok(/data-snack-x aria-label="[^"]+">&#x2715;</.test(els.snack.innerHTML)&&/class="snack-bar"[^>]*animation-duration:100000ms/.test(els.snack.innerHTML),'✕ entity + aria-label; countdown bar with duration');
  snackClick('[data-undo]'); ok(t5.status==='waiting'&&t5.doneAt===null&&pick(t5)===s5,'undo restores waiting, doneAt null, exact fields');
  ok(laneOf(go('hom-nay'),'demo-5')==='waiting','undo: back in waiting lane');
  ok(!/data-undo/.test(els.snack.innerHTML)&&/&#x21BA;/.test(els.snack.innerHTML)&&els.snack.innerHTML.includes(en?'Undone':'Đã hoàn tác'),'after undo: ↺ undone, no second undo offered');
  const t6=S.allTodos.find(x=>x.id==='demo-6'); ok(t6.priority===undefined&&t6.priorityBy===undefined,'demo-6 has no priority');
  const n0=V.sets; click('[data-pri]','data-pri','demo-6'); ok(t6.priority==='P0'&&els.snack.innerHTML.includes('P3 → P0')&&/class="snack-ic pri p0" aria-hidden="true">P0</.test(els.snack.innerHTML),'priority snackbar: P0 badge icon + P3 → P0');
  snackClick('[data-undo]'); ok(t6.priority===null&&t6.priorityBy===null&&V.sets===n0,'priority undo: absent -> null, in place (no re-render)');
  ok(/data-pri="demo-6"[^>]*>P3</.test(go('hom-nay')),'null priority treated as absent (derived P3)');
  const t3=S.allTodos.find(x=>x.id==='demo-3'), l3=laneOf(view.innerHTML,'demo-3');
  view.L.click.forEach(f=>f({preventDefault(){},target:{closest:s=>s==='[data-move]'?{dataset:{id:'demo-3',move:'waiting'}}:null}}));
  ok(t3.status==='waiting'&&els.snack.innerHTML.includes(en?'Moved to ':'Sang ')&&/&#x2192;/.test(els.snack.innerHTML)&&els.snack.innerHTML.includes('<b class="snack-t">'+t3.title.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')),'move snackbar: → icon, lane name, title');
  snackClick('[data-undo]'); ok(laneOf(view.innerHTML,'demo-3')===l3&&t3.status==='open','move undo restores lane '+l3);
  const t1=S.allTodos.find(x=>x.id==='demo-1'), t7=S.allTodos.find(x=>x.id==='demo-7');
  change('demo-1',true); change('demo-7',true); ok(els.snack.innerHTML.includes(t7.title.slice(0,20))&&!els.snack.innerHTML.includes(t1.title),'new action replaces snackbar');
  snackClick('[data-undo]'); ok(t7.status!=='done'&&t1.status==='done','undo only the latest action');
  change('demo-1',false);
  const t4=S.allTodos.find(x=>x.id==='demo-4'); change('demo-4',false); const mid=pick(t4); change('demo-4',true);
  snackClick('[data-undo]'); ok(pick(t4)===mid&&t4.status!=='done','rapid repeat: undo to the state before the LAST action');
  change('demo-1',true); ok(ctrlZ({tagName:'TEXTAREA'})===false&&t1.status==='done','Ctrl+Z ignored in a textarea');
  ok(ctrlZ({tagName:'INPUT',type:'text'})===false&&t1.status==='done','Ctrl+Z ignored in a text input');
  ok(ctrlZ({tagName:'INPUT',type:'checkbox'})===true&&t1.status!=='done','Ctrl+Z undoes (focus on checkbox)');
  ok(ctrlZ({})===false,'Ctrl+Z does nothing once undone');
  const long=S.allTodos.find(x=>x.id==='demo-2'); change('demo-2',true); ok(els.snack.innerHTML.includes('<b class="snack-t">'+long.title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')+'</b>')&&/\.snack-t\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap/.test(html),'long title kept whole, truncated by CSS ellipsis'); ok(/\.snack-ic:not\(\.pri\)|&#x21BA;/.test(html)&&(change('demo-2',false),/&#x21BA;/.test(els.snack.innerHTML))&&els.snack.innerHTML.includes(en?'Reopened':'Đã mở lại'),'reopen icon ↺');
  snackClick('[data-snack-x]'); ok(els.snack.hidden,'✕ dismisses');
  globalThis.__chain.push(async()=>{
    S.snackMs=60; change('demo-1',true); ok(!els.snack.hidden,'snackbar shown'); await wait(150); ok(els.snack.hidden,'auto-dismiss after timeout');
    change('demo-1',false); els.snack.L.mouseenter.forEach(f=>f()); await wait(150); ok(!els.snack.hidden,'hover pauses auto-dismiss');
    els.snack.L.mouseleave.forEach(f=>f()); snackClick('[data-snack-x]'); S.snackMs=undefined;
  });
}
function ownerSettingsUndo(){
  const en=navLang==='en';
  openSet(); const ph=P().innerHTML;
  ok(ph.includes('Boss One')&&ph.includes('Mobile chat')&&ph.includes('Fun chat')&&ph.includes('SF-')&&ph.includes('Asia/Ho_Chi_Minh')&&!/set-note/.test(ph),'owner: panel shows meta/settings values, editable');
  ok(/data-set-save disabled/.test(ph),'owner: save disabled when clean');
  pchange('data-set-wh','end',{value:'08:00'}); let n=updates.length; pclick('data-set-save'); ok(updates.length===n&&S.setOpen,'owner: invalid hours -> no write');
  pchange('data-set-wh','end',{value:'18:30'});
  settingsDoc=Object.assign({},settingsDoc,{keywords:['SF-','EXT-'],updatedAt:'2026-11-08T11:00:00.000Z'}); snapByPath['meta/settings']();
  ok(S.setDraft.workHours.end==='18:30'&&P().innerHTML.includes(en?'New changes arrived':'Có thay đổi mới'),'owner: external change while open+dirty keeps edits, shows note');
  globalThis.__chain.push(async()=>{
    /* undo writes the exact snapshot (db) */
    go('hom-nay'); const B=S.allTodos.find(x=>x.id==='B'); const before=JSON.parse(pick(B));
    change('B',true); await wait(20); snackClick('[data-undo]'); await wait(20);
    const u=updates.filter(x=>x[0]==='todos/B').pop(); ok(u&&JSON.stringify(UF.map(k=>u[1][k]===undefined?'MISSING':u[1][k]))===JSON.stringify(before),'owner undo writes exact snapshot '+JSON.stringify(u&&u[1]));
    const E=S.allTodos.find(x=>x.id==='E'); ok(E.priority===undefined,'E has no priority');
    click('[data-pri]','data-pri','E'); await wait(20); snackClick('[data-undo]'); await wait(20);
    const ue=updates.filter(x=>x[0]==='todos/E').pop(); ok(ue&&ue[1].priority===null&&ue[1].priorityBy===null&&E.priority===null,'owner undo priority: absent -> null in db');
    ok(/data-pri="E"[^>]*>P3</.test(go('hom-nay')),'owner: null priority shows derived P3');
    /* save with a language change */
    const other=en?'vi':'en';
    pclick('data-set-lang',other); ok(btnLabel()===(other==='en'?'⚙ Settings':'⚙ Cài đặt'),'owner: language preview applies immediately');
    pclick('data-set-save'); await wait(30);
    const w=updates.filter(x=>x[0]==='meta/settings'&&x[2]==='set').pop();
    ok(w&&w[1].updatedBy==='page'&&/^\d{4}-\d\d-\d\dT/.test(w[1].updatedAt)&&w[1].language===other&&w[1].workHours.end==='18:30'&&w[1].channels.length===5&&w[1].vipPeople[0].name==='Boss One'&&w[1].keyChats[0].id==='19:x@thread.v2'&&w[1].excludeChats[0].id==='19:fun@thread.v2'&&w[1].timezone==='Asia/Ho_Chi_Minh'&&!('email' in w[1])&&!('displayName' in w[1])&&w[1].storeQuotes===true&&w[1].signals===false&&w[1].role==='Engineer'&&w[1].currentWork==='lending','owner save writes meta/settings '+JSON.stringify(w&&w[1]));
    const pw=updates.filter(x=>x[0]==='meta/profile').pop(); ok(pw&&pw[1].language===other&&pw[2]==='update','owner: language change also updates meta/profile.language');
    ok(!S.setOpen&&els.status.textContent.startsWith(other==='en'?'Saved. Takes effect from the next digest.':'Đã lưu. Áp dụng từ bản tin tới.'),'owner: saved toast, drawer closed');
    settingsDoc=Object.assign({},settingsDoc,{keywords:['SF-','LATER-'],updatedBy:'skill'}); snapByPath['meta/settings']();
    ok(S.settings.keywords.includes('LATER-'),'owner: snapshot refreshes settings while closed');
  });
}
function navHtml(){ return html.split('<nav class="tabs"')[1].split('</nav>')[0] }
function demoEntryChecks(){
  const nav=navHtml(), how=html.split('id="howto"')[1].split('</section>')[0];
  ok(!/demoBtn|demoOpen/.test(nav)&&/id="demoOpen"/.test(how)&&/data-i18n="demoHint"/.test(how),'nav has no demo entry; howto footer has it');
  ok(/infoBtn/.test(nav)&&/setBtn/.test(nav)&&/projBar/.test(nav),'nav keeps tabs, project filter, info, settings');
  if(!owner){ ok(el('howtoDemo').hidden===true&&el('demoBack').hidden===true,'non-owner: no demo entry, no back pill'); return }
  ok(el('howtoDemo').hidden===false&&el('demoBack').hidden===true&&!S.demo,'owner: demo entry in howto, no back pill yet');
  el('howto').hidden=false; el('demoOpen').L.click.forEach(f=>f({}));
  ok(S.demo&&S.ownerDemo&&el('howto').hidden===true&&el('howtoDemo').hidden===true&&el('demoBack').hidden===false,'owner: View demo closes panel, enters demo, shows back pill');
  ok(/demo-1/.test(go('hom-nay'))&&els.status.textContent.includes(navLang==='vi'?'\u2190 Về catask của tôi':'\u2190 Back to my catask'),'owner demo: demo data + toast names the back pill');
  const r0=location.reloads; el('demoBack').L.click.forEach(f=>f({})); ok(location.reloads===r0+1,'owner: back pill reloads into the real ledger');
}
globalThis.__chain=[];
setTimeout(()=>{ snapCbs.forEach(f=>f()); setTimeout(()=>{
  if(owner) ownerTests(); else { demoTests(); aiDemoTests(); aiFormTests(); aiApplyDemoTests() }
  if(owner) { ownerSettingsUndo(); aiOwnerTests(); globalThis.__chain.push(aiMcpAsync) } else demoSettingsUndo();
  const fin=()=>{ demoEntryChecks(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0) };
  setTimeout(async()=>{ for(const f of globalThis.__chain) await f(); if(globalThis.__echoCheck) globalThis.__echoCheck(fin); else fin() },40)},10)},20);
