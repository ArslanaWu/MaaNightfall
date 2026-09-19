export const joined = items => items.map(x=>x.text??'').join('').replace(/\s/g,'')
export const find = (items,pattern,roi=[0,0,1280,720]) => items.find(x=>{
 const [a,b,w,h]=x.box
 return a+w/2>=roi[0]&&a+w/2<=roi[0]+roi[2]&&b+h/2>=roi[1]&&b+h/2<=roi[1]+roi[3]&&pattern.test((x.text??'').replace(/\s/g,''))
})
export const screen = async io => io.ocr(await io.shot(),[0,0,1280,720])
export const tap = async (io,hit,delay=900) => {if(!hit)throw Error('找不到目标按钮');const [x,y,w,h]=hit.box;await io.click(x+w/2,y+h/2,delay)}
export async function waitFor(io,predicate,label,attempts=25) {
 for(let n=0;n<attempts;n++){const items=await screen(io);const hit=predicate(items);if(hit)return hit;await io.wait(500)}
 throw Error('等待界面超时：'+label)
}
export async function home(io) {
 for(let n=0;n<8;n++){
  const items=await screen(io)
  if(find(items,/家族事务/))return
  if(find(items,/等级提升|获得物品|扫荡完成|点击空白/)){await io.click(640,680);continue}
  await io.click(156,40,1000)
 }
 throw Error('未返回主界面')
}
export async function openAffairs(io,tab) {
 await home(io)
 await tap(io,await waitFor(io,s=>find(s,/家族事务/),'家族事务'))
 await tap(io,await waitFor(io,s=>find(s,new RegExp('^'+tab+'$'),[0,620,1280,100]),tab))
}

