import {test,expect} from '@playwright/test';
import {newSave,packSave} from '../src/engine';

test.beforeEach(async({page})=>{
 await page.route('**/api/me',r=>r.fulfill({json:{user:null}}));
 await page.route('**/api/config',r=>r.fulfill({json:{googleClientId:null}}));
});

test('movement controls follow the input device and game state at every layout breakpoint',async({page},info)=>{
 const s=newSave();s.game.status='paused';s.game.started=true;s.game.balls=[{x:360,y:800,vx:0,vy:-1}];
 await page.goto('/');
 for(const [width,height] of [[320,568],[390,844],[568,320],[844,390],[959,720],[960,720],[1024,768],[1440,900]]){
  await page.setViewportSize({width,height});await page.evaluate(save=>localStorage.setItem('bb:guest',JSON.stringify({save,version:0,dirty:true})),packSave(s));await page.reload();
  await expect(page.locator('#left')).toBeHidden();await expect(page.locator('#right')).toBeHidden();
  await page.locator('#pause').click();await expect(page.locator('#game')).toHaveAttribute('aria-label',/playing/);
  for(const id of ['left','right']){
   if(info.project.name==='mobile')await expect(page.locator('#'+id)).toBeVisible();
   else await expect(page.locator('#'+id)).toBeHidden();
  }
  await page.locator('#pause').click();await expect(page.locator('#game')).toHaveAttribute('aria-label',/paused/);
  await expect(page.locator('#left')).toBeHidden();await expect(page.locator('#right')).toBeHidden();
  await expect(page.locator('.direction-label')).toBeHidden();
 }
});

test('keyboard input cannot change a paused paddle or leak into resume',async({page})=>{
 await page.goto('/');await page.locator('#pause').click();await page.locator('#pause').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('bb:guest')!).save.game.paddle);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
 await page.locator('#pause').click();await page.locator('#pause').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bb:guest')!).save.game.paddle)).toBe(before);
});

test('completed and failed attempts hide movement controls and ignore movement keys',async({page})=>{
 await page.goto('/');
 for(const state of ['won','lost'] as const){
  const s=newSave();s.game.started=true;s.game.status=state;
  if(state==='won'){s.game.bricks.forEach(b=>b.hp=0);s.completed=[1];s.unlocked=2;}else s.game.lives=0;
  await page.evaluate(save=>localStorage.setItem('bb:guest',JSON.stringify({save,version:0,dirty:true})),packSave(s));await page.reload();
  await expect(page.locator('#left')).toBeHidden();await expect(page.locator('#right')).toBeHidden();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
  await page.locator('#settings').click();await page.locator('#modal-close').click();
  await page.locator('#share').click();await expect(page.locator('#card-preview img')).toBeVisible();
  await expect(page.locator('#share-clip')).toBeDisabled();await page.locator('#modal-close').click();
 }
});

test('clip action requires a recording from this session',async({page})=>{
 await page.goto('/');await page.locator('#share').click();await expect(page.locator('#share-clip')).toBeDisabled();
 await expect(page.getByText('Play a round to record a clip.')).toBeVisible();await page.locator('#modal-close').click();
 await page.locator('#pause').click();await page.waitForTimeout(250);await page.locator('#share').click();
 await expect(page.locator('#card-preview img')).toBeVisible();await expect(page.locator('#share-clip')).toBeEnabled();
});

test('unsupported fullscreen is hidden and help remains accessible',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:false}));
 await page.goto('/');await expect(page.locator('#desktop-fullscreen')).toBeHidden();
 await page.locator('#settings').click();await expect(page.locator('#fullscreen')).toHaveCount(0);
 await page.locator('#setting-help').click();await expect(page.getByRole('heading',{name:'A little focus. A lot of bricks.'})).toBeVisible();
});

test('large scores preserve the score columns and expose the full value',async({page})=>{
 const s=newSave();s.game.score=100000000;s.best[1]=100000000;
 await page.addInitScript(save=>localStorage.setItem('bb:guest',JSON.stringify({save,version:0,dirty:true})),packSave(s));
 await page.goto('/');
 await expect(page.locator('#stat-score')).toHaveText('100M');await expect(page.locator('#stat-best')).toHaveText('100M');
 await expect(page.locator('#stat-score')).toHaveAttribute('title','100,000,000 points');
 expect(await page.evaluate(()=>[...document.querySelectorAll('.game-stats>div')].every(e=>e.scrollWidth<=e.clientWidth+1))).toBe(true);
});

test('long player names leave the clock and player controls accessible',async({page})=>{
 const user={id:'audit-player',name:'Alexanderthegreatwithaveryveryverylongname'};
 await page.route('**/api/me',r=>r.fulfill({json:{user}}));
 await page.route('**/api/save',r=>r.fulfill({json:{save:packSave(newSave()),version:0}}));
 for(const [width,height] of [[320,568],[568,320],[844,390],[1024,768]]){
  await page.setViewportSize({width,height});await page.goto('/');await expect(page.locator('#account-label')).toHaveText(user.name);
  const fitting=await page.evaluate(()=>{const p=document.querySelector('.player-bar')!.getBoundingClientRect(),a=document.querySelector('#account')!.getBoundingClientRect(),c=document.querySelector('.game-clock')!.getBoundingClientRect();return a.right<=c.left&&a.left>=p.left&&c.right<=p.right+.5});
  expect(fitting,`${width}x${height}`).toBe(true);
  await page.locator('#account').click();await expect(page.locator('#do-signout')).toBeVisible();await page.locator('#modal-close').click();
 }
});
