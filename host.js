import {auth,ready,db,doc,collection,onSnapshot,getDoc,getDocs,setDoc,runTransaction,$,notice,modal,hideModal,missions,clues,mission3Variants,fmt,duration,cooldown,roomRef,resultPage} from './common.js';
const SECRET='Vm12251110';let code=null,room=null,unsubs=[],audio=null,activeSab='',lastEvent=0,seenSab='',timerHandle=null,closingPerformance=false;
const intro=`記念すべき1周年配信を始めた超弩級配信者這音に、とあるリスナーからとあるURLが届く。\n\n迂闊な這音はそのURLをクリックしてしまった！\n\n飛ばされたのは「監禁部屋」と書かれたサイト。\n\nナスカ『這音さん騙されましたね。ここは12時間以内に10桁のパスワードを当てないと罰ゲームを受けるサイトです。ｱﾎﾈー。』\n\nそして這音の10桁のパスワードを当てる戦いが始まるのであった・・・`;
$('introText').textContent=intro;
function show(id){for(const x of ['home','intro','game'])$(x).classList.toggle('hidden',x!==id)}
$('copy').onclick=async()=>{await navigator.clipboard.writeText(code);notice('部屋コードをコピーしました')};
$('start').onclick=async()=>{let pass=prompt('入室用パスワードを入力してください');if(pass!=='0219'){notice('入室パスワードが違います');return}await ready();let c;for(let i=0;i<30;i++){c=String(Math.floor(1000+Math.random()*9000));if(!(await getDoc(roomRef(c))).exists())break}code=c;await setDoc(roomRef(code),{hostUid:auth.currentUser.uid,status:'intro',createdAt:Date.now(),startedAt:null,attempts:3,lastRecoveryAt:null,missions:[false,false,false,false,false],clueEvent:0,judgeEvent:0,judge:null,checkingUntil:0,sabotage:null,endedAt:null});localStorage.setItem('hostRoom',code);show('intro');bind()};
$('enter').onclick=async()=>{const ref=roomRef(code);await runTransaction(db,async tx=>{let s=await tx.get(ref);if(s.data().status==='intro')tx.update(ref,{status:'playing',startedAt:Date.now(),lastRecoveryAt:Date.now()})});show('game')};
async function recover(){if(!room||room.status!=='playing')return;let now=Date.now();if(!room.lastRecoveryAt||now-room.lastRecoveryAt<cooldown)return;await runTransaction(db,async tx=>{const ref=roomRef(code),s=await tx.get(ref),r=s.data();if(r.status!=='playing')return;let n=Math.floor((Date.now()-r.lastRecoveryAt)/cooldown);if(n>0)tx.update(ref,{attempts:Math.min(100,r.attempts+n),lastRecoveryAt:r.lastRecoveryAt+n*cooldown})}).catch(console.warn)}
function tick(){if(!room||room.status!=='playing')return;let remaining=room.startedAt+duration-Date.now();$('timer').textContent=fmt(remaining);if(remaining<=0){runTransaction(db,async tx=>{let ref=roomRef(code),s=await tx.get(ref);if(s.data().status==='playing')tx.update(ref,{status:'failed',endedAt:Date.now()})}).catch(console.warn)}recover()}
function render(){if(!room)return;$('roomBadge').textContent='部屋 '+code;$('copy').classList.remove('hidden');if(room.status==='intro'){show('intro');return}if(['won','failed'].includes(room.status)){performanceLock(false);stopAudio();resultPage(room.status==='won');if(room.status==='failed')modal('<div class="big">💥 BOOM!</div><h2>脱出失敗！</h2>');setTimeout(hideModal,2800);return}show('game');$('attempts').textContent=room.attempts;$('attempts').classList.toggle('zero',room.attempts===0);let checking=Date.now()<(room.checkingUntil||0);$('submit').disabled=room.attempts<=0||checking;$('checking').classList.toggle('hidden',!checking);$('missions').innerHTML=missions.map((m,i)=>`<div class="mission"><span>${i+1}. ${m}</span><button data-m="${i}" ${room.missions[i]?'disabled':''}>${room.missions[i]?'✓ 達成':'クリア'}</button></div>`).join('');document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>mission(+b.dataset.m));renderHostClues();renderSab();tick()}
function renderHostClues(){
 const target=$('hostClues');if(!target)return;
 const items=[];
 // Host history contains only clues actually displayed on the host screen.
 if(room.missions[0])items.push(['ミッション①・這音さん用','assets/mission1_host.png']);
 if(room.missions[2])items.push(['ミッション③・這音さん用','assets/mission3_host.png']);
 target.innerHTML=items.length?items.map(([label,src],i)=>`<button class="secondary" type="button" data-host-clue="${i}"><img src="${src}" alt="${label}"><span>${label}</span></button>`).join(''):'<p class="tag">まだ表示された謎画像はありません。</p>';
 target.querySelectorAll('[data-host-clue]').forEach(button=>button.onclick=()=>{const [label,src]=items[Number(button.dataset.hostClue)];modal(`<h2>${label}</h2><img src="${src}" alt="${label}">`)});
}
async function mission(i){
 let assignments={};
 if(i===2){
  const snap=await getDocs(collection(db,'rooms',code,'participants'));
  const people=snap.docs.map(d=>({uid:d.id,joinedAt:d.data().joinedAt||0})).sort((a,b)=>a.joinedAt-b.joinedAt||a.uid.localeCompare(b.uid));
  // Priority: bus (index 1), fish (2), kana chart (3), cat (0).
  // Persist UID-to-image assignments in Firestore so reloads do not reshuffle.
  const priority=[1,2,3,0];
  people.forEach((p,n)=>assignments[p.uid]=priority[n%priority.length]);
 }
 let updated=false;
 await runTransaction(db,async tx=>{const ref=roomRef(code),s=await tx.get(ref),r=s.data();if(r.status!=='playing'||r.missions[i])return;let a=[...r.missions];a[i]=true;updated=true;tx.update(ref,{missions:a,clueEvent:[0,1,2,4].includes(i)?r.clueEvent+1:r.clueEvent,clueIndex:[0,1,2,4].includes(i)?i:r.clueIndex??null,...(i===2?{mission3Assignments:assignments}:{})})});
 if(!updated)return;
 if(i===0)modal('<h2>ミッション① 達成</h2><img src="assets/mission1_host.png" alt="ミッション①の画像">');
 else if(i===2)modal('<h2>ミッション③ 達成</h2><img src="assets/mission3_host.png" alt="ミッション③の画像">');
 else notice(i===1?'今からリスナーが漢字一文字でヒントを打ちます。':'どこかで何かが起こったようだ・・・');
}
$('submit').onclick=async()=>{const value=$('answer').value.trim();if(!value)return notice('パスワードを入力してください');let won=value===SECRET;let now=Date.now();let exact=[...value].filter((c,i)=>SECRET[i]===c).length;let left=[...SECRET],matched=[...value];for(let i=0;i<matched.length;i++)if(SECRET[i]===matched[i]){left[i]=null;matched[i]=null}let partial=0;for(let c of matched)if(c!==null){let j=left.indexOf(c);if(j>=0){partial++;left[j]=null}};let enabled=room?.missions?.[3];let until=enabled&&!won?now+4500:now;let ok=false;await runTransaction(db,async tx=>{let ref=roomRef(code),s=await tx.get(ref),r=s.data();if(r.status!=='playing'||r.attempts<=0||Date.now()<(r.checkingUntil||0))return;ok=true;tx.update(ref,{attempts:won?r.attempts:r.attempts-1,status:won?'won':'playing',endedAt:won?now:null,checkingUntil:until,judgeEvent:r.judgeEvent+(enabled&&!won?1:0),judge:enabled&&!won?{exact,partial,at:now}:r.judge})});if(!ok)return notice('現在は回答できません');$('answer').value='';if(won){notice('脱出成功！');return}if(enabled){notice('検証中……',4000);setTimeout(()=>modal('<img src="assets/fail.png" alt="アホネー"><h2>パスワードを間違えました</h2>'),4600)}else modal('<img src="assets/fail.png" alt="アホネー"><h2>パスワードを間違えました</h2>')};
function stopAudio(){if(audio){audio.close();audio=null}}
function samba(){stopAudio();try{audio=new (window.AudioContext||window.webkitAudioContext)();let t=audio.currentTime;for(let i=0;i<180*4;i++){let o=audio.createOscillator(),g=audio.createGain();o.type=i%4===0?'triangle':'square';o.frequency.value=[220,330,440,294,392,523,330,494][i%8];g.gain.setValueAtTime(.0001,t+i*.25);g.gain.exponentialRampToValueAtTime(.06,t+i*.25+.015);g.gain.exponentialRampToValueAtTime(.0001,t+i*.25+.14);o.connect(g).connect(audio.destination);o.start(t+i*.25);o.stop(t+i*.25+.16)}}catch(e){console.warn(e)}}
function performanceLock(active){
  $('performanceLock').classList.toggle('hidden',!active);
  // inert prevents keyboard, pointer and focus interaction with the game underneath.
  document.querySelector('main').inert=active;
  document.querySelector('header').inert=active;
  if(active && document.activeElement!==$('closePerformance'))$('closePerformance').focus();
}
$('closePerformance').onclick=async()=>{
  if(closingPerformance||!room?.sabotage||room.sabotage.kind!==2)return;
  closingPerformance=true;
  $('closePerformance').disabled=true;
  try{
    await runTransaction(db,async tx=>{
      const ref=roomRef(code),snap=await tx.get(ref);
      if(snap.exists()&&snap.data().sabotage?.id===room.sabotage.id)tx.update(ref,{sabotage:null});
    });
  }catch(e){console.error(e);notice('閉じる処理に失敗しました。再度お試しください。')}
  finally{closingPerformance=false;$('closePerformance').disabled=false}
};
function renderSab(){
  const s=room.sabotage,now=Date.now();
  // A one-shot performance remains locked until explicitly dismissed.
  const active=s&&(s.kind===2||s.until>now);
  performanceLock(Boolean(active&&s.kind===2));
  if(!active){
    $('sabotageText').textContent='妨害なし';
    $('redOverlay').classList.add('hidden');
    $('endSab').classList.add('hidden');
    if(activeSab){stopAudio();activeSab=''}
    return;
  }
  if(seenSab!==s.id){seenSab=s.id;notice(`${s.name}が妨害をした！`,3000)}
  $('sabotageText').textContent=`${s.name}が妨害中：${['やかましいサンバ','アホネー','一発芸'][s.kind]}`;
  if(s.kind===0&&activeSab!==s.id){activeSab=s.id;samba()}
  $('redOverlay').classList.toggle('hidden',s.kind!==1);
  $('endSab').classList.add('hidden');
}
function bind(){unsubs.forEach(f=>f());unsubs=[];unsubs.push(onSnapshot(roomRef(code),s=>{if(s.exists()){room=s.data();render()}}));unsubs.push(onSnapshot(collection(db,'rooms',code,'participants'),s=>{$('peopleCount').textContent=s.size;$('people').innerHTML=s.docs.map(d=>`<div class="mission">👤 ${escapeHtml(d.data().name)}</div>`).join('')||'まだ参加者はいません'}));if(!timerHandle)timerHandle=setInterval(()=>{tick();if(room?.status==='playing'){renderSab();let ck=Date.now()<(room.checkingUntil||0);$('submit').disabled=room.attempts<=0||ck;$('checking').classList.toggle('hidden',!ck)}},1000)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
(async()=>{let old=localStorage.getItem('hostRoom');if(!old)return;try{await ready();let s=await getDoc(roomRef(old));if(s.exists()&&s.data().hostUid===auth.currentUser.uid){code=old;bind()}}catch(e){console.warn(e)}})();
