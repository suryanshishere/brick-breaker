export const W=720,H=1100,PADDLE_Y=1000,R=5,COLS=54,ROWS=54,CELL=12,BX=36,BY=80,BRICK=10.6,MAX_BALLS=48;
export const COLORS=['#6b8f3e','#759943','#5f8037','#83a34c','#a0a0a0','#ff8b52'];
export const NAMES=['Hollow','Split','Chambers','Diamond','Switchback','Crossroads','Circuit','Windows','Prism','Coil','Citadel','Channels','Catacombs','Orbit','Serpentine','Bastion','Fracture','Labyrinth','Stronghold','Final form'];
export type Status='ready'|'playing'|'paused'|'won'|'lost';
export type Brick={x:number;y:number;hp:number;max:number;color:number;drop:number};
export type Ball={x:number;y:number;vx:number;vy:number};
export type Drop={x:number;y:number;kind:number;fall:boolean};
export type Game={level:number;status:Status;score:number;lives:number;elapsed:number;paddle:number;balls:Ball[];bricks:Brick[];drops:Drop[];wide:number;slow:number;started:boolean};
export type Save={schema:2;unlocked:number;completed:number[];best:Record<string,number>;game:Game;updatedAt:number};
export type PackedSave=Omit<Save,'game'>&{game:Omit<Game,'bricks'>&{bricks:string}};
export type GameEvent={type:'brick'|'paddle'|'wall'|'life'|'power'|'won'|'lost';x:number;y:number;color?:number};
export const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function layout(level:number):Brick[]{
 const out:Brick[]=[],pattern=(level-1)%5,tier=Math.floor((level-1)/5),mid=26.5,arm=16-tier,other=53-arm;
 for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
  let hole=false,wall=false;const edge=row===0||row===53||col===0||col===53;
  if(pattern===0){hole=(Math.abs(col-arm)<1.2||Math.abs(col-other)<1.2)&&row>17-tier*2||Math.abs(row-(34-tier*2))<1.2&&col>=arm&&col<=other;wall=((Math.abs(col-arm)===2||Math.abs(col-other)===2)&&row>17-tier*2)||(Math.abs(row-(34-tier*2))===2&&col>=arm&&col<=other);}
  if(pattern===1){const x=18-tier*2,y=36+tier;hole=(Math.abs(col-x)<1.2&&row>7)||(Math.abs(col-y)<1.2&&row>7)||(Math.abs(row-25)<1.2&&col>x&&col<y);wall=((Math.abs(col-x)===2||Math.abs(col-y)===2)&&row>7)||row===9&&col>x&&col<y;}
  if(pattern===2){hole=(col%18>=8&&col%18<=9)||(row%18>=8&&row%18<=9);wall=col%18===6||col%18===11||row%18===6||row%18===11;}
  if(pattern===3){const d=Math.abs(row-mid)+Math.abs(col-mid);hole=Math.abs(d-(19+tier*2))<1.4||Math.abs(col-mid)<1.2&&row>mid;wall=Math.abs(d-(22+tier*2))<.6;}
  if(pattern===4){const lane=Math.floor(row/10),turn=lane%2?8+tier:45-tier;hole=(row%10>=7&&row%10<=8&&col>=8&&col<=45)||(Math.abs(col-turn)<1.2&&row%10<=8);wall=row%10===5&&col>8&&col<45;}
  if(row>=51&&(Math.abs(col-arm)<=1||Math.abs(col-other)<=1||Math.abs(col-mid)<1.5))hole=true;
  const hp=hole?0:edge||wall?2+(tier>=2?1:0):level>=12&&(row*7+col*3+level)%41===0?2:1;
  const drop=hp>0&&!edge&&(row*17+col*11+level)%47===0?((row+col)%9===0?1:(row+col)%11===0?2:3):0;
  out.push({x:BX+col*CELL,y:BY+row*CELL,hp,max:hp,color:edge||wall?4:(Math.floor(row/9)+Math.floor(col/9)+tier)%4,drop});
 }return out;
}
export function newGame(level=1):Game{return {level,status:'ready',score:0,lives:3,elapsed:0,paddle:W/2,balls:[{x:W/2,y:PADDLE_Y-14,vx:0,vy:0}],bricks:layout(level),drops:[{x:414,y:825,kind:3,fall:false},{x:250,y:768,kind:3,fall:false}],wide:0,slow:0,started:false};}
export function newSave():Save{return {schema:2,unlocked:1,completed:[],best:{},game:newGame(),updatedAt:Date.now()};}
export function paddleWidth(g:Game){return g.wide>0?164:118-Math.floor((g.level-1)/5)*6;}
export function launch(g:Game){if(g.status==='paused')g.status=g.balls.some(b=>b.vy!==0)?'playing':'ready';if(g.status==='ready'){const speed=420+(g.level-1)*6;g.balls=[{x:g.paddle,y:PADDLE_Y-14,vx:speed*.32,vy:-speed*.9474}];g.status='playing';g.started=true;}}
export function complete(save:Save){const g=save.game;if(g.status!=='won')return;save.unlocked=Math.max(save.unlocked,Math.min(20,g.level+1));if(!save.completed.includes(g.level))save.completed.push(g.level);save.best[g.level]=Math.max(save.best[g.level]||0,g.score);}
function addBalls(g:Game,x:number,y:number){const speed=440+(g.level-1)*6;for(let i=0;i<3&&g.balls.length<MAX_BALLS;i++){const angle=[-.69,.12,.79][i];g.balls.push({x,y,vx:Math.sin(angle)*speed,vy:-Math.cos(angle)*speed});}}
export function step(g:Game,dt:number):GameEvent[]{
 const events:GameEvent[]=[];if(g.status!=='playing'){if(g.status==='ready')g.balls.forEach(b=>b.x=g.paddle);return events;}
 dt=clamp(dt,0,1/30);g.elapsed+=dt;g.wide=Math.max(0,g.wide-dt);g.slow=Math.max(0,g.slow-dt);
 const n=4,delta=dt/n;
 for(let sub=0;sub<n;sub++)for(const ball of g.balls){
  const factor=g.slow>0?.72:1,px=ball.x,py=ball.y;ball.x+=ball.vx*delta*factor;ball.y+=ball.vy*delta*factor;
  if(ball.x<R||ball.x>W-R){ball.x=clamp(ball.x,R,W-R);ball.vx=-ball.vx;}
  if(ball.y<52+R){ball.y=52+R;ball.vy=Math.abs(ball.vy);}
  const half=paddleWidth(g)/2;
  if(ball.vy>0&&py+R<=PADDLE_Y&&ball.y+R>=PADDLE_Y&&ball.x>=g.paddle-half-R&&ball.x<=g.paddle+half+R){const angle=clamp((ball.x-g.paddle)/half,-1,1)*1.13,speed=Math.min(680,Math.hypot(ball.vx,ball.vy)*1.004);ball.vx=Math.sin(angle)*speed;ball.vy=-Math.cos(angle)*speed;ball.y=PADDLE_Y-R;events.push({type:'paddle',x:ball.x,y:ball.y});}
  const minCol=clamp(Math.floor((ball.x-R-BX)/CELL),0,COLS-1),maxCol=clamp(Math.floor((ball.x+R-BX)/CELL),0,COLS-1),minRow=clamp(Math.floor((ball.y-R-BY)/CELL),0,ROWS-1),maxRow=clamp(Math.floor((ball.y+R-BY)/CELL),0,ROWS-1);
  let hit=false;for(let row=minRow;row<=maxRow&&!hit;row++)for(let col=minCol;col<=maxCol;col++){const b=g.bricks[row*COLS+col];if(b.hp<=0)continue;if(ball.x+R>b.x&&ball.x-R<b.x+BRICK&&ball.y+R>b.y&&ball.y-R<b.y+BRICK){
   if(px+R<=b.x||px-R>=b.x+BRICK){ball.vx=-ball.vx;ball.x=px;}else{ball.vy=-ball.vy;ball.y=py;}
   b.hp--;g.score+=b.hp===0?10:2;events.push({type:'brick',x:b.x+BRICK/2,y:b.y+BRICK/2,color:b.color});if(b.hp===0&&b.drop&&g.drops.length<80)g.drops.push({x:b.x+BRICK/2,y:b.y+BRICK/2,kind:b.drop,fall:true});hit=true;break;
  }}
 }
 g.balls=g.balls.filter(b=>b.y<H+R);
 for(const d of g.drops){if(d.fall)d.y+=70*dt;const ball=g.balls.find(b=>Math.hypot(b.x-d.x,b.y-d.y)<R+17),paddle=d.y>=PADDLE_Y-15&&d.y<=PADDLE_Y+20&&Math.abs(d.x-g.paddle)<paddleWidth(g)/2+15;
  if(ball||paddle){const x=ball?.x||d.x,y=ball?.y||PADDLE_Y-20;d.y=H+100;if(d.kind===1)g.wide=14;if(d.kind===2)g.slow=12;if(d.kind===3)addBalls(g,x,y);events.push({type:'power',x,y});}}
 g.drops=g.drops.filter(d=>d.y<H);
 if(g.bricks.every(b=>b.hp<=0)){g.status='won';events.push({type:'won',x:W/2,y:H/2});}
 else if(!g.balls.length){g.lives--;g.wide=0;g.slow=0;g.drops=[{x:414,y:825,kind:3,fall:false}];g.status=g.lives>0?'ready':'lost';g.balls=[{x:g.paddle,y:PADDLE_Y-14,vx:0,vy:0}];events.push({type:g.lives>0?'life':'lost',x:g.paddle,y:PADDLE_Y});}
 return events;
}
export function packSave(s:Save):PackedSave{const g=s.game;return {schema:2,unlocked:s.unlocked,completed:s.completed,best:s.best,updatedAt:s.updatedAt,game:{level:g.level,status:g.status,score:g.score,lives:g.lives,elapsed:g.elapsed,paddle:g.paddle,balls:g.balls.map(({x,y,vx,vy})=>({x,y,vx,vy})),bricks:g.bricks.map(b=>String(b.hp)).join(''),drops:g.drops.map(({x,y,kind,fall})=>({x,y,kind,fall})),wide:g.wide,slow:g.slow,started:g.started}};}
export function parseSave(value:unknown):Save|null{try{if(!value||typeof value!=='object')return null;const raw=value as PackedSave;if(raw.schema!==2||typeof raw.game?.bricks!=='string'||raw.game.bricks.length!==COLS*ROWS||!/^[0-3]+$/.test(raw.game.bricks)||!Number.isInteger(raw.game.level)||raw.game.level<1||raw.game.level>20)return null;const bricks=layout(raw.game.level);for(let i=0;i<bricks.length;i++)bricks[i].hp=Number(raw.game.bricks[i]);const save={...raw,game:{...raw.game,bricks}} as Save;return validSave(save)?save:null;}catch{return null;}}
export function validSave(value:unknown):value is Save{
 if(!value||typeof value!=='object')return false;const s=value as Save,g=s.game;const finite=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 if(s.schema!==2||!Number.isInteger(s.unlocked)||!finite(s.unlocked,1,20)||!Array.isArray(s.completed)||s.completed.length>20||new Set(s.completed).size!==s.completed.length||s.completed.some(n=>!Number.isInteger(n)||n<1||n>20||n>s.unlocked)||!s.best||typeof s.best!=='object'||Array.isArray(s.best)||Object.entries(s.best).some(([k,v])=>!/^([1-9]|1[0-9]|20)$/.test(k)||!finite(v,0,1e8))||!finite(s.updatedAt,0,1e15)||!g)return false;
 if(!Number.isInteger(g.level)||!finite(g.level,1,s.unlocked)||!['ready','playing','paused','won','lost'].includes(g.status)||!finite(g.score,0,1e8)||!Number.isInteger(g.lives)||!finite(g.lives,0,3)||!finite(g.elapsed,0,1e9)||!finite(g.paddle,0,W)||typeof g.started!=='boolean'||!finite(g.wide,0,14)||!finite(g.slow,0,12))return false;
 if(!Array.isArray(g.balls)||g.balls.length<(g.status==='won'?0:1)||g.balls.length>MAX_BALLS||g.balls.some(b=>!b||!finite(b.x,-100,W+100)||!finite(b.y,0,H+100)||!finite(b.vx,-700,700)||!finite(b.vy,-700,700)))return false;
 const expected=layout(g.level);if(!Array.isArray(g.bricks)||g.bricks.length!==expected.length||g.bricks.some((b,i)=>!b||['x','y','max','color','drop'].some(k=>b[k as keyof Brick]!==expected[i][k as keyof Brick])||!Number.isInteger(b.hp)||!finite(b.hp,0,b.max)))return false;
 return Array.isArray(g.drops)&&g.drops.length<=100&&g.drops.every(d=>d&&finite(d.x,0,W)&&finite(d.y,0,H)&&[1,2,3].includes(d.kind)&&typeof d.fall==='boolean');
}
