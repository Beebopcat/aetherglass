import {scenes,challenges} from './world.mjs';
export const SAVE_KEY='casey-aetherglass-hub-v1';
const seals=Object.keys(challenges),games=['pairs','sequence'];
export function freshState(){return {version:1,scene:'goldspire',visited:['goldspire'],seals:[],stamps:[],restored:false};}
export function normalizeState(input){
 const s=freshState();if(!input||input.version!==1)return s;
 if(Object.hasOwn(scenes,input.scene))s.scene=input.scene;
 for(const [key,allowed] of [['visited',Object.keys(scenes)],['seals',seals],['stamps',games]]){
  if(Array.isArray(input[key]))s[key]=[...new Set(input[key].filter(id=>allowed.includes(id)))];
 }
 if(!s.visited.includes(s.scene))s.visited.push(s.scene);
 s.restored=input.restored===true&&s.seals.length===3;return s;
}
export function travel(s,id){if(!Object.hasOwn(scenes,id))return false;s.scene=id;if(!s.visited.includes(id))s.visited.push(id);return true;}
export function reward(s,type,id){const list=type==='seal'?s.seals:s.stamps,valid=type==='seal'?seals:games;if(!valid.includes(id)||list.includes(id))return false;list.push(id);return true;}
export function restoreCrystal(s){if(s.seals.length!==3||s.scene!=='goldspire')return false;s.restored=true;return true;}
export function checkAnswer(id,index,answer){const q=challenges[id]?.questions[index];return !!q&&Number.isInteger(answer)&&q.correct===answer;}
export function shuffled(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function memoryDeck(random=Math.random){return shuffled(['sun','moon','star','leaf','wave','crystal'].flatMap(symbol=>[symbol,symbol]),random);}
export function newMemory(random){return {cards:memoryDeck(random),open:[],matched:[],turns:0};}
export function flipCard(game,index){
 if(!Number.isInteger(index)||index<0||index>=game.cards.length||game.open.length===2||game.open.includes(index)||game.matched.includes(index))return {accepted:false};
 game.open.push(index);if(game.open.length===1)return {accepted:true};game.turns++;
 const match=game.cards[game.open[0]]===game.cards[game.open[1]];
 if(match){game.matched.push(...game.open);game.open=[];}
 return {accepted:true,match,complete:game.matched.length===12};
}
export function nextObjective(s){
 if(s.restored)return 'The Aetherglass is alight. Explore the remaining places or try the Goldwheel tables.';
 if(s.seals.length===3)return 'Return to Goldspire and touch the great Aetherglass to light the realm.';
 const todo=seals.find(id=>!s.seals.includes(id));return ({artificer:'Visit the Artificers’ Guild in Goldspire. Complete Idris’s repair bench.',wayfarer:'Visit the Wayfarers’ Lodge in Greenveil. Restore the message route.',harbour:'Visit the Harbour Watch in Tidehaven. Complete the evidence ledger.'})[todo];
}
