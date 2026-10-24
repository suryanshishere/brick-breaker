import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {newSave,packSave,BRICK,PADDLE_Y} from '../src/engine';
test.beforeEach(async({page})=>{
 await page.route('**/api/me',route=>route.fulfill({json:{user:null}}));
 await page.route('**/api/config',route=>route.fulfill({json:{googleClientId:null}}));
 await page.addInitScript(()=>Object.defineProperty(navigator,'canShare',{value:()=>false}));
});
test('fits the viewport, locks levels, and restores an exact paused game',async({page},info)=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Launch game',exact:true})).toBeVisible();
 const bounds=await page.locator('#cabinet').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(info.project.use.viewport!.height+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`qa/${info.project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:'Choose level',exact:true}).click();await expect(page.getByRole('button',{name:'Level 2, locked',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('button',{name:'Launch game',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('aria-label',/playing/);
 await page.waitForTimeout(900);await page.getByRole('button',{name:'Pause game',exact:true}).click();await expect(page.getByRole('button',{name:'Resume game',exact:true})).toBeVisible();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('bb:guest')!).save.game);
 expect(before.balls.length).toBeGreaterThan(1);
 await page.reload();await expect(page.getByRole('button',{name:'Resume game',exact:true})).toBeVisible();const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('bb:guest')!).save.game);expect(after).toEqual(before);
});
test('keyboard and touch controls move the paddle',async({page},info)=>{
 await page.goto('/');await expect(page.locator('#pause')).toHaveText('Play');
 await page.locator('#pause').click();await expect(page.locator('#game')).toHaveAttribute('aria-label',/playing/);
 if(info.project.name==='mobile'){const b=(await page.locator('#right').boundingBox())!;const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await page.waitForTimeout(180);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');}
 await page.locator('#pause').click();
 const paddle=await page.evaluate(()=>JSON.parse(localStorage.getItem('bb:guest')!).save.game.paddle);expect(paddle).toBeGreaterThan(420);
 // Releasing the key or touch must stop movement, including after resuming.
 await page.locator('#pause').click();await page.waitForTimeout(180);await page.locator('#pause').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bb:guest')!).save.game.paddle)).toBe(paddle);
});
test('clearing a level unlocks the next and allows replays',async({page})=>{
 const s=newSave(),g=s.game,b=g.bricks.find(b=>b.hp===1&&b.y>600)!;g.bricks.forEach(brick=>{if(brick!==b)brick.hp=0});g.balls=[{x:b.x+BRICK/2,y:b.y+BRICK+8,vx:0,vy:-500}];g.status='paused';g.started=true;g.score=100;
 await page.addInitScript(save=>localStorage.setItem('bb:guest',JSON.stringify({save,version:0,dirty:true})),packSave(s));await page.goto('/');await page.getByRole('button',{name:'Resume game',exact:true}).click();await expect(page.getByRole('heading',{name:'Level cleared',exact:true})).toBeVisible();
 await expect(page.locator('#pause')).toHaveText('Next level');await expect(page.locator('#level-progress')).toHaveAttribute('value','1');
 await page.getByRole('button',{name:'Choose level',exact:true}).click();await expect(page.getByRole('button',{name:'Level 2',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Level 3, locked',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Level 2',exact:true}).click();await expect(page.locator('#current-level')).toHaveText('02');
 await page.getByRole('button',{name:'Choose level',exact:true}).click();await page.getByRole('button',{name:'Level 1, cleared',exact:true}).click();await expect(page.locator('#current-level')).toHaveText('01');
});
test('exports an image card and decodable local gameplay clip',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Same recording engine on both layouts');
 const s=newSave();s.game.status='paused';s.game.started=true;
 // Pause a normal attempt before its first loss, then verify the exported file can be decoded.
 s.game.balls=[{x:360,y:PADDLE_Y-14,vx:0,vy:0}];
 await page.addInitScript(save=>localStorage.setItem('bb:guest',JSON.stringify({save,version:0,dirty:true})),packSave(s));await page.goto('/');await page.getByRole('button',{name:'Resume game',exact:true}).click();await page.waitForTimeout(1200);await page.getByRole('button',{name:'Share card or recent clip',exact:true}).click();await expect(page.locator('#card-preview img')).toBeVisible();
 const imageEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click();const image=await imageEvent;expect((await readFile((await image.path())!)).subarray(1,4).toString()).toBe('PNG');
 const clipEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Recent clip',exact:true}).click();const clip=await clipEvent;const bytes=await readFile((await clip.path())!);expect(bytes.length).toBeGreaterThan(1000);expect(bytes.subarray(0,4).toString('hex')).toBe('1a45dfa3');
 const size=await page.evaluate(async(data)=>{const binary=atob(data),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const video=document.createElement('video');const url=URL.createObjectURL(new Blob([bytes],{type:'video/webm'}));video.src=url;await new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(new Error('Clip cannot be decoded'));});const result=[video.videoWidth,video.videoHeight];URL.revokeObjectURL(url);return result;},bytes.toString('base64'));expect(size).toEqual([720,1100]);
});

test('completed game actions stay visible on small screens and start the next level',async({page})=>{
 const s=newSave();s.game.status='won';s.game.started=true;s.game.bricks.forEach(b=>b.hp=0);s.completed=[1];s.unlocked=2;s.best[1]=1200;s.game.score=1200;
 await page.addInitScript(save=>localStorage.setItem('bb:guest',JSON.stringify({save,version:0,dirty:true})),packSave(s));
 await page.setViewportSize({width:320,height:568});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Level cleared'})).toBeVisible();
 const result=await page.locator('.overlay-card').boundingBox(),board=await page.locator('#playfield').boundingBox();
 expect(result!.y).toBeGreaterThanOrEqual(board!.y);expect(result!.y+result!.height).toBeLessThanOrEqual(board!.y+board!.height);
 await expect(page.locator('#pause')).toHaveText('Next level');await page.locator('#pause').click();
 await expect(page.locator('#current-level')).toHaveText('02');await expect(page.locator('#board-level-name')).toHaveText('Split');
 await expect(page.locator('#pause')).toHaveText('Play');await expect(page.locator('#game')).toHaveAttribute('aria-label',/ready/);
});
