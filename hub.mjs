import {cities,scenes,characters,lore,challenges} from './world.mjs';
import {SAVE_KEY,freshState,normalizeState,travel,reward,restoreCrystal,checkAnswer,newMemory,flipCard,nextObjective} from './engine.mjs';
import {RealmMusic} from './music.mjs';
const $=s=>document.querySelector(s),panel=$('#panel'),music=new RealmMusic();
let state=freshState(),storageOK=true,lastFocus=null,challenge=null,memory=null,sequence=null,timers=[],labels=true,toastTimer;
try{state=normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY)));}catch{storageOK=false;}
const initial=location.hash.slice(1);if(Object.hasOwn(scenes,initial))travel(state,initial);
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}$('#save-note').textContent=storageOK?'Progress stays in this browser.':'Browser storage is unavailable. Progress lasts until this page closes.';}
function node(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function button(text,fn,className){const b=node('button',text,className);b.type='button';b.addEventListener('click',fn);return b;}
function notify(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('shown');toastTimer=setTimeout(()=>$('#toast').classList.remove('shown'),4200);}
function later(fn,ms){const t=setTimeout(fn,ms);timers.push(t);return t;}
function clearTimers(){timers.forEach(clearTimeout);timers=[];}
function closePanel(){clearTimers();panel.close();challenge=null;memory=null;sequence=null;if(lastFocus?.isConnected)lastFocus.focus();}
function openPanel(title,kicker){clearTimers();if(!panel.open){lastFocus=document.activeElement;panel.showModal();}$('#panel-title').textContent=title;$('#panel-kicker').textContent=kicker;$('#panel-body').replaceChildren();$('#close-panel').focus();return $('#panel-body');}
function updateProgress(){
 $('#seal-count').textContent=`${state.seals.length} / 3`;$('#objective').textContent=nextObjective(state);
 $('#seal-icons').replaceChildren(...Object.entries(challenges).map(([id,c])=>{const n=node('span',({artificer:'⚒',wayfarer:'⌁',harbour:'⚓'})[id],'seal'+(state.seals.includes(id)?' earned':''));n.title=c.seal+(state.seals.includes(id)?' earned':' not yet earned');n.setAttribute('role','img');n.setAttribute('aria-label',n.title);return n;}));
 $('#scene-picture').classList.toggle('restored',state.restored);save();
}
function render(){
 const scene=scenes[state.scene],img=$('#scene-art');document.documentElement.style.setProperty('--gold',cities.find(c=>c.id===scene.city).color);
 $('#scene-title').textContent=scene.name;$('#scene-subtitle').textContent=scene.subtitle;$('#scene-description').textContent=scene.description;
 img.alt=scene.name+' — original Aetherglass environment';img.src=scene.image;$('#scene-error').hidden=true;
 img.onerror=()=>{$('#scene-error').hidden=false;};
 $('#back').hidden=!scene.back;$('#back').textContent=scene.back?'Back to '+scenes[scene.back].name:'Back';
 $('#hotspots').replaceChildren();$('#places').replaceChildren();
 scene.spots.forEach((s,i)=>{
  const b=button('',()=>activate(s),'hotspot');b.style.left=s.x+'%';b.style.top=s.y+'%';b.setAttribute('aria-label',s.label);b.append(node('i',i+1),node('span',s.label));$('#hotspots').append(b);
  const p=button('',()=>activate(s));p.append(node('span',String(i+1).padStart(2,'0')),node('strong',s.label));$('#places').append(p);
 });
 $('#cities').replaceChildren(...cities.map((c,i)=>{const b=button('',()=>go(c.id));b.style.setProperty('--city',c.color);b.setAttribute('aria-label','Travel to '+c.name);if(c.id===scene.city)b.setAttribute('aria-current','location');const text=node('span');text.append(node('strong',c.name),node('small',c.title));b.append(node('span',String(i+1).padStart(2,'0'),'city-number'),text);return b;}));
 updateProgress();music.setCity(scene.city);history.replaceState(null,'','#'+state.scene);
}
function go(id){if(!travel(state,id))return;if(panel.open)closePanel();render();notify(scenes[id].name);}
function activate(s){if(s.action==='travel')go(s.value);else if(s.action==='talk')talk(s.value);else if(s.action==='lore')readLore(s.value);else if(s.action==='challenge')startChallenge(s.value);else if(s.action==='game')s.value==='pairs'?startPairs():startSequence();else if(s.action==='crystal')crystal();}
function talk(id){
 const c=characters[id],body=openPanel(c.name,c.role);body.append(node('p',c.line));
 const answer=node('div'),options=node('div',undefined,'options');answer.setAttribute('aria-live','polite');
 c.topics.forEach(([q,a])=>options.append(button(id==='host'?'How to play '+q.toLowerCase():q,()=>{answer.replaceChildren(node('p',a));answer.className='topic-answer';})));
 body.append(options,answer);const actions=node('div',undefined,'dialog-actions');
 if(id==='idris')actions.append(button('Try the repair bench',()=>startChallenge('artificer'),'primary'));
 if(id==='wren')actions.append(button('Open my journal',showJournal,'primary'));
 if(id==='host')actions.append(button('Crystal pairs',startPairs,'primary'),button('Lantern sequence',startSequence));
 actions.append(button('Continue exploring',closePanel));body.append(actions);
}
function readLore(id){const [title,text]=lore[id],b=openPanel(title,'FIELD NOTES');b.append(node('p',text),button('Back to the scene',closePanel,'primary'));}
function showJournal(){
 const body=openPanel('A light between cities','YOUR FIELD JOURNAL');body.append(node('p',nextObjective(state)));
 const list=node('ul',undefined,'journal-list');
 Object.entries(challenges).forEach(([id,c])=>{const li=node('li');li.append(node('span',(state.seals.includes(id)?'✓  ':'◇  ')+c.seal),button(state.seals.includes(id)?'Revisit':'Go there',()=>go(c.place)));list.append(li);});body.append(list);
 body.append(node('p',`${state.stamps.length} / 2 Goldwheel stamps · ${state.restored?'Aetherglass restored':'Crystal waiting'}`,'panel-muted'));
 body.append(node('strong',`${state.visited.length} / ${Object.keys(scenes).length} places discovered`,'visited-count'));
 const places=node('div',undefined,'journal-places');state.visited.forEach(id=>places.append(button(scenes[id].name,()=>go(id))));body.append(places);
 body.append(node('p','Original cities, scenes, characters, and music recovered from Casey’s Aetherglass study realm. The public hub has its own activities and local save; it connects to no private agents or files.','panel-muted'));
 const actions=node('div',undefined,'dialog-actions');actions.append(button('Keep exploring',closePanel,'primary'),button('Start a new journey',confirmReset));body.append(actions);
}
function confirmReset(){const b=openPanel('Start a new journey?','LOCAL PROGRESS');b.append(node('p','This clears only this hub’s seals, stamps, and visited places in this browser.'));const row=node('div',undefined,'dialog-actions');row.append(button('Keep my progress',showJournal,'primary'),button('Reset this journey',()=>{state=freshState();closePanel();render();notify('A fresh journey begins in Goldspire.');}));b.append(row);}
function crystal(){
 const b=openPanel(state.restored?'The Aetherglass is alight':'The Aetherglass','A LIGHT BETWEEN CITIES');
 if(state.restored){b.append(node('div','✦','complete-badge'),node('p','Three guilds, three lessons, one connected realm. The light is restored. The cities remain open, and both Goldwheel tables are ready whenever you return.'));}
 else if(state.seals.length<3){b.append(node('p',`The crystal holds ${state.seals.length} of three study seals. Each guild has one practical task. Collect all three, then return here to finish the journey.`),node('p',nextObjective(state)));}
 else if(state.scene!=='goldspire'){b.append(node('p','All three seals are ready. The great crystal in Goldspire is waiting.'),button('Return to Goldspire',()=>go('goldspire'),'primary'));}
 else{b.append(node('p','Artificer, Wayfarer, Harbour. Your three seals fit into the crystal’s silver frame.'),button('Light the Aetherglass',()=>{restoreCrystal(state);updateProgress();crystal();notify('The Aetherglass is restored. Your journey is saved.');},'primary'));}
 const actions=node('div',undefined,'dialog-actions');actions.append(button('Choose a city',closePanel),button('Open journal',showJournal));b.append(actions);
}
function startChallenge(id){challenge={id,index:0};renderQuestion();}
function renderQuestion(){
 const {id,index}=challenge,c=challenges[id],q=c.questions[index],b=openPanel(c.title,'GUILD CHALLENGE');
 const progress=node('div',undefined,'progress-line');progress.append(node('span',`CHECK ${index+1} OF ${c.questions.length}`));const meter=node('progress');meter.max=c.questions.length;meter.value=index;meter.setAttribute('aria-label','Completed checks');progress.append(meter);b.append(progress,node('p',index===0?c.intro:'The next step…'),node('h3',q.q));
 const options=node('div',undefined,'options'),feedback=node('div');feedback.setAttribute('aria-live','polite');
 q.options.forEach((text,i)=>options.append(button(text,()=>{
  const correct=checkAnswer(id,index,i);feedback.className='answer-feedback'+(correct?' correct':'');feedback.replaceChildren(node('strong',correct?'That’s right.':'Try another choice.'),node('p',correct?q.why:'Think about the job described in the question. You can also ask Idris or the Tip Owl for a hint.'));
  if(correct){options.querySelectorAll('button').forEach(x=>x.disabled=true);const next=button(index+1===c.questions.length?'Collect the seal':'Next check',()=>{if(index+1===c.questions.length){reward(state,'seal',id);updateProgress();challenge=null;const done=openPanel(c.seal,'GUILD CHALLENGE COMPLETE');done.append(node('div','✦','complete-badge'),node('p','Seal recorded in your journal. '+nextObjective(state)),button('Return to the scene',closePanel,'primary'));}else{challenge.index++;renderQuestion();}},'primary');feedback.append(next);next.focus();}
 })));b.append(options,feedback);
}
const emblems={sun:['☀','Sun'],moon:['☾','Moon'],star:['✦','Star'],leaf:['❧','Leaf'],wave:['≋','Wave'],crystal:['◇','Crystal']};
function startPairs(){memory=newMemory();openPanel('Crystal pairs','GOLDWHEEL · MEMORY TABLE');drawPairs();}
function drawPairs(focusIndex){
 if(!memory)return;const b=$('#panel-body');b.replaceChildren(node('p','Find six matching pairs. Turn over two cards at a time. Take as long as you like.'));
 const status=node('p',`${memory.matched.length/2} / 6 pairs · ${memory.turns} turns`,'panel-muted');status.setAttribute('aria-live','polite');b.append(status);
 const grid=node('div',undefined,'memory-grid');
 memory.cards.forEach((symbol,i)=>{const visible=memory.open.includes(i)||memory.matched.includes(i),matched=memory.matched.includes(i);const card=button('',()=>{const result=flipCard(memory,i);if(!result.accepted)return;drawPairs(i);if(result.match===false)later(()=>{if(memory){const focused=[...$('#panel-body').querySelectorAll('.memory-card')].indexOf(document.activeElement);memory.open=[];drawPairs(focused<0?undefined:focused);}},950);if(result.complete){reward(state,'stamp','pairs');updateProgress();const done=node('p','Table complete. Your Crystal Pairs stamp is in the journal.');done.setAttribute('role','status');$('#panel-body').append(done);}},'memory-card'+(visible?' revealed':'')+(matched?' matched':''));card.setAttribute('aria-label',`Card ${i+1}: ${visible?emblems[symbol][1]:'face down'}${matched?' matched':''}`);card.disabled=matched;card.append(node('span',visible?emblems[symbol][0]:'✧'),node('small',visible?emblems[symbol][1]:String(i+1).padStart(2,'0')));grid.append(card);});b.append(grid);
 const actions=node('div',undefined,'dialog-actions');actions.append(button('New board',startPairs),button('Leave the table',closePanel));b.append(actions);if(Number.isInteger(focusIndex))(grid.children[focusIndex]?.disabled?grid.querySelector('button:not(:disabled)')||actions.firstChild:grid.children[focusIndex])?.focus();
}
const lamps=[['Amber','#efc779'],['Jade','#99d7ba'],['Azure','#94cbed'],['Rose','#dca8d8']];
function startSequence(){sequence={pattern:[Math.floor(Math.random()*4)],input:0,showing:false,won:false};openPanel('Lantern sequence','GOLDWHEEL · OBSERVATION TABLE');drawSequence();}
function drawSequence(){
 const b=$('#panel-body');b.replaceChildren(node('p','Watch the lanterns light up, then repeat their order. Complete five rounds to earn a stamp.'));
 b.append(node('p',`Round ${sequence.pattern.length} / 5`,'panel-muted'));const msg=node('p','Press “Watch pattern” to begin.');msg.id='game-message';msg.setAttribute('aria-live','polite');b.append(msg);
 const grid=node('div',undefined,'lantern-grid');lamps.forEach(([name,color],i)=>{const lamp=button(name,()=>inputLamp(i),'lantern');lamp.style.setProperty('--lamp',color);lamp.setAttribute('aria-label',name+' lantern');lamp.dataset.lamp=i;lamp.disabled=true;grid.append(lamp);});b.append(grid);
 const actions=node('div',undefined,'dialog-actions');const watch=button('Watch pattern',playSequence,'primary');watch.id='watch-pattern';actions.append(watch,button('Restart',startSequence));b.append(actions);
}
function playSequence(){
 if(!sequence||sequence.showing||sequence.won)return;clearTimers();sequence.showing=true;sequence.input=0;$('#watch-pattern').disabled=true;
 const list=[...$('#panel-body').querySelectorAll('.lantern')];list.forEach(b=>{b.disabled=true;b.classList.remove('lit');});$('#game-message').textContent='Watch carefully…';
 sequence.pattern.forEach((n,i)=>{later(()=>{list[n].classList.add('lit');$('#game-message').textContent=`${i+1}. ${lamps[n][0]}`;},i*850+300);later(()=>list[n].classList.remove('lit'),i*850+900);});
 later(()=>{if(!sequence)return;sequence.showing=false;list.forEach(b=>b.disabled=false);$('#watch-pattern').disabled=false;$('#game-message').textContent='Your turn. Repeat the pattern.';},sequence.pattern.length*850+400);
}
function inputLamp(i){
 if(!sequence||sequence.showing||sequence.won)return;const lamp=$(`[data-lamp="${i}"]`);lamp.classList.add('lit');later(()=>lamp.classList.remove('lit'),230);
 if(i!==sequence.pattern[sequence.input]){sequence.input=0;$('#game-message').textContent='A different pattern. Watch it again, then try once more.';$('#panel-body').querySelectorAll('.lantern').forEach(b=>b.disabled=true);return;}
 sequence.input++;$('#game-message').textContent=`${sequence.input} / ${sequence.pattern.length} lanterns remembered`;
 if(sequence.input===sequence.pattern.length){$('#panel-body').querySelectorAll('.lantern').forEach(b=>b.disabled=true);if(sequence.pattern.length===5){sequence.won=true;reward(state,'stamp','sequence');updateProgress();$('#game-message').textContent='Five rounds complete. Your Lantern Memory stamp is saved.';$('#watch-pattern').disabled=true;}else{sequence.pattern.push(Math.floor(Math.random()*4));later(()=>{if(sequence){drawSequence();$('#game-message').textContent='Well remembered. Watch the next pattern.';}},650);}}
}
$('#close-panel').onclick=closePanel;panel.addEventListener('cancel',e=>{e.preventDefault();closePanel();});panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();}});
$('#journal').onclick=showJournal;$('#back').onclick=()=>{if(scenes[state.scene].back)go(scenes[state.scene].back);};
$('#markers').onclick=()=>{labels=!labels;$('#scene-picture').classList.toggle('labels-off',!labels);$('#markers').textContent=labels?'Labels on':'Labels off';$('#markers').setAttribute('aria-pressed',String(labels));};
const musicState=()=>{$('#music').textContent=music.playing?'Music on':'Music off';$('#music').setAttribute('aria-pressed',String(music.playing));$('#music').title=music.playing?music.title:'Original music-box score';};
$('#music').onclick=async()=>{try{if(music.playing)music.stop();else await music.start(scenes[state.scene].city);musicState();}catch{music.stop();musicState();notify('Audio could not start in this browser. You can keep exploring silently.');}};
function suspend(){music.stop();musicState();if(sequence?.showing){clearTimers();sequence.showing=false;sequence.input=0;drawSequence();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='aetherglass-suspend')suspend();});
window.addEventListener('hashchange',()=>{if(Object.hasOwn(scenes,location.hash.slice(1)))go(location.hash.slice(1));});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.open&&parent!==window){parent.postMessage({type:'aetherglass-close'},location.origin);}});
function fitScene(){const box=$('.scene-space'),picture=$('#scene-picture');if(matchMedia('(max-width:650px)').matches){picture.style.width='';picture.style.height='';return;}const w=Math.max(0,Math.min(box.clientWidth-16,(box.clientHeight-16)*1.5));picture.style.width=w+'px';picture.style.height=w/1.5+'px';}
new ResizeObserver(fitScene).observe($('.scene-space'));
render();fitScene();
