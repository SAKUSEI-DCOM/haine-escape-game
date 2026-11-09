import {messageCards} from './messages.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,signInAnonymously,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,collection,query,where,onSnapshot,getDoc,setDoc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './config.js';
const app=initializeApp(firebaseConfig);export const db=getFirestore(app),auth=getAuth(app);
export {doc,collection,query,where,onSnapshot,getDoc,setDoc,runTransaction,serverTimestamp};
export async function ready(){if(auth.currentUser)return auth.currentUser;await signInAnonymously(auth);return auth.currentUser}
export const $=id=>document.getElementById(id);
export function notice(t,ms=2400){const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),ms)}
export const missions=['投げられたギフトの総ポイント数が3万を突破する。','来た初見さん8人に挨拶をしてもらう。','来たリスナーに星座を聞き、12星座全てをコンプリートする。','リスナーから勧められたゲームをクリアする。','★1から★5バッチまでのリスナーを集めてイリアム内で集合写真を撮る。'];
export const clues={0:'assets/clue1.png',1:'assets/clue2.png',2:'assets/clue3.png',4:'assets/clue4.png'};
export const duration=12*3600000, cooldown=30*60000;
export function fmt(ms){let m=Math.max(0,Math.ceil(ms/60000));return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
export function modal(html,close=true){const x=$('modal');x.innerHTML=`<div class="dialog">${close?'<button class="close" id="closeModal">×</button>':''}${html}</div>`;x.classList.remove('hidden');if(close)$('closeModal').onclick=()=>x.classList.add('hidden')}
export function hideModal(){$('modal').classList.add('hidden')}
export function sessionCode(){return sessionStorage.getItem('room')||localStorage.getItem('hostRoom')}
export function roomRef(code){return doc(db,'rooms',code)}
function escapeMessage(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function resultPage(win){
  const main=document.querySelector('main');
  if(!win){main.innerHTML='<section class="hero"><div class="big">💥 脱出失敗！</div><h2>12時間が経過しました。罰ゲーム決定！</h2><button id="resultHome">ホームへ</button></section>';document.getElementById('resultHome').onclick=()=>location.reload();return}
  main.innerHTML=`<section class="hero escape-story" id="escapeStory"><div class="big">🎉 脱出成功！</div><p class="escape-narrative">パスワードが分かり、ページから抜けるとそこには様々なメッセージが書いてあるページだった。貴方はそのページを見ることにした。</p><button id="openMessages">メッセージを確認する</button></section><section class="message-page hidden" id="messagePage"><div class="message-heading">🎊 1周年おめでとうございます 🎊</div><h2>皆さまからのメッセージカード</h2><div class="message-grid" id="messageGrid"></div><button class="secondary" id="backToStory">前のページに戻る</button></section>`;
  document.getElementById('openMessages').onclick=()=>{
    document.getElementById('escapeStory').classList.add('hidden');
    document.getElementById('messagePage').classList.remove('hidden');
    document.getElementById('messageGrid').innerHTML=messageCards.map((card,i)=>`<article class="message-card"><div class="message-card-number">MESSAGE ${String(i+1).padStart(2,'0')}</div><p>${escapeMessage(card.text)}</p><div class="message-sender">— ${escapeMessage(card.from)}</div></article>`).join('');
    window.scrollTo(0,0);
  };
  document.getElementById('backToStory').onclick=()=>{document.getElementById('messagePage').classList.add('hidden');document.getElementById('escapeStory').classList.remove('hidden')};
}
