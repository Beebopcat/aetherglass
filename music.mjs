import {scores} from './scores.mjs';
const cityScores={goldspire:'lantern',greenveil:'canopy',tidehaven:'tide',goldwheel:'aether'};
// Original KantoOps music-box compositions, restored with a small isolated Web Audio player.
export class RealmMusic{
 constructor(){this.playing=false;this.city='goldspire';this.title='';this.timer=null;this.context=null;}
 async start(city){
  this.stop();const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Audio unavailable');
  const ctx=new AC();this.context=ctx;await ctx.resume();if(this.context!==ctx)return;
  this.city=city;const score=scores[cityScores[city]||'lantern'];this.title=score.title;this.playing=true;
  const bus=ctx.createGain();bus.gain.value=.36;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;bus.connect(compressor);compressor.connect(ctx.destination);
  const room=ctx.createConvolver(),buffer=ctx.createBuffer(2,Math.floor(ctx.sampleRate*1.9),ctx.sampleRate);
  for(let ch=0;ch<2;ch++){const d=buffer.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*.35;}room.buffer=buffer;const wet=ctx.createGain();wet.gain.value=.25;room.connect(wet);wet.connect(bus);
  const parts=['lead','harm','bass'].map(key=>score[key].join(' ').trim().split(/\s+/)),stepTime=60/score.bpm/4;
  let step=0,next=ctx.currentTime+.08;
  const note=(midi,t,volume)=>{
   const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+1.5);gain.connect(bus);gain.connect(room);
   [1,2.76,5.4].forEach((ratio,i)=>{const osc=ctx.createOscillator(),partial=ctx.createGain();osc.type='sine';osc.frequency.value=440*2**((midi-69)/12)*ratio;partial.gain.value=[1,.19,.05][i];osc.connect(partial);partial.connect(gain);osc.start(t);osc.stop(t+1.55);osc.onended=()=>{osc.disconnect();partial.disconnect();};});setTimeout(()=>gain.disconnect(),Math.max(0,(t+1.7-ctx.currentTime)*1000));
  };
  const tick=()=>{if(!this.playing||ctx!==this.context)return;while(next<ctx.currentTime+.22){parts.forEach((p,i)=>{const n=Number(p[step%p.length]);if(Number.isFinite(n))note(score.root+[24,12,0][i]+n,next,[.13,.06,.08][i]);});step++;next+=stepTime;}this.timer=setTimeout(tick,80);};tick();
 }
 setCity(city){if(city===this.city)return;this.city=city;if(this.playing)this.start(city).catch(()=>this.stop());}
 stop(){this.playing=false;clearTimeout(this.timer);if(this.context){this.context.close().catch(()=>{});this.context=null;}}
}
