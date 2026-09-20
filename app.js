(() => {
  const CULTURES = [
    ["Japanese","일본"],["Korean","한국"],["Chinese","중국"],["Anglophone","영미"],
    ["French","프랑스"],["Germanic","독일권"],["Italian","이탈리아"],["Slavic-Russian","슬라브·러시아"],["Fantasy","판타지"]
  ];
  const VIBES = ["청량한","부드러운","귀여운","담백한","따뜻한","차가운","날카로운","우아한","고전적인","세련된","중성적인","신비로운","음침한","퇴폐적인","화려한","강렬한"];
  const GENDERS = [["all","전체"],["m","남성"],["f","여성"],["u","공용"]];
  const EAST_ASIAN = new Set(["Japanese","Korean","Chinese"]);
  const FANTASY_SURNAME_GROUPS = ["Germanic","French","Italian","Anglophone","Slavic-Russian"];

  const state = { culture:"Japanese", gender:"all", vibes:[], includeSurname:true, count:1, names:[], surnames:[], current:[], favorites:[] };
  const $ = s => document.querySelector(s);
  const cultureOptions = $("#cultureOptions"), genderOptions=$("#genderOptions"), vibeOptions=$("#vibeOptions");
  const resultsSection=$("#resultsSection"), resultsGrid=$("#resultsGrid"), fallbackNotice=$("#fallbackNotice");
  const favoritesSection=$("#favoritesSection"), favoritesGrid=$("#favoritesGrid"), favoritesEmpty=$("#favoritesEmpty");
  let toastTimer;

  function toast(message){ const el=$("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),1600); }
  function escapeHTML(v=""){ return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  async function loadGzipJSON(url){
    if (!("DecompressionStream" in window)) throw new Error("이 브라우저는 데이터 압축 해제를 지원하지 않습니다.");
    const response=await fetch(url);
    if(!response.ok) throw new Error(`데이터 요청 실패: ${response.status}`);
    const stream=response.body.pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
  }

  function renderControls(){
    cultureOptions.innerHTML=CULTURES.map(([k,l])=>`<button type="button" class="chip ${state.culture===k?'active':''}" data-culture="${k}">${l}</button>`).join("");
    genderOptions.innerHTML=GENDERS.map(([k,l])=>`<button type="button" class="segment ${state.gender===k?'active':''}" data-gender="${k}">${l}</button>`).join("");
    vibeOptions.innerHTML=VIBES.map(v=>`<button type="button" class="chip ${state.vibes.includes(v)?'active':''}" data-vibe="${v}">${v}</button>`).join("");
    $("#vibeCounter").textContent=state.vibes.length;
    $("#surnameToggle").checked=state.includeSurname;
  }

  function genderMatches(g){
    if(state.gender==="all") return true;
    const val=(g||"").toLowerCase();
    if(state.gender==="u") return val.includes("m") && val.includes("f");
    if(state.gender==="m") return val.includes("m");
    if(state.gender==="f") return val.includes("f");
    return true;
  }
  function hasDisplayableNative(n){
    if(state.culture!=="Japanese") return true;
    return Array.isArray(n.native?.forms) && n.native.forms.length>0;
  }
  function exactPool(){
    return state.names.filter(n => n.groups?.includes(state.culture) && hasDisplayableNative(n) && genderMatches(n.gender) && state.vibes.every(v=>n.vibes?.includes(v)));
  }
  function relaxedPool(){
    return state.names.filter(n => n.groups?.includes(state.culture) && hasDisplayableNative(n) && genderMatches(n.gender) && (!state.vibes.length || state.vibes.some(v=>n.vibes?.includes(v))));
  }
  function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function surnamePool(){
    let pool=state.surnames.filter(s=>s.groups?.includes(state.culture));
    if(state.culture==="Fantasy" && pool.length<20) pool=state.surnames.filter(s=>s.groups?.some(g=>FANTASY_SURNAME_GROUPS.includes(g)));
    return pool;
  }
  function pickSurname(pool){ return pool.length ? pool[Math.floor(Math.random()*pool.length)] : null; }
  function makeKey(item){ return [item.given?.name,item.surname?.surname,item.culture].filter(Boolean).join("|"); }
  function nativeInfo(native,culture){
    if(!native) return {reading:"",forms:[]};
    if(typeof native==="string") return {reading:"",forms:[native]};
    if(culture==="Japanese") return {reading:native.kana || "",forms:Array.isArray(native.forms)?native.forms.filter(Boolean):[]};
    if(culture==="Chinese") return {reading:native.pinyin || "",forms:Array.isArray(native.hanzi)?native.hanzi.filter(Boolean):[]};
    if(culture==="Korean") return {reading:"",forms:[native.korean || native.hangul || ""].filter(Boolean)};
    return {
      reading:native.kana || native.pinyin || "",
      forms:[
        ...(Array.isArray(native.forms)?native.forms:[]),
        ...(Array.isArray(native.hanzi)?native.hanzi:[]),
        native.korean || ""
      ].filter(Boolean)
    };
  }
  function compose(given,surname,culture){
    const east=EAST_ASIAN.has(culture);
    const roman=surname ? (east ? `${surname.surname} ${given.name}` : `${given.name} ${surname.surname}`) : given.name;
    const hangul=surname ? (east ? `${surname.hangul || surname.surname} ${given.hangul || given.name}` : `${given.hangul || given.name} ${surname.hangul || surname.surname}`) : (given.hangul || given.name);
    const gn=nativeInfo(given.native,culture), sn=nativeInfo(surname?.native,culture);
    let nativeForms=gn.forms;
    if(surname && east && sn.forms.length && gn.forms.length){
      const surnameForm=sn.forms[0];
      nativeForms=gn.forms.map(form=>`${surnameForm}${form}`);
    }else if(surname && !east && sn.forms.length && gn.forms.length){
      nativeForms=gn.forms.map(form=>`${form} ${sn.forms[0]}`);
    }
    const nativeReading=gn.reading;
    const native=nativeForms[0] || nativeReading || "";
    return {given,surname,culture,roman,hangul,native,nativeReading,nativeForms};
  }

  function generate(){
    const exact=exactPool(); let pool=exact, relaxed=false;
    if(!pool.length && state.vibes.length>1){ pool=relaxedPool(); relaxed=true; }
    const surnames=surnamePool();
    state.current=shuffle(pool).slice(0,state.count).map(n=>compose(n,state.includeSurname?pickSurname(surnames):null,state.culture));
    $("#poolCount").textContent=`후보 ${pool.length.toLocaleString()}개 중 랜덤 추천`;
    fallbackNotice.hidden=!relaxed;
    if(relaxed) fallbackNotice.textContent="두 바이브를 모두 만족하는 이름이 없어, 선택한 바이브 중 하나 이상과 어울리는 이름으로 범위를 넓혔어요.";
    renderResults();
    resultsSection.hidden=false; favoritesSection.hidden=true;
    resultsSection.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function genderLabel(g){ const v=(g||"").toLowerCase(); if(v.includes("m")&&v.includes("f")) return "공용"; if(v.includes("m")) return "남성"; if(v.includes("f")) return "여성"; return ""; }
  function cultureLabel(k){ return CULTURES.find(x=>x[0]===k)?.[1] || k; }
  function cardHTML(item, favoriteView=false){
    const key=makeKey(item), saved=state.favorites.some(f=>makeKey(f)===key);
    return `<article class="name-card" data-key="${escapeHTML(key)}">
      <div class="card-top"><div class="badge-row"><span class="mini-badge">${escapeHTML(cultureLabel(item.culture))}</span><span class="mini-badge">${escapeHTML(genderLabel(item.given.gender))}</span></div><button class="favorite-icon ${saved?'active':''}" data-action="favorite" type="button" aria-label="저장">${saved?'♥':'♡'}</button></div>
      <div class="name-main"><h3 class="roman-name">${escapeHTML(item.roman)}</h3><p class="hangul-name">${escapeHTML(item.hangul)}</p>${item.nativeReading?`<p class="native-reading">${escapeHTML(item.nativeReading)}</p>`:""}${(item.nativeForms?.length || item.native)?`<div class="native-forms">${(item.nativeForms?.length?item.nativeForms:[item.native]).map(form=>`<span>${escapeHTML(form)}</span>`).join("")}</div>`:""}</div>
      <div class="card-actions"><button class="icon-button" data-action="copy" type="button">복사</button>${favoriteView?'':`<button class="icon-button" data-action="reroll-one" type="button">다시 뽑기</button>`}</div>
    </article>`;
  }
  function renderResults(){ resultsGrid.innerHTML=state.current.length?state.current.map(i=>cardHTML(i)).join(""):`<p class="empty-state">조건에 맞는 이름이 없어요. 바이브나 성별 조건을 조금 바꿔보세요.</p>`; }
  function loadFavorites(){ try{ state.favorites=JSON.parse(localStorage.getItem("name-maker-favorites")||"[]"); }catch{state.favorites=[];} updateFavoriteCount(); }
  function saveFavorites(){ localStorage.setItem("name-maker-favorites",JSON.stringify(state.favorites)); updateFavoriteCount(); }
  function updateFavoriteCount(){ $("#favoriteCount").textContent=state.favorites.length; }
  function toggleFavorite(item){ const key=makeKey(item),idx=state.favorites.findIndex(f=>makeKey(f)===key); if(idx>=0){state.favorites.splice(idx,1);toast("저장에서 뺐어요.");}else{state.favorites.unshift(item);toast("이름을 저장했어요.");} saveFavorites(); renderResults(); if(!favoritesSection.hidden) renderFavorites(); }
  function renderFavorites(){ favoritesGrid.innerHTML=state.favorites.map(i=>cardHTML(i,true)).join(""); favoritesEmpty.hidden=!!state.favorites.length; }
  function findItemByCard(card, list){ const key=card?.dataset.key; return list.find(i=>makeKey(i)===key); }
  async function copyItem(item){ const text=[item.roman,item.hangul,item.nativeReading,...(item.nativeForms?.length?item.nativeForms:(item.native?[item.native]:[]))].filter(Boolean).join("\n"); try{await navigator.clipboard.writeText(text);toast("이름을 복사했어요.");}catch{toast("복사하지 못했어요.");} }
  function rerollOne(card){
    const old=findItemByCard(card,state.current); if(!old) return;
    let pool=exactPool(); if(!pool.length&&state.vibes.length>1) pool=relaxedPool();
    const used=new Set(state.current.map(x=>x.given.name)); const candidates=pool.filter(n=>!used.has(n.name)); if(!candidates.length) return toast("다른 후보가 없어요.");
    const n=candidates[Math.floor(Math.random()*candidates.length)], s=state.includeSurname?pickSurname(surnamePool()):null;
    state.current[state.current.indexOf(old)]=compose(n,s,state.culture); renderResults();
  }

  cultureOptions.addEventListener("click",e=>{const b=e.target.closest("[data-culture]");if(!b)return;state.culture=b.dataset.culture;renderControls();});
  genderOptions.addEventListener("click",e=>{const b=e.target.closest("[data-gender]");if(!b)return;state.gender=b.dataset.gender;renderControls();});
  vibeOptions.addEventListener("click",e=>{const b=e.target.closest("[data-vibe]");if(!b)return;const v=b.dataset.vibe,idx=state.vibes.indexOf(v);if(idx>=0)state.vibes.splice(idx,1);else if(state.vibes.length<2)state.vibes.push(v);else return toast("바이브는 최대 2개까지 고를 수 있어요.");renderControls();});
  $("#surnameToggle").addEventListener("change",e=>state.includeSurname=e.target.checked);
  $("#generateButton").addEventListener("click",generate); $("#rerollButton").addEventListener("click",generate);
  $("#resetButton").addEventListener("click",()=>{state.culture="Japanese";state.gender="all";state.vibes=[];state.includeSurname=true;state.count=1;renderControls();toast("선택을 초기화했어요.");});
  resultsGrid.addEventListener("click",e=>{const btn=e.target.closest("[data-action]");if(!btn)return;const card=btn.closest(".name-card"),item=findItemByCard(card,state.current);if(!item)return;if(btn.dataset.action==="favorite")toggleFavorite(item);if(btn.dataset.action==="copy")copyItem(item);if(btn.dataset.action==="reroll-one")rerollOne(card);});
  favoritesGrid.addEventListener("click",e=>{const btn=e.target.closest("[data-action]");if(!btn)return;const card=btn.closest(".name-card"),item=findItemByCard(card,state.favorites);if(!item)return;if(btn.dataset.action==="favorite")toggleFavorite(item);if(btn.dataset.action==="copy")copyItem(item);});
  $("#favoritesButton").addEventListener("click",()=>{renderFavorites();favoritesSection.hidden=false;resultsSection.hidden=true;favoritesSection.scrollIntoView({behavior:"smooth"});});
  $("#closeFavoritesButton").addEventListener("click",()=>{favoritesSection.hidden=true;if(state.current.length)resultsSection.hidden=false;});

  async function init(){
    renderControls(); loadFavorites();
    try{
      [state.names,state.surnames]=await Promise.all([loadGzipJSON("data/names.json.gz"),loadGzipJSON("data/surnames.json.gz")]);
      $("#generateButton").disabled=false;
    }catch(err){ console.error(err); toast("이름 데이터를 불러오지 못했어요."); }
  }
  init();
})();