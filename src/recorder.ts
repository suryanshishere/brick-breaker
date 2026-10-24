type Segment={recorder:MediaRecorder;parts:Blob[];start:number;end?:number;done:Promise<Blob>;resolve:(blob:Blob)=>void};
// Overlapping independent recordings make each exported clip a valid video file.
// At most two live encoders; clips and buffers never leave this browser.
export class RecentRecorder {
 private stream?:MediaStream;private active:Segment[]=[];private timer?:ReturnType<typeof setInterval>;private last?:{blob:Blob;start:number;end:number};private mime='';private epoch=0;enabled=false;
 constructor(private canvas:HTMLCanvasElement){}
 get supported(){return typeof MediaRecorder!=='undefined'&&typeof this.canvas.captureStream==='function';}
 start(){if(this.enabled||!this.supported)return;try{this.mime=['video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t))||'';if(!this.mime)return;this.stream=this.canvas.captureStream(30);this.enabled=true;this.spawn();this.timer=setInterval(()=>{for(const s of [...this.active])if(performance.now()-s.start>=19500)this.stopSegment(s);this.spawn();},10000);}catch{this.stop();}}
 private spawn(){if(!this.stream||!this.enabled)return;try{let resolve!:(b:Blob)=>void;const done=new Promise<Blob>(r=>resolve=r);const recorder=new MediaRecorder(this.stream,{mimeType:this.mime,videoBitsPerSecond:1800000});const s:Segment={recorder,parts:[],start:performance.now(),done,resolve},epoch=this.epoch;recorder.ondataavailable=e=>{if(e.data.size)s.parts.push(e.data)};recorder.onstop=()=>{const blob=new Blob(s.parts,{type:recorder.mimeType}),end=s.end||performance.now();if(epoch===this.epoch&&(!this.last||end>this.last.end+250||Math.abs(end-this.last.end)<=250&&s.start<this.last.start))this.last={blob,start:s.start,end};s.resolve(blob);this.active=this.active.filter(a=>a!==s);};recorder.onerror=()=>this.stop();this.active.push(s);recorder.start(1000);}catch{this.stop();}}
 private stopSegment(s:Segment){if(s.recorder.state!=='inactive'){s.end=performance.now();s.recorder.stop();}}
 async clip():Promise<Blob|null>{const s=this.active[0];if(s){this.stopSegment(s);const blob=await s.done;if(this.enabled&&this.active.length===0)this.spawn();return blob.size?blob:null;}return this.last?.blob||null;}
 stop(){this.enabled=false;if(this.timer)clearInterval(this.timer);this.timer=undefined;for(const s of this.active)this.stopSegment(s);this.stream?.getTracks().forEach(t=>t.stop());this.stream=undefined;}
 clear(){this.epoch++;this.stop();this.last=undefined;}
}
