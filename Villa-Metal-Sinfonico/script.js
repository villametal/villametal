/* Villa-Metal Sinfônico — JavaScript standalone, sem framework. */
(function(){
  const items=[...document.querySelectorAll('.accordion-item')];
  const menu=document.querySelector('.mobile-menu');
  const nav=document.querySelector('#main-nav');
  function setItem(item,open){
    const trigger=item.querySelector('.accordion-trigger');
    const content=item.querySelector('.accordion-content');
    const label=item.querySelector('label');
    item.classList.toggle('open',open);
    trigger.setAttribute('aria-expanded',String(open));
    content.hidden=!open;
    label.innerHTML=open?'recolher <b>−</b>':'abrir conteúdo <b>＋</b>';
  }
  items.forEach(item=>item.querySelector('.accordion-trigger').addEventListener('click',()=>setItem(item,!item.classList.contains('open'))));
  document.querySelector('[data-action="open"]').addEventListener('click',()=>items.forEach(item=>setItem(item,true)));
  document.querySelector('[data-action="close"]').addEventListener('click',()=>items.forEach(item=>setItem(item,false)));
  if(menu){menu.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));menu.querySelector('span').textContent=open?'−':'+';});nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.querySelector('span').textContent='+';}));}
  const modal=document.querySelector('#stage-modal');
  const bioModal=document.querySelector('#bio-modal');
  const openBio=document.querySelector('[data-open-bio]');
  const closeBio=document.querySelector('[data-close-bio]');
  function toggleBio(open){bioModal.hidden=!open;document.body.classList.toggle('modal-open',open);if(open) closeBio.focus();}
  openBio.addEventListener('click',()=>toggleBio(true));
  closeBio.addEventListener('click',()=>toggleBio(false));
  bioModal.addEventListener('mousedown',event=>{if(event.target===bioModal) toggleBio(false);});
  const openMap=document.querySelector('[data-open-map]');
  const closeMap=document.querySelector('[data-close-map]');
  function toggleMap(open){modal.hidden=!open;document.body.classList.toggle('modal-open',open);if(open) closeMap.focus();}
  openMap.addEventListener('click',()=>toggleMap(true));
  closeMap.addEventListener('click',()=>toggleMap(false));
  modal.addEventListener('mousedown',event=>{if(event.target===modal) toggleMap(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden) toggleMap(false);if(event.key==='Escape'&&!bioModal.hidden) toggleBio(false);});
})();
