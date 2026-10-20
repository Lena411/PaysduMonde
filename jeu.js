/* V3 / Jeu : état, réponses, dialogues, compte à rebours et page de résultats.
   Les anciennes versions restent indépendantes de ce fichier. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const MODES = {
    monde:{label:'Monde',title:'Pays du monde',seconds:15*60},
    europe:{label:'Europe',title:'Pays d’Europe',seconds:10*60},
    asie:{label:'Asie',title:'Pays d’Asie',seconds:10*60},
    afrique:{label:'Afrique',title:'Pays d’Afrique',seconds:10*60},
    amerique:{label:'Amériques',title:'Pays des Amériques',seconds:10*60},
    oceanie:{label:'Océanie',title:'Pays d’Océanie',seconds:10*60}
  };
  const LEVELS = [[100,'Maître'],[85,'Expert'],[60,'Géographe'],[35,'Voyageur'],[15,'Explorateur'],[0,'Débutant']];
  let state = {mode:'monde',phase:'ready',found:new Set(),hints:0,hint:null,deadline:0,remaining:900,elapsed:0,reason:null};
  let timerId = null, pendingAction = null, rulesAreHelp = false;
  const countries = () => COUNTRIES_V3.filter(c=>state.mode==='monde'||c.continent===state.mode);
  const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[’'‘\-_–—]/g,' ').replace(/\s+/g,' ').trim();
  const time = seconds => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  const ratio = () => state.found.size/countries().length*100;
  const percentage = () => Math.round(ratio()*10)/10;
  const percentText = () => percentage().toLocaleString('fr-FR',{maximumFractionDigits:1})+' %';
  const level = () => LEVELS.find(([threshold])=>ratio()>=threshold)[1];

  function announce(text,kind='') {
    $('feedback').textContent=text;
    $('feedback').className='feedback '+kind;
  }

  function clearHint() {
    state.hint=null;
    $('hintBox').hidden=true;
    $('hintBox').textContent='';
  }

  function update() {
    const count=countries().length;
    $('foundCount').textContent=state.found.size;
    $('totalCount').textContent=count;
    $('remainingCount').textContent=count-state.found.size;
    $('percentage').textContent=percentText();
    $('progressFill').style.width=ratio()+'%';
    $('progress').setAttribute('aria-valuenow',percentage());
    $('levelName').textContent=level();
    $('collectionCount').textContent=state.found.size;
    $('emptyCollection').hidden=state.found.size>0;
    $('hintCount').textContent=state.hints;
    $('timer').textContent=time(state.remaining);
    $('timerWrap').classList.toggle('urgent',state.phase==='playing'&&state.remaining<=60);
    $('countryInput').disabled=state.phase!=='playing';
    $('validateBtn').disabled=state.phase!=='playing';
    $('hintBtn').disabled=state.phase!=='playing';
    $('giveUpBtn').disabled=state.phase!=='playing';
    $('startRoundBtn').hidden=state.phase!=='ready';
    $('restartBtn').hidden=state.phase!=='playing';
    $('backToResults').hidden=state.phase!=='finished';
    $('phaseBadge').textContent=state.phase==='playing'?'En cours':state.phase==='finished'?'Terminée':'Prêt ?';
    $('phaseBadge').classList.toggle('active',state.phase==='playing');
    $('roundStatus').textContent=state.phase==='playing'?'Écrivez les pays pour les révéler.':state.phase==='finished'?'Votre carte, vos réponses, vos progrès.':'À vous de lancer l’exploration';
  }

  function selectMode(mode) {
    if (!MODES[mode]) return;
    stopClock();
    state={mode,phase:'ready',found:new Set(),hints:0,hint:null,deadline:0,remaining:MODES[mode].seconds,elapsed:0,reason:null};
    document.querySelectorAll('[data-mode]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.mode===mode)));
    $('modeSelect').value=mode;
    $('regionTitle').textContent=MODES[mode].title;
    $('rulesCount').textContent=countries().length+' pays';
    $('rulesTime').textContent=(MODES[mode].seconds/60)+' minutes';
    $('foundList').replaceChildren();
    $('missingList').replaceChildren();
    $('missingDetails').hidden=true;
    $('missingDetails').open=false;
    $('missingLegend').hidden=true;
    $('countryInput').value='';
    clearHint();
    announce('');
    showGame();
    QuizMap.setMode(mode);
    update();
  }

  function showGame() {
    $('gameScreen').hidden=false;
    $('resultsScreen').hidden=true;
    requestAnimationFrame(()=>QuizMap.refresh());
  }

  function openRules(help=false) {
    rulesAreHelp=help;
    $('rulesModePicker').hidden=help;
    $('closeRules').hidden=!help;
    $('goBtn').innerHTML=help?'Reprendre':'Prêt ? GO ! <span aria-hidden="true">→</span>';
    $('rulesNote').textContent=help&&state.phase==='playing'?'Le chrono continue pendant la lecture des règles.':'Le chrono commence uniquement au clic sur GO !';
    if (!$('rulesDialog').open) $('rulesDialog').showModal();
  }

  function stopClock() {
    clearInterval(timerId);
    timerId=null;
  }

  // Une échéance absolue évite de gagner du temps en laissant l'onglet en arrière-plan.
  function tick() {
    if (state.phase!=='playing') return;
    const milliseconds=Math.max(0,state.deadline-Date.now());
    state.remaining=Math.ceil(milliseconds/1000);
    state.elapsed=Math.min(MODES[state.mode].seconds,MODES[state.mode].seconds-state.remaining);
    $('timer').textContent=time(state.remaining);
    $('timerWrap').classList.toggle('urgent',state.remaining<=60);
    if (milliseconds<=0) finish('timeout');
  }

  function start() {
    if (state.phase!=='ready') return;
    state.phase='playing';
    state.deadline=Date.now()+MODES[state.mode].seconds*1000;
    $('rulesDialog').close();
    update();
    tick();
    timerId=setInterval(tick,200);
    $('countryInput').focus({preventScroll:true});
    announce('C’est parti ! Trouvez votre premier pays.');
  }

  function submit(event) {
    event.preventDefault();
    tick();
    if (state.phase!=='playing') return;
    const value=normalize($('countryInput').value);
    if (!value) {announce('Écrivez un pays avant de valider.');return;}
    const country=countries().find(c=>[c.name,...c.aliases].some(n=>normalize(n)===value));
    if (!country) {
      const elsewhere=COUNTRIES_V3.find(c=>[c.name,...c.aliases].some(n=>normalize(n)===value));
      announce(elsewhere?`${elsewhere.name} n’est pas dans le quiz de cette région.`:'Ce nom n’est pas reconnu. Essayez encore.','error');
      $('countryInput').select();
      return;
    }
    if (state.found.has(country.code)) {
      announce(`${country.name} est déjà dans votre collection.`);
      $('countryInput').select();
      return;
    }
    state.found.add(country.code);
    const item=document.createElement('li');
    item.textContent=country.name;
    $('foundList').prepend(item);
    $('countryInput').value='';
    if (state.hint?.code===country.code) clearHint();
    QuizMap.setProgress(state.found);
    update();
    announce(`Bien trouvé : ${country.name} !`,'success');
    if (state.found.size===countries().length) finish('complete');
    else $('countryInput').focus({preventScroll:true});
  }

  function hint() {
    tick();
    if (state.phase!=='playing') return;
    if (!state.hint) {
      const remaining=countries().filter(c=>!state.found.has(c.code));
      state.hint=remaining[Math.floor(Math.random()*remaining.length)];
    }
    state.hints++;
    const name=state.hint.name;
    const length=(name.match(/\p{L}/gu)||[]).length;
    $('hintBox').textContent=`Un pays commence par « ${name[0]} » et compte ${length} lettres.`;
    $('hintBox').hidden=false;
    $('hintCount').textContent=state.hints;
    $('countryInput').focus({preventScroll:true});
  }

  function askConfirmation(action,title,text) {
    pendingAction=action;
    $('confirmTitle').textContent=title;
    $('confirmText').textContent=text;
    $('confirmDialog').showModal();
    $('cancelConfirm').focus();
  }

  function choose(mode) {
    if (state.phase==='playing') {
      if (state.mode===mode) return;
      askConfirmation(()=>{selectMode(mode);openRules();},'Changer de continent ?','La partie actuelle sera effacée. Le chrono continue pendant votre choix.');
    } else {
      selectMode(mode);
      openRules();
    }
  }

  function prepareReplay() {
    selectMode(state.mode);
    openRules();
  }

  function finish(reason) {
    if (state.phase!=='playing') return;
    const remainingMs=Math.max(0,state.deadline-Date.now());
    state.remaining=reason==='timeout'?0:Math.ceil(remainingMs/1000);
    state.elapsed=MODES[state.mode].seconds-state.remaining;
    state.phase='finished';
    state.reason=reason;
    stopClock();
    ['confirmDialog','rulesDialog','aboutDialog'].forEach(id=>{if ($(id).open) $(id).close();});
    pendingAction=null;
    clearHint();
    update();
    QuizMap.setProgress(state.found,true);
    const missing=countries().filter(c=>!state.found.has(c.code)).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    $('missingList').replaceChildren(...missing.map(c=>{const li=document.createElement('li');li.textContent=c.name;return li;}));
    $('missingCount').textContent=missing.length;
    $('missingDetails').hidden=missing.length===0;
    $('missingLegend').hidden=missing.length===0;
    showResults();
  }

  function showResults() {
    const reason=state.reason;
    $('gameScreen').hidden=true;
    $('resultsScreen').hidden=false;
    $('resultsReason').textContent=reason==='timeout'?'Temps écoulé':reason==='complete'?'Tous les pays trouvés':'Partie terminée';
    $('resultsTitle').textContent=reason==='complete'?'Un sans-faute. Bravo !':'L’exploration est terminée.';
    $('resultsIntro').textContent=reason==='timeout'?'Le chrono est à zéro. Voici le bilan de votre voyage.':reason==='complete'?'Vous avez retrouvé tous les pays avant la fin du chrono.':'Vous avez choisi de terminer cette partie. Voici votre bilan.';
    $('resultFound').textContent=state.found.size;
    $('resultTotal').textContent=countries().length;
    $('resultPercent').textContent=percentText();
    $('resultTime').textContent=time(state.elapsed);
    $('resultMode').textContent=MODES[state.mode].label+' · '+MODES[state.mode].seconds/60+' min';
    $('resultHints').textContent=state.hints+' indice'+(state.hints!==1?'s':'')+' utilisé'+(state.hints!==1?'s':'');
    $('resultLevel').textContent=level();
    window.scrollTo({top:0,behavior:'instant'});
    $('resultsTitle').focus({preventScroll:true});
  }

  $('answerForm').addEventListener('submit',submit);
  $('hintBtn').addEventListener('click',hint);
  $('startRoundBtn').addEventListener('click',()=>openRules());
  $('goBtn').addEventListener('click',()=>{
    if (rulesAreHelp) {$('rulesDialog').close();if (state.phase==='playing') $('countryInput').focus({preventScroll:true});}
    else start();
  });
  $('closeRules').addEventListener('click',()=>$('rulesDialog').close());
  $('rulesDialog').addEventListener('cancel',event=>{if (!rulesAreHelp) event.preventDefault();});
  $('rulesBtn').addEventListener('click',()=>openRules(state.phase!=='ready'));
  $('modeSelect').addEventListener('change',event=>selectMode(event.target.value));
  document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>choose(btn.dataset.mode)));
  $('restartBtn').addEventListener('click',()=>askConfirmation(prepareReplay,'Recommencer la partie ?','Votre score actuel sera effacé. Le chrono continue jusqu’à votre confirmation.'));
  $('giveUpBtn').addEventListener('click',()=>{
    tick();
    if (state.phase==='playing') askConfirmation(()=>finish('giveup'),'Terminer maintenant ?','Votre score sera conservé dans le bilan et les réponses manquantes seront révélées. Le chrono continue pendant votre choix.');
  });
  $('cancelConfirm').addEventListener('click',()=>{pendingAction=null;$('confirmDialog').close();});
  $('confirmDialog').addEventListener('cancel',()=>{pendingAction=null;});
  $('acceptConfirm').addEventListener('click',()=>{
    tick();
    const action=pendingAction;
    pendingAction=null;
    $('confirmDialog').close();
    if (action) action();
  });
  $('reviewBtn').addEventListener('click',()=>{showGame();$('gameTitle').focus({preventScroll:true});});
  $('backToResults').addEventListener('click',showResults);
  $('replayBtn').addEventListener('click',prepareReplay);
  $('chooseModeBtn').addEventListener('click',()=>{selectMode('monde');openRules();$('modeSelect').focus();});
  $('aboutMapBtn').addEventListener('click',()=>$('aboutDialog').showModal());
  $('closeAbout').addEventListener('click',()=>$('aboutDialog').close());
  document.addEventListener('visibilitychange',()=>{if (!document.hidden) tick();});
  window.addEventListener('focus',tick);

  // Points d'observation pour les tests, sans modifier les durées du jeu livré.
  window.render_game_to_text=()=>JSON.stringify({mode:state.mode,phase:state.phase,remaining:state.remaining,
    found:[...state.found],total:countries().length,percentage:percentage(),hints:state.hints,reason:state.reason});

  try {
    if (!window.QuizMap || !window.WORLD_GEOJSON || !window.COUNTRIES_V3) throw new Error('Données manquantes');
    selectMode('monde');
    openRules();
  } catch (error) {
    console.error(error);
    $('fatalError').hidden=false;
    $('goBtn').disabled=true;
    $('startRoundBtn').disabled=true;
  }
})();
