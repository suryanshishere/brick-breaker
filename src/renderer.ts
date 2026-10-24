import {COLORS,H,W,R,PADDLE_Y,paddleWidth,type Game,type GameEvent} from './engine';
type Particle={x:number;y:number;vx:number;vy:number;life:number;color:string};
export class Renderer{
 private ctx:CanvasRenderingContext2D;private particles:Particle[]=[];
 constructor(public canvas:HTMLCanvasElement){canvas.width=W;canvas.height=H;this.ctx=canvas.getContext('2d',{alpha:false})!;}
 burst(e:GameEvent){if(matchMedia('(prefers-reduced-motion: reduce)').matches||this.particles.length>200)return;if(!['brick','power','won'].includes(e.type))return;for(let i=0;i<(e.type==='won'?55:e.type==='power'?14:2);i++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,life:.3+Math.random()*.3,color:e.type==='power'?'#42d4dc':COLORS[e.color||0]});}
 draw(g:Game,dt:number){const c=this.ctx;c.fillStyle='#181818';c.fillRect(0,0,W,H);
  c.font='500 18px "Space Mono",monospace';c.fillStyle='#bdbdbd';c.fillText(String(g.score).padStart(5,'0'),36,39);c.textAlign='center';c.fillStyle='#797979';c.font='13px "Space Mono",monospace';c.fillText(`LV ${String(g.level).padStart(2,'0')}`,W/2,37);c.textAlign='right';c.fillStyle='#c1c1c1';c.fillText(`${g.balls.length} ${g.balls.length===1?'BALL':'BALLS'}`,W-36,37);c.textAlign='left';
  for(const b of g.bricks){if(!b.hp)continue;c.fillStyle=b.max>1&&b.hp>1?'#929292':COLORS[b.color===4?0:b.color];c.fillRect(b.x,b.y,10.6,10.6);}
  c.fillStyle='#f9f9f9';for(const b of g.balls){c.beginPath();c.arc(b.x,b.y,R,0,Math.PI*2);c.fill();}
  const width=paddleWidth(g);c.fillStyle=g.wide>0?'#ffb28a':'#ff8b52';c.fillRect(g.paddle-width/2,PADDLE_Y,width,10);
  if(g.status==='ready'){c.setLineDash([2,13]);c.strokeStyle='#ffffff22';c.beginPath();c.moveTo(g.paddle,PADDLE_Y-25);c.lineTo(g.paddle+54,PADDLE_Y-160);c.stroke();c.setLineDash([]);}
  for(const d of g.drops){c.fillStyle=d.kind===3?'#30cdd5':d.kind===1?'#ffb077':'#b1c3fc';c.beginPath();c.arc(d.x,d.y,17,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.font='bold 17px sans-serif';c.textAlign='center';c.fillText(['','↔','◷','+3'][d.kind],d.x,d.y+6);c.textAlign='left';}
  for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;c.globalAlpha=Math.max(0,p.life*1.6);c.fillStyle=p.color;c.fillRect(p.x,p.y,2.5,2.5);}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
  for(let i=0;i<3;i++){c.fillStyle=i<g.lives?'#ff8b52':'#3d3d3d';c.beginPath();c.arc(W/2-17+i*17,H-32,3.5,0,Math.PI*2);c.fill();}
  if(g.wide>0||g.slow>0){c.font='12px "Space Mono",monospace';c.fillStyle='#c5b9a4';c.fillText(g.wide>0?`↔ ${Math.ceil(g.wide)}s`:`◷ ${Math.ceil(g.slow)}s`,36,H-29);}
 }
}
export class Sound{
 muted=false;private ctx?:AudioContext;private last=0;
 unlock(){if(!this.ctx)try{this.ctx=new AudioContext();}catch{};void this.ctx?.resume();}
 play(type:GameEvent['type']){if(this.muted||!this.ctx||this.ctx.state!=='running'||type==='wall')return;const c=this.ctx;if(type==='brick'&&c.currentTime-this.last<.045)return;this.last=c.currentTime;const o=c.createOscillator(),v=c.createGain();o.connect(v);v.connect(c.destination);o.type='sine';o.frequency.setValueAtTime(({brick:730,paddle:300,power:1050,life:160,won:1000,lost:110,wall:220})[type],c.currentTime);o.frequency.exponentialRampToValueAtTime(type==='won'?1600:type==='life'||type==='lost'?65:400,c.currentTime+.08);v.gain.setValueAtTime(.035,c.currentTime);v.gain.exponentialRampToValueAtTime(.001,c.currentTime+.12);o.start();o.stop(c.currentTime+.13);}
}
