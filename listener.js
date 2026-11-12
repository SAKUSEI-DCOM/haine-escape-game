import {auth,ready,db,doc,collection,onSnapshot,getDoc,setDoc,runTransaction,$,notice,modal,missions,clues,mission3Variants,fmt,duration,cooldown,roomRef} from './common.js';
let code=null,name=null,room=null,participant=null,seenClues=-1,seenJudge=-1,joined=false;
function show(id){for(let x of ['join','rules','play'])$(x).classList.toggle('hidden',x!==id)}
$('joinBtn').onclick=async()=>{code=$('code').value.trim();name=$('name').value.trim();if(!/^\d{4}$/.test(code)||!name)return notice('4桁の部屋コードと名前を入力してください');await ready();let s=await getDoc(roomRef(code));if(!s.exists()||!['intro','playing'].includes(s.data().status))return notice('入室できる部屋がありません');show('rules')};
$('accept').onclick=async()=>{await ready();let ref=doc(db,'rooms',code,'participants',auth.currentUser.uid);await setDoc(ref,{name,joinedAt:Date.now()}, {merge:true});sessionStorage.setItem('room',code);sessionStorage.setItem('listenerName',name);localStorage.setItem('listenerRoom',code);localStorage.setItem('listenerName',name);bind()};
function bind(){if(joined)return;joined=true;show('play');$('roomBadge').textContent=`部屋 ${code}｜${name}`;onSnapshot(roomRef(code),s=>{if(!s.exists())return;let old=room;room=s.data();if(['won','failed'].includes(room.status)){listenerResult(room.status==='won');return}render();if(old&&room.clueEvent>old.clueEvent&&clues[room.clueIndex])showClue(room.clueIndex);if(old&&room.judgeEvent>old.judgeEvent)showJudge(room.judge)});onSnapshot(doc(db,'rooms',code,'participants',auth.currentUser.uid),s=>{participant=s.data()||{};render()});setInterval(render,1000)}
function listenerResult(won){
 const main=document.querySelector('main');
 if(main.dataset.resultShown===String(won))return;
 main.dataset.resultShown=String(won);
 main.innerHTML=won
  ? '<section class="hero center"><div class="big">🎉 脱出成功！</div><h2>這音さんが脱出に成功しました！</h2><p>ご参加ありがとうございました。</p></section>'
  : '<section class="hero center"><div class="big">💥 脱出失敗！</div><h2>12時間が経過しました。</h2><p>ご参加ありがとうございました。</p></section>';
}
function clueSrc(i){if(i!==2)return clues[i];let assigned=room?.mission3Assignments?.[auth.currentUser.uid];return mission3Variants[Number.isInteger(assigned)?assigned:0]}
function showClue(i){modal(`<h2>謎画像 ${i===4?'④':i===2?'③':i===1?'②':'①'}</h2><img src="${clueSrc(i)}">`)}
function showJudge(j){if(!j)return;let html=j.exact>0?`<div class="judge green">${j.exact}</div><p>文字と位置が一致</p>`:j.partial>0?`<div class="judge red">${j.partial}</div><p>文字だけ一致</p>`:'<div class="judge red">判定なし</div>';modal(`<h2>🔍 パスワード判別結果</h2>${html}`);$('judgeHistory').innerHTML=html+'<p>最新の判定結果</p>'}
function render(){if(!room||room.status!=='playing')return;let now=Date.now();$('timer').textContent=fmt(room.startedAt?room.startedAt+duration-now:duration);let remain=Math.max(0,(participant?.lastActionAt||0)+cooldown-now);$('cooldown').textContent=remain?fmt(remain):'使用可能';let busy=room.sabotage&&room.sabotage.until>now;let disabled=remain>0||!room.startedAt;$('rescue').disabled=disabled;$('sabotage').disabled=disabled||busy;$('busy').textContent=busy?'他の人が使用中です':'';$('missions').innerHTML=missions.map((m,i)=>`<div class="mission"><span>${i+1}. ${m}</span><b class="${room.missions[i]?'done':''}">${room.missions[i]?'✓ 達成':'未達成'}</b></div>`).join('');$('clues').innerHTML=Object.entries(clues).map(([i,src])=>room.missions[+i]?`<button class="secondary" data-clue="${i}"><img src="${clueSrc(+i)}">謎画像 ${+i===4?'④':+i===2?'③':+i===1?'②':'①'}</button>`:`<button disabled>🔒 謎画像 ${+i===4?'④':+i===2?'③':+i===1?'②':'①'}</button>`).join('');document.querySelectorAll('[data-clue]').forEach(b=>b.onclick=()=>showClue(+b.dataset.clue));$('judgeBox').classList.toggle('hidden',!room.missions[3]);if(room.missions[3]&&room.judge&&room.judgeEvent>seenJudge){seenJudge=room.judgeEvent;showJudge(room.judge)}}
async function action(type){let success=false;try{await runTransaction(db,async tx=>{const rr=roomRef(code),pr=doc(db,'rooms',code,'participants',auth.currentUser.uid);let [rs,ps]=await Promise.all([tx.get(rr),tx.get(pr)]);let r=rs.data(),p=ps.data(),now=Date.now();if(!r||r.status!=='playing'||!p||now-(p.lastActionAt||0)<cooldown)return;if(type==='sabotage'&&r.sabotage&&r.sabotage.until>now)return;success=true;tx.update(pr,{lastActionAt:now});if(type==='rescue')tx.update(rr,{attempts:Math.min(100,r.attempts+1)});else{let kind=Math.floor(Math.random()*3);tx.update(rr,{sabotage:{id:auth.currentUser.uid+'-'+now,name:p.name,kind,until:kind===2?now+12*3600000:now+180000}})}});notice(success?(type==='rescue'?'這音さんの回答数が1回復しました！':'妨害を発動しました！'):'まだ使用できません')}catch(e){console.error(e);notice('処理に失敗しました')}}
$('rescue').onclick=()=>action('rescue');$('sabotage').onclick=()=>action('sabotage');
(async()=>{
 const old=localStorage.getItem('listenerRoom')||sessionStorage.getItem('room');
 const n=localStorage.getItem('listenerName')||sessionStorage.getItem('listenerName');
 if(!/^\d{4}$/.test(old||'')||!n)return;
 try{
  await ready();
  const [r,p]=await Promise.all([getDoc(roomRef(old)),getDoc(doc(db,'rooms',old,'participants',auth.currentUser.uid))]);
  if(r.exists()&&p.exists()&&['intro','playing'].includes(r.data().status)){
   code=old;name=n;show('rules');
  }else{
   localStorage.removeItem('listenerRoom');localStorage.removeItem('listenerName');
  }
 }catch(e){console.error(e);notice('前回の参加情報を確認できませんでした')}
})();
