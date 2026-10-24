import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('**/api/me',route=>route.fulfill({json:{user:null}}));
 await page.route('**/api/config',route=>route.fulfill({json:{googleClientId:null}}));
});

test('keeps the board and controls visible across desktop and mobile sizes',async({page})=>{
 for(const [width,height] of [[320,568],[360,640],[390,844],[768,1024],[820,1180],[960,720],[1024,768],[1280,560],[1440,900],[844,390]]){
  await page.setViewportSize({width,height});await page.goto('/');await expect(page.locator('#pause')).toBeVisible();
  const layout=await page.evaluate(()=>{
   const board=document.querySelector('#playfield')!.getBoundingClientRect(),controls=document.querySelector('.controls')!;
   const bounds=(id:string)=>{const b=document.querySelector(id)!.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom]};
   return {documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,board:[board.width,board.height],controlsClipped:controls.scrollHeight>controls.clientHeight+1,buttons:['#left','#pause','#right','#save-status'].map(bounds)};
  });
  expect(layout.documentWidth,`${width} × ${height}: horizontal overflow`).toBeLessThanOrEqual(width);
  expect(layout.documentHeight,`${width} × ${height}: vertical overflow`).toBeLessThanOrEqual(height+1);
  expect(layout.controlsClipped,`${width} × ${height}: controls clipped`).toBe(false);
  expect(layout.board[0]/layout.board[1]).toBeCloseTo(720/1100,2);
  for(const [left,top,right,bottom] of layout.buttons){expect(left).toBeGreaterThanOrEqual(0);expect(top).toBeGreaterThanOrEqual(0);expect(right).toBeLessThanOrEqual(width+1);expect(bottom).toBeLessThanOrEqual(height+1);}
 }
});

test('navigation, help and sound settings work in both layouts',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'How to play',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('heading',{name:'A little focus. A lot of bricks.'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:'Browse levels',exact:true}).click();await expect(page.getByRole('button',{name:'Level 2, locked',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:'Mute sound',exact:true}).click();await expect(page.getByRole('button',{name:'Enable sound',exact:true})).toHaveAttribute('aria-pressed','false');
 await page.reload();await expect(page.getByRole('button',{name:'Enable sound',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Game settings',exact:true}).click();await expect(page.locator('#setting-sound')).toHaveText('Off');
 await page.locator('#setting-sound').click();await expect(page.locator('#setting-sound')).toHaveText('On');
});

test('fullscreen keeps controls accessible and exits cleanly',async({page},info)=>{
 test.skip(info.project.name!=='desktop','Fullscreen API is verified in the desktop browser');
 for(const [width,height] of [[1280,900],[1280,560],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.locator('#desktop-fullscreen').click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.id)).toBe('cabinet');
  const fits=await page.evaluate(()=>{
   const cabinet=document.querySelector('#cabinet')!,controls=document.querySelector('.controls')!;
   return {cabinet:cabinet.scrollHeight<=cabinet.clientHeight+1,controls:controls.scrollHeight<=controls.clientHeight+1,buttons:['#left','#pause','#right','#desktop-fullscreen'].every(id=>{const r=document.querySelector(id)!.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})};
  });
  expect(fits,`Fullscreen ${width} × ${height}`).toEqual({cabinet:true,controls:true,buttons:true});
  await page.locator('#desktop-fullscreen').click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBeNull();
 }
});
