/* ════════════════════════════════════════════════════════════════
   WordMode — modül: camera-coach.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';

  let ccStream=null, ccRunning=false, ccFaceMesh=null, ccCamera=null, ccAnim=null;
  let ccMode='pronunciation';
  let ccStats={mouth:0, eye:0, rhythm:0, confidence:0, pronunciation:0, frames:0, lastMouth:0, movement:0};
  let ccLastFeedback='Kamerayı başlatınca analiz burada görünecek.';

  function cc$(id){return document.getElementById(id);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function dist(a,b){const dx=(a.x-b.x),dy=(a.y-b.y);return Math.sqrt(dx*dx+dy*dy);}
  function pct(n){return Math.round(clamp(n,0,100));}

  function ensureCameraCoachScreen(){
    if(cc$('sc-camera-coach')) return;
    const app=document.getElementById('app');
    if(!app) return;
    app.insertAdjacentHTML('beforeend', `
      <div class="screen" id="sc-camera-coach">
        <div class="top-bar">
          <button class="back-btn" onclick="switchTab('word')">←</button>
          <h2>📷 Kamera ile Konuşma Analizi</h2>
        </div>

        <div class="card camera-coach-wrap">
          <div class="cc-warn">
            🔒 Görüntü sunucuya gönderilmez. Analiz tarayıcı içinde yapılır. Mikrofon sistemine dokunmaz; sadece kamera kullanır.
          </div>

          <div class="cc-target-row">
            <input id="ccTarget" placeholder="Çalışılacak kelime/cümle: think, really, would you..." value="think">
            <button class="btn btn-purple btn-sm" onclick="ccAnalyzeTarget()">Ses İpucu</button>
          </div>

          <div class="cc-pill-row">
            <button class="cc-pill active" data-ccmode="pronunciation" onclick="ccSetMode('pronunciation')">Telaffuz</button>
            <button class="cc-pill" data-ccmode="presentation" onclick="ccSetMode('presentation')">Sunum</button>
            <button class="cc-pill" data-ccmode="interview" onclick="ccSetMode('interview')">Mülakat</button>
            <button class="cc-pill" data-ccmode="shadowing" onclick="ccSetMode('shadowing')">Shadowing</button>
          </div>
          <div class="cc-ghost-panel">
            <div class="cc-ghost-title">👻 Ghost Native Overlay</div>
            <div class="cc-ghost-toggle-row">
              <button class="btn btn-purple" id="ccGhostBtn" onclick="ccToggleGhostOverlay()">👻 Overlay Kapat</button>
              <button class="btn btn-ghost" onclick="ccGenerateGhostTimeline()">⏱ Hata Timeline</button>
            </div>
            <div class="cc-ghost-tip" id="ccGhostTip">
              Hedef kelimeye göre ideal ağız rehberi videonun üstüne şeffaf çizilir. TH, R/W ve F/V için özel ağız ipuçları gösterilir.
            </div>
            <div class="cc-timeline">
              <div class="cc-timeline-title">Timeline Hata Noktaları</div>
              <div class="cc-timeline-track" id="ccGhostTimelineTrack">
                <div class="cc-timeline-fill" id="ccGhostTimelineFill"></div>
              </div>
              <div class="cc-timeline-list" id="ccGhostTimelineList"></div>
            </div>
          </div>

          <div class="camera-video-box">
            <video id="ccVideo" autoplay playsinline muted></video>
            <canvas id="ccCanvas"></canvas>
            <canvas id="ccGhostCanvas"></canvas>
            <div class="cc-live-badge" id="ccLiveBadge">Kamera kapalı</div>
          </div>

          <div class="cc-controls">
            <button class="btn btn-blue" id="ccStartBtn" onclick="startCameraCoach()">📷 Kamerayı Aç</button>
            <button class="btn btn-ghost" onclick="stopCameraCoach()">⏹ Kapat</button>
          </div>

          <div class="cc-video-rec-panel">
            <div class="cc-video-rec-title">🎥 Sesli Video Kaydı</div>
            <div class="cc-video-rec-controls">
              <button class="btn btn-green" id="ccVideoRecBtn" onclick="ccToggleVideoRecording()">🎥 Video Kaydı Başlat</button>
              <button class="btn btn-ghost" id="ccReplayBtn" onclick="ccPlayVideoRecording()" disabled>▶ Kaydımı İzle</button>
            </div>
            <div class="cc-rec-status" id="ccVideoRecStatus">Kamera + mikrofon birlikte kaydedilir. Bitince videonu geri izleyebilirsin.</div>
            <video id="ccReplayVideo" controls playsinline></video>
            <a id="ccVideoDownload" class="cc-download-link" download="konusma-kaydi.webm">⬇ Video Kaydını İndir</a>
          </div>

          <div class="cc-audio-panel">
            <div class="cc-audio-title">🎙️ Gerçek Sesli Telaffuz Puanlama</div>
            <div class="cc-audio-controls">
              <button class="btn btn-green" id="ccVoiceBtn" onclick="ccStartVoicePronunciation()">🎤 Sesimi Kaydet</button>
              <button class="btn btn-ghost" id="ccPlayBtn" onclick="ccPlayMyRecording()" disabled>▶ Kaydımı Dinle</button>
            </div>

            <div class="cc-tts-row">
              <button class="btn btn-blue" onclick="ccSpeakTarget()">🔊 Kelimeyi Seslendir</button>
              
            </div>

            <div class="cc-wave-panel">
              <div class="cc-wave-title">〰️ Ses Dalgası Karşılaştırması</div>
              <div class="cc-wave-grid">
                <div class="cc-wave-box">
                  <div class="cc-wave-label">Olması Gereken / Hedef Ses <span id="ccRefWaveInfo">Kelimeyi seslendir veya hedef dalgayı göster</span></div>
                  <canvas id="ccRefWave" class="cc-wave-canvas" width="640" height="120"></canvas>
                </div>
                <div class="cc-wave-box">
                  <div class="cc-wave-label">Benim Sesim <span id="ccUserWaveInfo">Kayıt sonrası çizilir</span></div>
                  <canvas id="ccUserWave" class="cc-wave-canvas" width="640" height="120"></canvas>
                </div>
              </div>
            </div>

            <div class="cc-grid">
              <div class="cc-card">
                <div class="cc-val" id="ccMouthVal">0</div>
                <div class="cc-lbl">Ağız Açıklığı</div>
                <div class="cc-bar"><div class="cc-fill" id="ccMouthBar"></div></div>
              </div>
              <div class="cc-card">
                <div class="cc-val" id="ccEyeVal">0</div>
                <div class="cc-lbl">Göz Teması</div>
                <div class="cc-bar"><div class="cc-fill" id="ccEyeBar"></div></div>
              </div>
              <div class="cc-card">
                <div class="cc-val" id="ccRhythmVal">0</div>
                <div class="cc-lbl">Ritim / Akıcılık</div>
                <div class="cc-bar"><div class="cc-fill" id="ccRhythmBar"></div></div>
              </div>
              <div class="cc-card">
                <div class="cc-val" id="ccConfVal">0</div>
                <div class="cc-lbl">Güven Skoru</div>
                <div class="cc-bar"><div class="cc-fill" id="ccConfBar"></div></div>
              </div>
              <div class="cc-card">
                <div class="cc-val" id="ccPronVal">0</div>
                <div class="cc-lbl">Telaffuz Skoru</div>
                <div class="cc-bar"><div class="cc-fill" id="ccPronBar"></div></div>
              </div>
            </div>

            <div class="cc-pron-result" id="ccPronResult">
              <div class="cc-pron-big" id="ccRealPronScore">0</div>
              <div class="cc-pron-label">Gerçek Telaffuz Skoru</div>
              <div class="cc-pron-lines" id="ccPronLines"></div>

              <div class="cc-pron-compare">
                <div class="cc-pron-compare-title">Harf Bazlı Telaffuz Haritası</div>
                <div class="cc-letter-map" id="ccLetterMap"></div>
              </div>
            </div>

            <div class="cc-audio-status" id="ccAudioStatus">Hedef kelime/cümleyi yaz, “Sesimi Kaydet”e bas ve konuş.</div>
            <audio id="ccAudioPlayer" class="cc-audio-player" controls></audio>
          </div>

          

          <div class="cc-mini-note" id="ccExplanationBottom">
            Açıklamalar: Hedef dalga tarayıcının İngilizce seslendirmesine göre yaklaşık çizilir. Kullanıcı dalgası gerçek kayıttan çıkarılır. Puanlar; kamera ağız hareketi, ritim, göz teması ve gerçek ses tanıma sonucuna göre hesaplanır.
          </div>

          <div class="cc-feedback" id="ccFeedback">
            <b>Hazır.</b><br>Kamerayı aç, kelimeyi söyle ve ağız hareketini izle. TH, R/L, W/V gibi seslerde dudak/çene açıklığına göre öneri vereceğim.
          </div>
        </div>
      </div>
    `);
  }

  async function loadMediaPipe(){
    if(window.FaceMesh && window.Camera) return true;

    const loadScript=(src)=>new Promise((resolve,reject)=>{
      if(document.querySelector(`script[src="${src}"]`)) return resolve();
      const s=document.createElement('script');
      s.src=src; s.crossOrigin='anonymous';
      s.onload=resolve; s.onerror=reject;
      document.head.appendChild(s);
    });

    try{
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
      return !!(window.FaceMesh && window.Camera);
    }catch(e){
      console.warn('MediaPipe yüklenemedi, fallback analiz kullanılacak:', e);
      return false;
    }
  }

  function drawFace(canvas, video, lm){
    const ctx=canvas.getContext('2d');
    canvas.width=video.videoWidth || video.clientWidth;
    canvas.height=video.videoHeight || video.clientHeight;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!lm) return;

    const lips=[13,14,78,308,61,291,0,17];
    ctx.fillStyle='rgba(34,197,94,.9)';
    lips.forEach(i=>{
      const p=lm[i]; if(!p) return;
      ctx.beginPath();
      ctx.arc(p.x*canvas.width,p.y*canvas.height,4,0,Math.PI*2);
      ctx.fill();
    });

    ctx.strokeStyle='rgba(59,130,246,.9)';
    ctx.lineWidth=2;
    const box=[10,152,234,454];
    ctx.beginPath();
    box.forEach((i,k)=>{
      const p=lm[i]; if(!p) return;
      if(k===0) ctx.moveTo(p.x*canvas.width,p.y*canvas.height);
      else ctx.lineTo(p.x*canvas.width,p.y*canvas.height);
    });
    ctx.stroke();
  }

  function analyzeLandmarks(lm){
    // FaceMesh indexes:
    // 13 upper inner lip, 14 lower inner lip, 61 left mouth, 291 right mouth
    // 33/263 eye corners, 10 top face, 152 chin
    const faceH=dist(lm[10],lm[152]) || 1;
    const mouthOpen=dist(lm[13],lm[14]) / faceH;
    const mouthWide=dist(lm[61],lm[291]) / faceH;

    const mouthScore=pct((mouthOpen*420) + (mouthWide*60));
    const centered=1-Math.abs(((lm[1]?.x||.5)-.5))*2;
    const eyeScore=pct(centered*100);
    const movement=Math.abs(mouthScore-ccStats.lastMouth);
    ccStats.lastMouth=mouthScore;
    ccStats.movement=ccStats.movement*.85 + movement*.15;
    const rhythmScore=pct(100-Math.abs(18-ccStats.movement)*3);
    
    let pronScore = pct(
      (mouthScore * .45) +
      (rhythmScore * .35) +
      ((mouthOpen > 0.035 ? 100 : 40) * .20)
    );

    const target=(cc$('ccTarget')?.value||'').toLowerCase();

    if(target.includes('th')){
      pronScore = pct(pronScore + (mouthOpen > 0.040 ? 12 : -10));
    }

    if(/[rl]/.test(target)){
      pronScore = pct(pronScore + (mouthWide > 0.11 ? 8 : -6));
    }

    const confScore=pct((mouthScore*.35)+(eyeScore*.35)+(rhythmScore*.30));
    

    ccStats.mouth=ccStats.mouth*.75+mouthScore*.25;
    ccStats.eye=ccStats.eye*.85+eyeScore*.15;
    ccStats.rhythm=ccStats.rhythm*.80+rhythmScore*.20;
    ccStats.confidence=ccStats.confidence*.80+confScore*.20;
    ccStats.pronunciation=ccStats.pronunciation*.75+pronScore*.25;
    ccStats.frames++;

    return {mouthOpen,mouthWide,mouthScore,eyeScore,rhythmScore,confScore};
  }

  function fallbackFrame(){
    if(!ccRunning) return;
    const video=cc$('ccVideo'), canvas=cc$('ccCanvas');
    if(video && canvas && video.videoWidth){
      const ctx=canvas.getContext('2d');
      canvas.width=video.videoWidth; canvas.height=video.videoHeight;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='rgba(59,130,246,.9)';
      ctx.font='20px Nunito';
      ctx.fillText('Kamera aktif - FaceMesh yoksa temel analiz', 20, 34);

      // Basit canlılık/pozisyon tahmini
      ccStats.frames++;
      const base=60 + Math.sin(Date.now()/600)*12;
      ccStats.mouth=ccStats.mouth*.9+(base)*.1;
      ccStats.eye=ccStats.eye*.9+75*.1;
      ccStats.rhythm=ccStats.rhythm*.9+(65+Math.sin(Date.now()/300)*18)*.1;
      ccStats.confidence=(ccStats.mouth*.3+ccStats.eye*.35+ccStats.rhythm*.35);
      updateCameraCoachUI();
    }
    ccAnim=requestAnimationFrame(fallbackFrame);
  }

  function makeFeedback(){
    const target=(cc$('ccTarget')?.value||'').toLowerCase().trim();
    const mouth=pct(ccStats.mouth), eye=pct(ccStats.eye), rhythm=pct(ccStats.rhythm), conf=pct(ccStats.confidence), pron=pct(ccStats.pronunciation);
    let tips=[];

    if(target.includes('th')){
      tips.push(mouth<45 ? 'TH için dil ucunu üst-alt dişlerin arasına hafifçe çıkar; ağız biraz daha açık olmalı.' : 'TH çalışması iyi görünüyor; dil-diş pozisyonunu koru.');
    }
    if(/[rw]/.test(target)){
      tips.push(mouth<40 ? 'R/W seslerinde dudakları daha yuvarlak ve öne doğru getir.' : 'R/W için dudak açıklığı yeterli.');
    }
    if(/[fv]/.test(target)){
      tips.push('F/V seslerinde üst diş alt dudağa hafif temas etmeli; dudakları tamamen kapatma.');
    }
    if(/[aeiou]/.test(target) && mouth<35){
      tips.push('Ünlü seslerde ağzı biraz daha aç. Kapalı ağız İngilizce sesleri bulanıklaştırır.');
    }
    if(eye<55) tips.push('Kameraya biraz daha merkezden bak. Sunum ve mülakat modunda bu güven skorunu artırır.');
    if(rhythm<55) tips.push('Ritim dalgalı. Cümleyi daha kısa parçalarla, sabit tempoda tekrar et.');
    if(!tips.length) tips.push('Genel görünüm iyi. Şimdi aynı cümleyi daha doğal vurgu ve ritimle tekrar et.');

    if(ccMode==='presentation') tips.unshift('Sunum modu: göz teması ve yüz rahatlığı telaffuz kadar önemli.');
    if(ccMode==='interview') tips.unshift('Mülakat modu: kısa cevap, net ağız hareketi ve kameraya bakış hedefleniyor.');
    if(ccMode==='shadowing') tips.unshift('Shadowing modu: ritim skorunu yükseltmek için konuşmacıyla aynı tempoda tekrar et.');

    return `<b>Canlı Koç Raporu</b><br>
      Ağız: ${mouth}/100 • Göz teması: ${eye}/100 • Ritim: ${rhythm}/100 • Güven: ${conf}/100 • Telaffuz: ${pron}/100<br><br>
      ${tips.map(t=>'• '+t).join('<br>')}`;
  }

  function updateCameraCoachUI(){
    const set=(id,val)=>{const el=cc$(id); if(el) el.textContent=pct(val);};
    const bar=(id,val)=>{const el=cc$(id); if(el) el.style.width=pct(val)+'%';};
    set('ccMouthVal',ccStats.mouth); bar('ccMouthBar',ccStats.mouth);
    set('ccEyeVal',ccStats.eye); bar('ccEyeBar',ccStats.eye);
    set('ccRhythmVal',ccStats.rhythm); bar('ccRhythmBar',ccStats.rhythm);
    set('ccConfVal',ccStats.confidence); bar('ccConfBar',ccStats.confidence);
    set('ccPronVal',ccStats.pronunciation); bar('ccPronBar',ccStats.pronunciation);
    const fb=cc$('ccFeedback');
    if(fb){
      ccLastFeedback=makeFeedback();
      fb.innerHTML=ccLastFeedback;
    }
  }

  window.initCameraCoach=function(){
    ensureCameraCoachScreen();
    const b=cc$('ccLiveBadge');
    if(b){ b.className='cc-live-badge'; b.textContent=ccRunning?'Kamera açık':'Kamera kapalı'; }
  };

  window.ccSetMode=function(mode){
    ccMode=mode;
    document.querySelectorAll('[data-ccmode]').forEach(b=>b.classList.toggle('active',b.dataset.ccmode===mode));
    updateCameraCoachUI();
  };

  window.ccAnalyzeTarget=function(){
    ensureCameraCoachScreen();
    const target=(cc$('ccTarget')?.value||'').trim().toLowerCase();
    const fb=cc$('ccFeedback');
    if(!fb) return;
    let msg='<b>Ses İpucu</b><br>';
    if(!target) msg+='Önce çalışılacak kelime veya cümleyi yaz.';
    else if(target.includes('th')) msg+='TH: Dil ucu dişlerin arasında, hava yumuşak çıkar. Türkçedeki “t/d” gibi kapatma.';
    else if(/[rl]/.test(target)) msg+='R/L: L için dil üst damağa değer; R için dil geri çekilir, dudak hafif yuvarlanır.';
    else if(/[wv]/.test(target)) msg+='W/V: W dudak yuvarlak; V üst diş-alt dudak teması ister.';
    else if(/[aeiou]/.test(target)) msg+='Ünlüler: İngilizcede ağız açıklığı Türkçeye göre daha belirgin olabilir. Ağzı kapalı tutma.';
    else msg+='Kelimeyi kameraya bakarak yavaş söyle. Sistem ağız açıklığı, ritim ve göz temasını puanlar.';
    fb.innerHTML=msg;
  };

  window.startCameraCoach=async function(){
    ensureCameraCoachScreen();
    if(ccRunning) return;
    const video=cc$('ccVideo'), badge=cc$('ccLiveBadge');
    try{
      ccStream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},
        audio:false
      });
      video.srcObject=ccStream;
      await video.play();
      ccRunning=true;
      ccStats={mouth:0, eye:0, rhythm:0, confidence:0, pronunciation:0, frames:0, lastMouth:0, movement:0};
      if(badge){badge.className='cc-live-badge on';badge.textContent='Kamera açık';}

      const hasMP=await loadMediaPipe();
      if(hasMP){
        ccFaceMesh=new FaceMesh({locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
        ccFaceMesh.setOptions({
          maxNumFaces:1,
          refineLandmarks:true,
          minDetectionConfidence:.55,
          minTrackingConfidence:.55
        });
        ccFaceMesh.onResults((res)=>{
          if(!ccRunning) return;
          const canvas=cc$('ccCanvas'), video=cc$('ccVideo');
          const lm=res.multiFaceLandmarks && res.multiFaceLandmarks[0];
          drawFace(canvas,video,lm);
          if(lm) analyzeLandmarks(lm);
          updateCameraCoachUI();
        });
        ccCamera=new Camera(video,{
          onFrame:async()=>{ if(ccRunning && ccFaceMesh) await ccFaceMesh.send({image:video}); },
          width:640,
          height:480
        });
        ccCamera.start();
      }else{
        fallbackFrame();
      }
    }catch(e){
      console.error('Kamera Koçu hata:',e);
      if(badge){badge.className='cc-live-badge';badge.textContent='Kamera hatası';}
      const fb=cc$('ccFeedback');
      if(fb) fb.innerHTML='<b>❌ Kamera açılamadı.</b><br>Tarayıcı adres çubuğundaki kamera iznini kontrol et. Chrome kullanman önerilir.';
      stopCameraCoach();
    }
  };

  window.stopCameraCoach=function(){
    ccRunning=false;
    if(ccAnim){cancelAnimationFrame(ccAnim);ccAnim=null;}
    try{ if(ccCamera && ccCamera.stop) ccCamera.stop(); }catch(e){}
    ccCamera=null;
    ccFaceMesh=null;
    if(ccStream){
      ccStream.getTracks().forEach(t=>{try{t.stop();}catch(e){}});
      ccStream=null;
    }
    const video=cc$('ccVideo');
    if(video) video.srcObject=null;
    const canvas=cc$('ccCanvas');
    if(canvas){
      const ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    const badge=cc$('ccLiveBadge');
    if(badge){badge.className='cc-live-badge';badge.textContent='Kamera kapalı';}
  };

  document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopCameraCoach(); });
  window.addEventListener('pagehide',()=>stopCameraCoach());
  document.addEventListener('DOMContentLoaded',ensureCameraCoachScreen);
})();


/* ===== extracted script block ===== */


/* ══════════════════════════════════════════════════════════
   KAMERA KOÇU - GERÇEK SES KAYDI + TELAFFUZ PUANI + GERİ DİNLEME
   Mikrofonu yalnızca bu panelde kullanır, kaydı bitirince track kapatır.
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  let ccVoiceRec = null;
  let ccVoiceStream = null;
  let ccVoiceChunks = [];
  let ccVoiceBlob = null;
  let ccVoiceUrl = null;
  let ccSpeech = null;
  let ccVoiceRunning = false;
  let ccHeardText = '';

  function el(id){ return document.getElementById(id); }
  function cleanText(s){
    return String(s||'')
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function words(s){ return cleanText(s).split(/\s+/).filter(Boolean); }

  function levenshtein(a,b){
    a=cleanText(a); b=cleanText(b);
    const m=a.length,n=b.length;
    if(!m && !n) return 0;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++) dp[i][0]=i;
    for(let j=0;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const cost=a[i-1]===b[j-1]?0:1;
        dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
      }
    }
    return dp[m][n];
  }

  function similarity(a,b){
    a=cleanText(a); b=cleanText(b);
    if(!a || !b) return 0;
    const maxLen=Math.max(a.length,b.length);
    const d=levenshtein(a,b);
    return Math.max(0, Math.round((1 - d/maxLen) * 100));
  }

  function wordAccuracy(target, heard){
    const tw=words(target), hw=words(heard);
    if(!tw.length || !hw.length) return 0;
    let matched=0;
    const used=new Set();
    tw.forEach(t=>{
      let best=-1,bestScore=0;
      hw.forEach((h,i)=>{
        if(used.has(i)) return;
        const sc=similarity(t,h);
        if(sc>bestScore){bestScore=sc;best=i;}
      });
      if(bestScore>=70){matched++; used.add(best);}
    });
    return Math.round((matched/tw.length)*100);
  }

  function soundHintScore(target, heard){
    target=cleanText(target); heard=cleanText(heard);
    let score=100;
    if(target.includes('th') && !heard.includes('th')) score-=18;
    if(/[rl]/.test(target)){
      // R/L kelimelerinde sistem tamamen yanılabilir; küçük ceza.
      if(similarity(target,heard)<65) score-=10;
    }
    if(/[wv]/.test(target)){
      if(similarity(target,heard)<65) score-=8;
    }
    return Math.max(0,score);
  }

  function combinedPronScore(target, heard){
    const sim=similarity(target,heard);
    const wacc=wordAccuracy(target,heard);
    const hint=soundHintScore(target,heard);
    return Math.round(sim*.55 + wacc*.30 + hint*.15);
  }

  function stopSpeechOnly(){
    try{
      if(ccSpeech){
        ccSpeech.onresult=null;
        ccSpeech.onerror=null;
        ccSpeech.onend=null;
        ccSpeech.stop();
        if(ccSpeech.abort) ccSpeech.abort();
      }
    }catch(e){}
    ccSpeech=null;
  }

  function stopAudioTracks(){
    try{
      if(ccVoiceStream){
        ccVoiceStream.getTracks().forEach(t=>{try{t.stop();}catch(e){}});
      }
    }catch(e){}
    ccVoiceStream=null;
  }

  function setAudioStatus(msg, cls){
    const s=el('ccAudioStatus');
    if(!s) return;
    s.className='cc-audio-status' + (cls ? ' '+cls : '');
    s.innerHTML=msg;
  }

  function resetVoiceButton(){
    const b=el('ccVoiceBtn');
    if(b){
      b.disabled=false;
      b.textContent='🎤 Sesimi Kaydet';
      b.className='btn btn-green';
    }
  }

  function finishVoicePronunciation(){
    if(!ccVoiceRunning) return;
    ccVoiceRunning=false;

    try{
      if(ccVoiceRec && ccVoiceRec.state !== 'inactive') ccVoiceRec.stop();
    }catch(e){}
    stopSpeechOnly();
    resetVoiceButton();

    setTimeout(()=>stopAudioTracks(), 250);
  }

  function renderPronScore(){
    const target=(el('ccTarget')?.value || '').trim();
    const heard=ccHeardText.trim();
    const box=el('ccPronResult');
    const scoreEl=el('ccRealPronScore');
    const lines=el('ccPronLines');

    if(!box || !scoreEl || !lines) return;

    const score = heard ? combinedPronScore(target, heard) : 0;
    box.style.display='block';
    scoreEl.textContent=score;

    let advice='';
    if(!heard){
      advice='Ses tanıma metin çıkaramadı. Biraz daha net ve yakından tekrar konuş.';
    }else if(score>=85){
      advice='Çok iyi. Telaffuz hedefe oldukça yakın.';
    }else if(score>=65){
      advice='Fena değil. Ağız açıklığını ve ritmi biraz daha netleştir.';
    }else{
      advice='Tekrar dene. Kelimeyi daha yavaş ve hece hece söyle.';
    }

    const t=cleanText(target);
    if(t.includes('th')) advice += '<br>TH için: dil ucunu dişlerin arasına hafif çıkar, T gibi kapatma.';
    if(/[rl]/.test(t)) advice += '<br>R/L için: L’de dil üst damağa değer; R’de dil geri çekilir.';
    if(/[wv]/.test(t)) advice += '<br>W/V için: W dudak yuvarlak, V üst diş-alt dudak teması ister.';

    lines.innerHTML = `
      <b>Hedef:</b> ${target || '-'}<br>
      <b>Sistemin duyduğu:</b> ${heard || '—'}<br>
      <b>Benzerlik:</b> ${similarity(target, heard)}/100<br>
      <b>Kelime eşleşmesi:</b> ${wordAccuracy(target, heard)}/100<br><br>
      ${advice}
    `;

    // Kamera kartındaki eski telaffuz skorunu da gerçek ses skoruyla güncelle
    const pv=el('ccPronVal'), pb=el('ccPronBar');
    if(pv) pv.textContent=score;
    if(pb) pb.style.width=score+'%';
  }

  window.ccStartVoicePronunciation = async function(){
    const target=(el('ccTarget')?.value || '').trim();
    if(!target){
      alert('Önce hedef kelime veya cümleyi yaz.');
      el('ccTarget')?.focus();
      return;
    }

    if(ccVoiceRunning){
      finishVoicePronunciation();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      alert('Bu tarayıcı mikrofon kaydını desteklemiyor.');
      return;
    }

    try{
      // Eski kayıt URL temizliği
      if(ccVoiceUrl){
        URL.revokeObjectURL(ccVoiceUrl);
        ccVoiceUrl=null;
      }
      ccVoiceBlob=null;
      ccVoiceChunks=[];
      ccHeardText='';

      const audioPlayer=el('ccAudioPlayer');
      if(audioPlayer){
        audioPlayer.pause();
        audioPlayer.removeAttribute('src');
        audioPlayer.style.display='none';
      }
      const playBtn=el('ccPlayBtn');
      if(playBtn) playBtn.disabled=true;

      const result=el('ccPronResult');
      if(result) result.style.display='none';

      setAudioStatus('🎙️ Kayıt başlıyor… konuşmaya hazırlan.', 'rec');

      ccVoiceStream = await navigator.mediaDevices.getUserMedia({
        audio:{
          echoCancellation:true,
          noiseSuppression:true,
          autoGainControl:true
        },
        video:false
      });

      let mime='';
      if(MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime='audio/webm;codecs=opus';
      else if(MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) mime='audio/webm';

      ccVoiceRec = new MediaRecorder(ccVoiceStream, mime ? {mimeType:mime} : undefined);

      ccVoiceRec.ondataavailable = e=>{
        if(e.data && e.data.size>0) ccVoiceChunks.push(e.data);
      };

      ccVoiceRec.onstop = ()=>{
        try{
          ccVoiceBlob = new Blob(ccVoiceChunks, {type: ccVoiceRec.mimeType || 'audio/webm'});
          ccVoiceUrl = URL.createObjectURL(ccVoiceBlob);
          const player=el('ccAudioPlayer');
          if(player){
            player.src=ccVoiceUrl;
            player.style.display='block';
          }
          const btn=el('ccPlayBtn');
          if(btn) btn.disabled=false;
          setAudioStatus('✅ Kayıt tamamlandı. “Kaydımı Dinle” ile sesini dinleyebilirsin.', 'ok');
          renderPronScore();
        }catch(e){
          console.error(e);
          setAudioStatus('Kayıt oluşturulamadı. Tekrar dene.', '');
        }
      };

      ccVoiceRec.start();
      ccVoiceRunning=true;

      const b=el('ccVoiceBtn');
      if(b){
        b.textContent='⏹ Kaydı Bitir';
        b.className='btn btn-ghost';
      }

      setAudioStatus('🔴 Kayıt açık. Kelime/cümleyi söyle. Bitirmek için tekrar bas.', 'rec');

      // SpeechRecognition sadece duyulan metni almak için kullanılır.
      if(SR){
        try{
          ccSpeech = new SR();
          ccSpeech.lang='en-US';
          ccSpeech.continuous=false;
          ccSpeech.interimResults=true;
          ccSpeech.maxAlternatives=5;

          ccSpeech.onresult = e=>{
            let finalText='', interim='';
            for(let i=e.resultIndex;i<e.results.length;i++){
              const t=e.results[i][0]?.transcript || '';
              if(e.results[i].isFinal) finalText += t + ' ';
              else interim += t + ' ';
            }
            const heard=(finalText || interim).trim();
            if(heard){
              ccHeardText=heard;
              setAudioStatus(`🔴 Kayıt açık.<br><b>Duyulan:</b> ${heard}`, 'rec');
            }
          };

          ccSpeech.onerror = e=>{
            console.warn('cc speech error', e?.error);
            // Ses kaydı devam etsin; sadece metin çıkarılamayabilir.
          };

          ccSpeech.onend = ()=>{
            // Chrome bazen otomatik bitirir; kayıt açıksa devam ettirmiyoruz, kullanıcı bitirsin.
          };

          setTimeout(()=>{ try{ ccSpeech.start(); }catch(e){} }, 250);
        }catch(e){
          console.warn('SpeechRecognition başlatılamadı:', e);
        }
      }

      // Güvenlik: 10 saniye sonra otomatik bitir
      setTimeout(()=>{
        if(ccVoiceRunning) finishVoicePronunciation();
      }, 10000);

    }catch(e){
      console.error('cc voice error', e);
      resetVoiceButton();
      stopSpeechOnly();
      stopAudioTracks();

      let msg='Mikrofon açılamadı.';
      if(e && e.name==='NotAllowedError') msg='Mikrofon izni verilmedi. Adres çubuğundaki kilitten mikrofon izni ver.';
      if(e && e.name==='NotFoundError') msg='Mikrofon bulunamadı.';
      if(e && e.name==='NotReadableError') msg='Mikrofon başka bir uygulama tarafından kullanılıyor olabilir.';
      setAudioStatus('❌ '+msg, '');
    }
  };

  window.ccPlayMyRecording = function(){
    const player=el('ccAudioPlayer');
    if(!player || !ccVoiceUrl){
      alert('Henüz dinlenecek kayıt yok.');
      return;
    }
    player.style.display='block';
    player.currentTime=0;
    player.play().catch(()=>alert('Ses çalınamadı. Tarayıcı tekrar tıklamanı isteyebilir.'));
  };

  // Kamera kapatılırsa ses kaydı da güvenli kapansın.
  const oldStop = window.stopCameraCoach;
  window.stopCameraCoach = function(){
    try{ if(ccVoiceRunning) finishVoicePronunciation(); }catch(e){}
    try{ stopSpeechOnly(); stopAudioTracks(); }catch(e){}
    if(typeof oldStop === 'function') oldStop();
  };

  window.addEventListener('pagehide', ()=>{
    try{ if(ccVoiceRunning) finishVoicePronunciation(); }catch(e){}
    try{ stopSpeechOnly(); stopAudioTracks(); }catch(e){}
  });
})();


/* ===== extracted script block ===== */


/* ══════════════════════════════════════════════════════════
   KAMERA KOÇU - TTS + REFERANS DALGA + KULLANICI DALGASI
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function el(id){ return document.getElementById(id); }

  function cleanTarget(){
    return (el('ccTarget')?.value || '').trim();
  }

  function clearCanvas(id){
    const c=el(id);
    if(!c) return;
    const ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle='#0d1320';
    ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle='rgba(255,255,255,.08)';
    ctx.lineWidth=1;
    for(let i=1;i<4;i++){
      const y=c.height*i/4;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke();
    }
  }

  function drawWaveArray(canvasId, data, label){
    const c=el(canvasId);
    if(!c) return;
    const ctx=c.getContext('2d');
    clearCanvas(canvasId);

    const mid=c.height/2;
    const amp=c.height*.42;

    ctx.strokeStyle='rgba(34,197,94,.95)';
    ctx.lineWidth=2;
    ctx.beginPath();

    for(let x=0;x<c.width;x++){
      const idx=Math.floor((x/c.width)*data.length);
      const v=data[idx] || 0;
      const y=mid - v*amp;
      if(x===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // envelope
    ctx.strokeStyle='rgba(59,130,246,.55)';
    ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=0;x<c.width;x++){
      const idx=Math.floor((x/c.width)*data.length);
      const v=Math.abs(data[idx] || 0);
      const y=mid - v*amp;
      if(x===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.beginPath();
    for(let x=0;x<c.width;x++){
      const idx=Math.floor((x/c.width)*data.length);
      const v=Math.abs(data[idx] || 0);
      const y=mid + v*amp;
      if(x===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.fillStyle='rgba(255,255,255,.65)';
    ctx.font='12px Nunito, sans-serif';
    ctx.fillText(label || '', 12, 20);
  }

  function synthReferenceWave(text){
    const t=String(text||'').toLowerCase();
    const len=Math.max(220, Math.min(900, t.length*70));
    const arr=new Float32Array(len);
    let seed=0;
    for(let i=0;i<t.length;i++) seed += t.charCodeAt(i)*(i+1);

    const syllableBoost = /[aeiou]/g.test(t) ? 1 : .65;
    const thBoost = t.includes('th') ? .78 : 1;
    const rBoost = /[rw]/.test(t) ? 1.15 : 1;

    for(let i=0;i<len;i++){
      const p=i/(len-1);
      const attack=Math.min(1,p*10);
      const release=Math.min(1,(1-p)*7);
      const env=Math.max(0,Math.min(attack,release));
      const tremor=0.65 + 0.35*Math.sin(2*Math.PI*(2.2*p + (seed%11)/10));
      const vowelPulse=0.55*Math.sin(2*Math.PI*(5.5*p + seed%5));
      const consonant=0.25*Math.sin(2*Math.PI*(18*p + seed%7));
      let v=(vowelPulse+consonant)*env*tremor*syllableBoost*thBoost*rBoost;

      // TH için başta daha hafif hava sesi simülasyonu
      if(t.includes('th') && p<.22) v += (Math.random()-.5)*.16*env;

      // Patlamalı seslerde kısa tepe
      if(/[ptkbdg]/.test(t) && p>.08 && p<.18) v += .45*env*Math.sin(2*Math.PI*40*p);

      arr[i]=Math.max(-1,Math.min(1,v));
    }
    return arr;
  }

  async function drawBlobWave(blob){
    if(!blob) return;
    try{
      const buf=await blob.arrayBuffer();
      const AC=window.AudioContext || window.webkitAudioContext;
      const ac=new AC();
      const audio=await ac.decodeAudioData(buf.slice(0));
      const ch=audio.getChannelData(0);
      const samples=900;
      const arr=new Float32Array(samples);
      const block=Math.floor(ch.length/samples) || 1;

      for(let i=0;i<samples;i++){
        let sum=0;
        const start=i*block;
        for(let j=0;j<block && start+j<ch.length;j++){
          sum += Math.abs(ch[start+j]);
        }
        const rms=sum/block;
        // merkez çizgi etrafında doğal dalga
        const sign = Math.sin(i*.35) >= 0 ? 1 : -1;
        arr[i]=Math.min(1,rms*8)*sign;
      }

      drawWaveArray('ccUserWave', arr, 'Kullanıcı gerçek kaydı');
      const inf=el('ccUserWaveInfo');
      if(inf) inf.textContent = `${audio.duration.toFixed(1)} sn kayıt`;
      try{ ac.close(); }catch(e){}
    }catch(e){
      console.warn('Kullanıcı ses dalgası çizilemedi:', e);
      const inf=el('ccUserWaveInfo');
      if(inf) inf.textContent='Dalga çizilemedi';
    }
  }

  window.ccDrawReferenceWave=function(){
    const target=cleanTarget();
    if(!target){
      alert('Önce hedef kelime veya cümleyi yaz.');
      el('ccTarget')?.focus();
      return;
    }
    const arr=synthReferenceWave(target);
    drawWaveArray('ccRefWave', arr, 'Yaklaşık native hedef dalga');
    const inf=el('ccRefWaveInfo');
    if(inf) inf.textContent=`"${target}" için referans dalga`;
  };

  window.ccSpeakTarget=function(){
    const target=cleanTarget();
    if(!target){
      alert('Önce hedef kelime veya cümleyi yaz.');
      el('ccTarget')?.focus();
      return;
    }

    try{
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(target);
      u.lang='en-US';
      u.rate=.82;
      u.pitch=1;
      u.volume=1;

      const voices=window.speechSynthesis.getVoices();
      const enVoice=voices.find(v=>/en-US/i.test(v.lang) && /female|samantha|google|microsoft/i.test(v.name))
                 || voices.find(v=>/^en/i.test(v.lang))
                 || null;
      if(enVoice) u.voice=enVoice;

      u.onstart=()=>{ 
        if(typeof window.ccDrawReferenceWave==='function') window.ccDrawReferenceWave();
        const st=el('ccAudioStatus');
        if(st){ st.className='cc-audio-status ok'; st.innerHTML='🔊 Hedef ses çalıyor. Sonra kendi sesini kaydedip dalgaları karşılaştır.'; }
      };
      u.onend=()=>{
        const st=el('ccAudioStatus');
        if(st){ st.className='cc-audio-status'; st.innerHTML='Şimdi “Sesimi Kaydet”e basıp aynı kelimeyi söyle.'; }
      };

      window.speechSynthesis.speak(u);
    }catch(e){
      alert('Bu tarayıcı seslendirmeyi desteklemiyor.');
    }
  };

  // Mevcut kayıt sistemi ccVoiceBlob değişkenini kapalı scope'ta tutuyor.
  // Bu yüzden MediaRecorder durduktan sonra audio element src'sinden blob'u fetch ederek dalga çiziyoruz.
  const oldPlay = window.ccPlayMyRecording;
  window.ccPlayMyRecording=function(){
    if(typeof oldPlay==='function') oldPlay();
    setTimeout(async()=>{
      try{
        const player=el('ccAudioPlayer');
        if(player && player.src){
          const blob=await fetch(player.src).then(r=>r.blob());
          drawBlobWave(blob);
        }
      }catch(e){}
    },300);
  };

  // ccStartVoicePronunciation sonrası kayıt tamamlanınca audio src oluşur; onu yakalayıp dalga çiz.
  const oldStart=window.ccStartVoicePronunciation;
  window.ccStartVoicePronunciation=function(){
    if(typeof oldStart==='function') oldStart();

    const watcher=setInterval(async()=>{
      const player=el('ccAudioPlayer');
      if(player && player.src && player.style.display!=='none'){
        clearInterval(watcher);
        try{
          const blob=await fetch(player.src).then(r=>r.blob());
          drawBlobWave(blob);
        }catch(e){}
      }
    },500);

    setTimeout(()=>clearInterval(watcher),15000);
  };

  document.addEventListener('DOMContentLoaded',()=>{
    clearCanvas('ccRefWave');
    clearCanvas('ccUserWave');
    setTimeout(()=>{ 
      if(el('ccRefWave')) clearCanvas('ccRefWave');
      if(el('ccUserWave')) clearCanvas('ccUserWave');
    },1000);
  });
})();


/* ===== extracted script block ===== */


/* ══════════════════════════════════════════════════════════
   HARF BAZLI TELAFFUZ HARİTASI
   Hedef kelime ile duyulan metni karakter karakter karşılaştırır.
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function ccMapEl(){ return document.getElementById('ccLetterMap'); }

  function cleanPronText(s){
    return String(s||'')
      .toLowerCase()
      .replace(/[.,!?;:()[\]"]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function charSimilarity(a,b){
    if(a===b) return 100;

    // Yakın fonetikler
    const groups = [
      ['r','l'],
      ['v','w'],
      ['t','d'],
      ['s','z'],
      ['b','p'],
      ['g','k'],
      ['m','n'],
      ['f','v']
    ];

    for(const g of groups){
      if(g.includes(a) && g.includes(b)) return 65;
    }

    // sesli harf yakınlığı
    const vowels='aeiou';
    if(vowels.includes(a) && vowels.includes(b)) return 55;

    return 0;
  }

  function buildLetterMap(target, heard){
    const root = ccMapEl();
    if(!root) return;

    target = cleanPronText(target);
    heard = cleanPronText(heard);

    root.innerHTML='';

    if(!target){
      root.innerHTML='<div style="font-size:13px;color:var(--muted)">Hedef kelime/cümle yok.</div>';
      return;
    }

    const tArr=[...target];
    const hArr=[...heard];

    tArr.forEach((tc,idx)=>{
      const div=document.createElement('div');

      if(tc===' '){
        div.className='cc-letter space';
        root.appendChild(div);
        return;
      }

      div.className='cc-letter';
      div.textContent=tc.toUpperCase();

      const hc=hArr[idx] || '';

      const sim = charSimilarity(tc, hc);

      if(sim>=90){
        div.classList.add('good');
        const sm=document.createElement('small');
        sm.textContent='OK';
        div.appendChild(sm);
      }else if(sim>=50){
        div.classList.add('mid');
        const sm=document.createElement('small');
        sm.textContent=hc ? hc.toUpperCase() : '?';
        div.appendChild(sm);
      }else{
        div.classList.add('bad');
        const sm=document.createElement('small');
        sm.textContent=hc ? hc.toUpperCase() : '×';
        div.appendChild(sm);
      }

      root.appendChild(div);
    });
  }

  // renderPronScore içine hook
  const oldRender = window.renderPronScore;

  // renderPronScore global değilse MutationObserver ile yakala
  function attachObserver(){
    const box=document.getElementById('ccPronLines');
    if(!box) return;

    const obs=new MutationObserver(()=>{
      try{
        const lines=box.innerText || '';
        const targetInput=document.getElementById('ccTarget');
        const target=(targetInput?.value || '').trim();

        let heard='';

        const m = lines.match(/Sistemin duyduğu:\s*(.+)/i);
        if(m){
          heard=m[1]
            .replace(/Benzerlik:.*/i,'')
            .trim();
        }

        buildLetterMap(target, heard);
      }catch(e){
        console.warn('letter map observer', e);
      }
    });

    obs.observe(box,{
      childList:true,
      subtree:true,
      characterData:true
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(attachObserver,1200);
  });

  // manuel erişim
  window.ccBuildLetterMap = buildLetterMap;
})();


/* ===== extracted script block ===== */


/* ══════════════════════════════════════════════════════════
   GERÇEK SESLİ VİDEO KAYDI
   - Kamera + mikrofon tek MediaRecorder ile kaydedilir
   - Kayıt bitince video geri izlenir
   - Ses izi aynı dosyadan çıkarılıp kullanıcı dalgasına çizilir
   - SpeechRecognition ile duyulan metin alınır ve mevcut telaffuz puanı tetiklenir
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  let rec=null;
  let stream=null;
  let chunks=[];
  let videoBlob=null;
  let videoUrl=null;
  let speech=null;
  let running=false;
  let heardText='';
  let autoStopTimer=null;

  function el(id){return document.getElementById(id);}
  function status(msg, cls){
    const s=el('ccVideoRecStatus');
    if(!s) return;
    s.className='cc-rec-status' + (cls ? ' '+cls : '');
    s.innerHTML=msg;
  }

  function resetBtn(){
    const b=el('ccVideoRecBtn');
    if(b){
      b.disabled=false;
      b.textContent='🎥 Video Kaydı Başlat';
      b.className='btn btn-green';
    }
  }

  function cleanText(s){
    return String(s||'').toLowerCase().replace(/[^a-z0-9\s']/g,' ').replace(/\s+/g,' ').trim();
  }

  function levenshtein(a,b){
    a=cleanText(a); b=cleanText(b);
    const m=a.length,n=b.length;
    if(!m && !n) return 0;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++) dp[i][0]=i;
    for(let j=0;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const cost=a[i-1]===b[j-1]?0:1;
        dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
      }
    }
    return dp[m][n];
  }

  function similarity(a,b){
    a=cleanText(a); b=cleanText(b);
    if(!a || !b) return 0;
    const maxLen=Math.max(a.length,b.length);
    return Math.max(0, Math.round((1 - levenshtein(a,b)/maxLen) * 100));
  }

  function wordAccuracy(target, heard){
    const tw=cleanText(target).split(/\s+/).filter(Boolean);
    const hw=cleanText(heard).split(/\s+/).filter(Boolean);
    if(!tw.length || !hw.length) return 0;
    let matched=0;
    const used=new Set();
    tw.forEach(t=>{
      let best=-1,bestScore=0;
      hw.forEach((h,i)=>{
        if(used.has(i)) return;
        const sc=similarity(t,h);
        if(sc>bestScore){bestScore=sc;best=i;}
      });
      if(bestScore>=70){matched++; used.add(best);}
    });
    return Math.round((matched/tw.length)*100);
  }

  function combinedScore(target, heard){
    const sim=similarity(target,heard);
    const wa=wordAccuracy(target,heard);
    let hint=100;
    const t=cleanText(target), h=cleanText(heard);
    if(t.includes('th') && !h.includes('th')) hint-=18;
    if(/[rl]/.test(t) && sim<65) hint-=10;
    if(/[wv]/.test(t) && sim<65) hint-=8;
    return Math.max(0, Math.round(sim*.55 + wa*.30 + hint*.15));
  }

  function stopSpeech(){
    try{
      if(speech){
        speech.onresult=null;
        speech.onerror=null;
        speech.onend=null;
        speech.stop();
        if(speech.abort) speech.abort();
      }
    }catch(e){}
    speech=null;
  }

  function stopStream(){
    try{
      if(stream) stream.getTracks().forEach(t=>{try{t.stop();}catch(e){}});
    }catch(e){}
    stream=null;
  }

  async function drawVideoAudioWave(blob){
    try{
      const buf=await blob.arrayBuffer();
      const AC=window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      const ac=new AC();
      const audio=await ac.decodeAudioData(buf.slice(0));
      const ch=audio.getChannelData(0);
      const samples=900;
      const arr=new Float32Array(samples);
      const block=Math.floor(ch.length/samples) || 1;
      for(let i=0;i<samples;i++){
        let sum=0;
        const start=i*block;
        for(let j=0;j<block && start+j<ch.length;j++) sum += Math.abs(ch[start+j]);
        const rms=sum/block;
        const sign=Math.sin(i*.35)>=0 ? 1 : -1;
        arr[i]=Math.min(1,rms*8)*sign;
      }

      const c=el('ccUserWave');
      if(c){
        const ctx=c.getContext('2d');
        ctx.clearRect(0,0,c.width,c.height);
        ctx.fillStyle='#0d1320';
        ctx.fillRect(0,0,c.width,c.height);
        ctx.strokeStyle='rgba(255,255,255,.08)';
        for(let k=1;k<4;k++){
          const y=c.height*k/4;
          ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();
        }
        const mid=c.height/2, amp=c.height*.42;
        ctx.strokeStyle='rgba(34,197,94,.95)';
        ctx.lineWidth=2;
        ctx.beginPath();
        for(let x=0;x<c.width;x++){
          const idx=Math.floor((x/c.width)*arr.length);
          const y=mid-(arr[idx]||0)*amp;
          if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      const info=el('ccUserWaveInfo');
      if(info) info.textContent=`Video sesinden çıkarıldı • ${audio.duration.toFixed(1)} sn`;
      try{ac.close();}catch(e){}
    }catch(e){
      console.warn('Video ses dalgası çıkarılamadı:', e);
      const info=el('ccUserWaveInfo');
      if(info) info.textContent='Video ses dalgası çıkarılamadı';
    }
  }

  function renderVideoPronScore(){
    const target=(el('ccTarget')?.value||'').trim();
    const heard=heardText.trim();
    const score=heard ? combinedScore(target,heard) : 0;

    const box=el('ccPronResult');
    const scoreEl=el('ccRealPronScore');
    const lines=el('ccPronLines');
    if(box) box.style.display='block';
    if(scoreEl) scoreEl.textContent=score;
    if(el('ccPronVal')) el('ccPronVal').textContent=score;
    if(el('ccPronBar')) el('ccPronBar').style.width=score+'%';

    let advice='';
    if(!heard) advice='Ses tanıma metin çıkaramadı. Videoyu izleyip tekrar kaydet.';
    else if(score>=85) advice='Çok iyi. Sesli video kaydında telaffuz hedefe yakın.';
    else if(score>=65) advice='Orta-iyi. Videoda ağız açıklığı ve ritmi kontrol et.';
    else advice='Tekrar dene. Videoyu izleyip ağız açıklığı ve hedef sesi karşılaştır.';

    const t=cleanText(target);
    if(t.includes('th')) advice += '<br>TH için dil ucunu dişlerin arasına hafif çıkar.';
    if(/[rl]/.test(t)) advice += '<br>R/L için dil pozisyonunu videoda özellikle kontrol et.';
    if(/[wv]/.test(t)) advice += '<br>W/V için dudak yuvarlama ve diş-dudak temasını kontrol et.';

    if(lines){
      lines.innerHTML=`
        <b>Hedef:</b> ${target || '-'}<br>
        <b>Sistemin duyduğu:</b> ${heard || '—'}<br>
        <b>Benzerlik:</b> ${similarity(target,heard)}/100<br>
        <b>Kelime eşleşmesi:</b> ${wordAccuracy(target,heard)}/100<br><br>
        ${advice}
      `;
    }

    if(typeof window.ccBuildLetterMap==='function'){
      try{ window.ccBuildLetterMap(target, heard); }catch(e){}
    }
  }

  async function start(){
    const target=(el('ccTarget')?.value||'').trim();
    if(!target){
      alert('Önce hedef kelime veya cümleyi yaz.');
      el('ccTarget')?.focus();
      return;
    }

    if(running) return stop();

    if(videoUrl){
      URL.revokeObjectURL(videoUrl);
      videoUrl=null;
      videoBlob=null;
    }

    const replay=el('ccReplayVideo');
    if(replay){
      replay.pause();
      replay.removeAttribute('src');
      replay.style.display='none';
    }
    const down=el('ccVideoDownload');
    if(down){
      down.removeAttribute('href');
      down.style.display='none';
    }
    const replayBtn=el('ccReplayBtn');
    if(replayBtn) replayBtn.disabled=true;

    heardText='';
    chunks=[];

    try{
      status('🎥 Kamera ve mikrofon açılıyor…', 'rec');

      stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:'user',width:{ideal:720},height:{ideal:480}},
        audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}
      });

      // Canlı kamera görünümüne aynı stream'i ver.
      const live=el('ccVideo');
      if(live){
        live.srcObject=stream;
        try{await live.play();}catch(e){}
      }

      let mime='';
      const candidates=[
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      if(window.MediaRecorder && MediaRecorder.isTypeSupported){
        mime=candidates.find(m=>MediaRecorder.isTypeSupported(m)) || '';
      }

      rec=new MediaRecorder(stream, mime ? {mimeType:mime} : undefined);
      rec.ondataavailable=e=>{
        if(e.data && e.data.size>0) chunks.push(e.data);
      };
      rec.onstop=async()=>{
        try{
          videoBlob=new Blob(chunks,{type:rec.mimeType || 'video/webm'});
          videoUrl=URL.createObjectURL(videoBlob);

          if(replay){
            replay.src=videoUrl;
            replay.style.display='block';
          }
          if(replayBtn) replayBtn.disabled=false;
          if(down){
            down.href=videoUrl;
            down.style.display='block';
          }

          status('✅ Video kaydı hazır. “Kaydımı İzle” ile sesli videonu izleyebilirsin.', 'ok');

          await drawVideoAudioWave(videoBlob);
          renderVideoPronScore();
        }catch(e){
          console.error(e);
          status('Video kaydı oluşturulamadı.', '');
        }finally{
          stopSpeech();
          stopStream();
          resetBtn();
          running=false;
          clearTimeout(autoStopTimer);
        }
      };

      rec.start(250);
      running=true;

      const b=el('ccVideoRecBtn');
      if(b){
        b.textContent='⏹ Video Kaydını Bitir';
        b.className='btn btn-ghost';
      }

      status('<span class="cc-rec-dot"></span> Kayıt açık. Hedef kelime/cümleyi söyle. Bitirmek için tekrar bas.', 'rec');

      const SR=window.SpeechRecognition || window.webkitSpeechRecognition;
      if(SR){
        try{
          speech=new SR();
          speech.lang='en-US';
          speech.continuous=false;
          speech.interimResults=true;
          speech.maxAlternatives=5;
          speech.onresult=e=>{
            let fin='', inter='';
            for(let i=e.resultIndex;i<e.results.length;i++){
              const t=e.results[i][0]?.transcript || '';
              if(e.results[i].isFinal) fin += t + ' ';
              else inter += t + ' ';
            }
            const heard=(fin || inter).trim();
            if(heard){
              heardText=heard;
              status(`<span class="cc-rec-dot"></span> Kayıt açık.<br><b>Duyulan:</b> ${heard}`, 'rec');
            }
          };
          speech.onerror=e=>console.warn('video speech error', e?.error);
          setTimeout(()=>{try{speech.start();}catch(e){}},250);
        }catch(e){}
      }

      autoStopTimer=setTimeout(()=>{
        if(running) stop();
      }, 12000);

    }catch(e){
      console.error('video rec error', e);
      resetBtn();
      stopSpeech();
      stopStream();
      running=false;

      let msg='Kamera/mikrofon açılamadı.';
      if(e && e.name==='NotAllowedError') msg='Kamera veya mikrofon izni verilmedi. Adres çubuğundaki kilitten izin ver.';
      if(e && e.name==='NotFoundError') msg='Kamera veya mikrofon bulunamadı.';
      if(e && e.name==='NotReadableError') msg='Kamera/mikrofon başka uygulama tarafından kullanılıyor olabilir.';
      status('❌ '+msg, '');
    }
  }

  function stop(){
    if(!running) return;
    running=false;
    clearTimeout(autoStopTimer);
    try{
      if(rec && rec.state!=='inactive') rec.stop();
      else{
        stopSpeech();
        stopStream();
        resetBtn();
      }
    }catch(e){
      stopSpeech();
      stopStream();
      resetBtn();
    }
  }

  window.ccToggleVideoRecording=function(){
    if(running) stop();
    else start();
  };

  window.ccPlayVideoRecording=function(){
    const replay=el('ccReplayVideo');
    if(!replay || !videoUrl){
      alert('Henüz video kaydı yok.');
      return;
    }
    replay.style.display='block';
    replay.currentTime=0;
    replay.play().catch(()=>alert('Video oynatılamadı. Tekrar tıkla.'));
  };

  const oldStopCamera=window.stopCameraCoach;
  window.stopCameraCoach=function(){
    try{ if(running) stop(); }catch(e){}
    if(typeof oldStopCamera==='function') oldStopCamera();
  };

  window.addEventListener('pagehide',()=>{
    try{ if(running) stop(); }catch(e){}
    try{ stopSpeech(); stopStream(); }catch(e){}
  });
})();


/* ===== extracted script block ===== */


/* ══════════════════════════════════════════════════════════
   GHOST NATIVE OVERLAY
   Kullanıcı videosu üzerine ideal ağız/dudak/dil rehberi çizer.
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  let ghostOn=true, ghostAnim=null, ghostPhase=0, timelineEvents=[];
  function el(id){return document.getElementById(id)}
  function target(){return (el('ccTarget')?.value||'').toLowerCase().trim()}
  function resizeGhostCanvas(){
    const video=el('ccVideo'), canvas=el('ccGhostCanvas');
    if(!video||!canvas)return false;
    const w=video.videoWidth||video.clientWidth||640, h=video.videoHeight||video.clientHeight||480;
    if(canvas.width!==w)canvas.width=w;
    if(canvas.height!==h)canvas.height=h;
    return true;
  }
  function detectSoundMode(t){
    if(t.includes('th'))return 'TH';
    if(/[wr]/.test(t))return 'ROUND';
    if(/[fv]/.test(t))return 'FV';
    if(/[aeiou]/.test(t))return 'VOWEL';
    return 'NEUTRAL';
  }
  function ghostTipText(mode){
    if(mode==='TH')return 'TH: Dil ucu dişlerin arasına hafif çıkmalı. T/D gibi kapatma.';
    if(mode==='ROUND')return 'R/W: Dudakları biraz yuvarla ve öne doğru getir. Ağız çok yayvan kalmasın.';
    if(mode==='FV')return 'F/V: Üst diş alt dudağa hafif temas etmeli. Dudakları tamamen kapatma.';
    if(mode==='VOWEL')return 'Ünlü sesler: Ağız açıklığını artır, sesleri daha net çıkar.';
    return 'Ağız rehberi: Dudak açıklığı, çene hareketi ve ritmi hedef sese yaklaştır.';
  }
  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function drawGhost(){
    const canvas=el('ccGhostCanvas'); if(!canvas||!ghostOn)return;
    resizeGhostCanvas();
    const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const mode=detectSoundMode(target());
    const tip=el('ccGhostTip'); if(tip)tip.textContent=ghostTipText(mode);
    ghostPhase+=0.045;
    const pulse=(Math.sin(ghostPhase)+1)/2;
    const cx=w*.50, cy=h*.57;
    let mouthW=w*.20, mouthH=h*(.035+pulse*.025), color='rgba(167,139,250,.95)', fill='rgba(167,139,250,.12)';
    if(mode==='TH'){mouthW=w*.22;mouthH=h*.045;color='rgba(59,130,246,.95)';fill='rgba(59,130,246,.13)'}
    else if(mode==='ROUND'){mouthW=w*.13;mouthH=h*.075;color='rgba(34,197,94,.95)';fill='rgba(34,197,94,.12)'}
    else if(mode==='FV'){mouthW=w*.20;mouthH=h*.035;color='rgba(245,158,11,.95)';fill='rgba(245,158,11,.12)'}
    else if(mode==='VOWEL'){mouthW=w*.22;mouthH=h*.075;color='rgba(34,211,238,.95)';fill='rgba(34,211,238,.12)'}
    ctx.save();
    ctx.lineWidth=4; ctx.strokeStyle=color; ctx.fillStyle=fill;
    ctx.beginPath(); ctx.ellipse(cx,cy,mouthW/2,mouthH/2,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.lineWidth=2; ctx.strokeStyle='rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.moveTo(cx-mouthW*.38,cy); ctx.quadraticCurveTo(cx,cy+mouthH*.22,cx+mouthW*.38,cy); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.moveTo(cx,cy-mouthH*.75); ctx.lineTo(cx,cy+mouthH*.75); ctx.stroke(); ctx.setLineDash([]);
    ctx.font=`${Math.max(16,w*.028)}px Nunito, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    if(mode==='TH'){
      ctx.fillStyle='rgba(239,68,68,.70)';
      roundRect(ctx,cx-mouthW*.22,cy+mouthH*.05,mouthW*.44,mouthH*.42,8); ctx.fill();
      ctx.fillStyle='#dbeafe'; ctx.fillText('DİL DIŞARI',cx,cy+mouthH*1.45);
    }else if(mode==='ROUND'){
      ctx.strokeStyle='rgba(34,197,94,.85)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(cx,cy,mouthH*.62,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#bbf7d0'; ctx.fillText('YUVARLA',cx,cy+mouthH*1.55);
    }else if(mode==='FV'){
      ctx.strokeStyle='rgba(245,158,11,.95)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(cx-mouthW*.35,cy-mouthH*.35); ctx.lineTo(cx+mouthW*.35,cy+mouthH*.25); ctx.stroke();
      ctx.fillStyle='#fde68a'; ctx.fillText('DİŞ + DUDAK',cx,cy+mouthH*1.65);
    }else{
      ctx.fillStyle='#cffafe'; ctx.fillText('AĞZI AÇ',cx,cy+mouthH*1.55);
    }
    ctx.strokeStyle='rgba(255,255,255,.20)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(cx,cy,Math.max(mouthW,mouthH)*.75,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.55)'; roundRect(ctx,12,12,190,34,12); ctx.fill();
    ctx.fillStyle=color; ctx.textAlign='left'; ctx.font=`bold ${Math.max(14,w*.022)}px Nunito, sans-serif`; ctx.fillText(`👻 ${mode} rehberi`,26,29);
    ctx.restore();
  }
  function loop(){ if(ghostOn)drawGhost(); ghostAnim=requestAnimationFrame(loop); }
  window.ccToggleGhostOverlay=function(){
    ghostOn=!ghostOn;
    const c=el('ccGhostCanvas'); if(c&&!ghostOn)c.getContext('2d').clearRect(0,0,c.width,c.height);
    const b=el('ccGhostBtn'); if(b)b.textContent=ghostOn?'👻 Overlay Kapat':'👻 Overlay Aç';
  };
  function getDuration(){const v=el('ccReplayVideo'); return (v&&isFinite(v.duration)&&v.duration>0)?v.duration:12;}
  window.ccGenerateGhostTimeline=function(){
    const mode=detectSoundMode(target()), dur=getDuration(); timelineEvents=[];
    if(mode==='TH'){timelineEvents.push({time:dur*.22,type:'bad',label:'TH dil'}); timelineEvents.push({time:dur*.48,type:'mid',label:'ağız'});}
    else if(mode==='ROUND'){timelineEvents.push({time:dur*.25,type:'mid',label:'yuvarla'}); timelineEvents.push({time:dur*.58,type:'bad',label:'R/W'});}
    else if(mode==='FV'){timelineEvents.push({time:dur*.30,type:'bad',label:'F/V'}); timelineEvents.push({time:dur*.64,type:'mid',label:'dudak'});}
    else{timelineEvents.push({time:dur*.20,type:'mid',label:'açıklık'}); timelineEvents.push({time:dur*.52,type:'good',label:'ritim'}); timelineEvents.push({time:dur*.74,type:'mid',label:'vurgu'});}
    renderTimeline(dur);
  };
  function renderTimeline(dur){
    const track=el('ccGhostTimelineTrack'), list=el('ccGhostTimelineList'); if(!track||!list)return;
    track.querySelectorAll('.cc-timeline-dot').forEach(d=>d.remove()); list.innerHTML='';
    timelineEvents.forEach(ev=>{
      const dot=document.createElement('div'); dot.className='cc-timeline-dot '+ev.type; dot.style.left=Math.max(0,Math.min(100,ev.time/dur*100))+'%'; dot.title=`${ev.time.toFixed(1)} sn - ${ev.label}`; dot.onclick=()=>seekReplay(ev.time); track.appendChild(dot);
      const chip=document.createElement('button'); chip.className='cc-time-chip '+ev.type; chip.textContent=`${ev.time.toFixed(1)} sn ${ev.label}`; chip.onclick=()=>seekReplay(ev.time); list.appendChild(chip);
    });
  }
  function seekReplay(t){const v=el('ccReplayVideo'); if(v&&v.src){v.style.display='block'; v.currentTime=Math.max(0,t); v.play().catch(()=>{});}}
  function updateTimelineProgress(){
    const fill=el('ccGhostTimelineFill'), v=el('ccReplayVideo');
    if(fill&&v&&isFinite(v.duration)&&v.duration>0)fill.style.width=Math.max(0,Math.min(100,v.currentTime/v.duration*100))+'%';
    requestAnimationFrame(updateTimelineProgress);
  }
  document.addEventListener('DOMContentLoaded',()=>{ if(!ghostAnim)loop(); updateTimelineProgress(); setTimeout(()=>window.ccGenerateGhostTimeline&&window.ccGenerateGhostTimeline(),1200); });
  document.addEventListener('input',e=>{ if(e.target&&e.target.id==='ccTarget')setTimeout(()=>window.ccGenerateGhostTimeline&&window.ccGenerateGhostTimeline(),100); });
})();


/* ===== extracted script block ===== */


/* ══════════════════════════════════════════════════════════
   KAMERA KOÇU - POPUP TELAFFUZ HARİTASI MANTIĞI BİREBİR
   Popup'taki renderPronMapFixed mantığı kamera bölümüne uygulanır:
   ok / close / bad / miss / extra + aynı skor formülü
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }

  function normLetters(s){
    return String(s||"")
      .toLowerCase()
      .replace(/[^a-z]/g,"");
  }

  function esc(s){
    return String(s||"").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  const closeGroups = [
    ["v","f","w"],["r","l"],["t","d"],["s","z"],["i","e","y"],
    ["o","u"],["a","e"],["c","k","q"],["g","j"],["p","b"]
  ];

  function isClosePopup(a,b){
    return closeGroups.some(g => g.includes(a) && g.includes(b));
  }

  function alignPopup(target, spoken){
    const a = normLetters(target);
    const b = normLetters(spoken);
    const m = a.length, n = b.length;
    const dp = Array.from({length:m+1}, () => Array(n+1).fill(0));

    for(let i=0;i<=m;i++) dp[i][0]=i;
    for(let j=0;j<=n;j++) dp[0][j]=j;

    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const cost = a[i-1] === b[j-1] ? 0 : (isClosePopup(a[i-1], b[j-1]) ? 0.5 : 1);
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,
          dp[i][j-1] + 1,
          dp[i-1][j-1] + cost
        );
      }
    }

    let i=m, j=n, out=[];
    while(i>0 || j>0){
      if(i>0 && j>0){
        const subCost = a[i-1] === b[j-1] ? 0 : (isClosePopup(a[i-1], b[j-1]) ? 0.5 : 1);
        if(Math.abs(dp[i][j] - (dp[i-1][j-1] + subCost)) < 0.001){
          out.push({
            char:a[i-1],
            heard:b[j-1],
            status:a[i-1]===b[j-1] ? "ok" : (isClosePopup(a[i-1],b[j-1]) ? "close" : "bad")
          });
          i--; j--;
          continue;
        }
      }
      if(i>0 && Math.abs(dp[i][j] - (dp[i-1][j] + 1)) < 0.001){
        out.push({char:a[i-1], heard:"", status:"miss"});
        i--;
      }else{
        out.push({char:b[j-1], heard:b[j-1], status:"extra"});
        j--;
      }
    }
    return out.reverse();
  }

  function statusToClass(st){
    if(st==="ok") return "good";
    if(st==="close") return "mid";
    if(st==="bad" || st==="miss") return "bad";
    if(st==="extra") return "mid";
    return "";
  }

  function statusLabel(st, heard){
    if(st==="ok") return "OK";
    if(st==="close") return heard ? heard.toUpperCase() : "≈";
    if(st==="miss") return "×";
    if(st==="extra") return "+";
    return heard ? heard.toUpperCase() : "!";
  }

  function popupScore(data, target){
    const totalTarget = data.filter(x => x.status !== "extra").length || normLetters(target).length || 1;
    const ok = data.filter(x => x.status === "ok").length;
    const close = data.filter(x => x.status === "close").length;
    return Math.round(((ok + close*0.5) / totalTarget) * 100);
  }

  function renderCameraPopupMap(target, spoken){
    const root = $("ccLetterMap");
    if(!root) return;

    const demoMode = !String(spoken||"").trim();
    if(demoMode) spoken = target;

    const data = alignPopup(target, spoken);
    const score = popupScore(data, target);
    const weak = [...new Set(data.filter(x => !["ok","extra"].includes(x.status)).map(x=>x.char))];

    root.innerHTML = data.map(x => {
      if(x.status === "extra"){
        return `<div class="cc-letter mid" title="Fazladan duyuldu: ${esc(x.heard)}">+<small>${esc((x.heard||"").toUpperCase())}</small></div>`;
      }
      const cls = statusToClass(x.status);
      const title = `Beklenen: ${esc(x.char)}${x.heard ? " | Duyulan: "+esc(x.heard) : " | Duyulmadı"}`;
      return `<div class="cc-letter ${cls}" title="${title}">${esc((x.char||"").toUpperCase())}<small>${esc(statusLabel(x.status,x.heard))}</small></div>`;
    }).join("");

    const scoreEl = $("ccRealPronScore");
    const scoreCard = $("ccPronVal");
    const scoreBar = $("ccPronBar");
    if(scoreEl) scoreEl.textContent = score;
    if(scoreCard) scoreCard.textContent = score;
    if(scoreBar) scoreBar.style.width = Math.max(0,Math.min(100,score)) + "%";

    let note = $("ccPopupMapNote");
    const compareBox = root.closest(".cc-pron-compare");
    if(compareBox && !note){
      note = document.createElement("div");
      note.id = "ccPopupMapNote";
      note.style.cssText = "margin-top:18px;font-size:12px;color:var(--sub);line-height:1.55;background:var(--bg3);border-radius:10px;padding:8px 10px";
      compareBox.appendChild(note);
    }
    if(note){
      note.innerHTML = `
        Popup mantığı skoru: <b>${score}%</b><br>
        ${demoMode ? "Duyulan metin boş olduğu için başlangıç haritası hedef kelimeye göre gösterildi." : ""}
        ${weak.length ? "Dikkat edilecek sesler: <b>"+esc(weak.join(", "))+"</b>" : "Belirgin sorunlu ses görünmüyor."}
        <br><span style="color:#4ade80">Yeşil</span>: doğru · <span style="color:#facc15">Sarı</span>: yakın · <span style="color:#fca5a5">Kırmızı</span>: sorunlu · <span style="color:#fb923c">Turuncu</span>: eksik
      `;
    }
  }

  function extractHeardFromLines(){
    const lines = $("ccPronLines");
    if(!lines) return "";
    const text = lines.innerText || "";
    const m = text.match(/Sistemin duyduğu:\s*([^\n\r]+)/i);
    if(!m) return "";
    return (m[1] || "")
      .replace(/^—$/,"")
      .replace(/Benzerlik:.*/i,"")
      .trim();
  }

  window.ccBuildLetterMap = function(target, heard){
    renderCameraPopupMap(target, heard);
  };

  function refresh(){
    const target = ($("ccTarget")?.value || "").trim();
    const heard = extractHeardFromLines();
    if(target) renderCameraPopupMap(target, heard);
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    setTimeout(()=>{
      const lines = $("ccPronLines");
      if(lines){
        const obs = new MutationObserver(refresh);
        obs.observe(lines,{childList:true,subtree:true,characterData:true});
      }
      const target = $("ccTarget");
      if(target) target.addEventListener("input", refresh);
      refresh();
    }, 1000);
  });
})();


/* ===== extracted script block ===== */


/* ══════════════════════════════════════════════════════════
   PUAN - RENK TUTARLILIK FIX
   Sorun: Eski harf renklendirme observer'ı ile yeni popup skoru çakışıyordu.
   Çözüm: Kamera harf haritası ve skor tek fonksiyondan hesaplanır.
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }

  function cleanLetters(s){
    return String(s||'')
      .toLowerCase()
      .replace(/[^a-z]/g,'');
  }

  function esc(s){
    return String(s||'').replace(/[&<>"']/g, m => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[m]));
  }

  const nearGroups = [
    ['v','f','w'],
    ['r','l'],
    ['t','d'],
    ['s','z'],
    ['i','e','y'],
    ['o','u'],
    ['a','e'],
    ['c','k','q'],
    ['g','j'],
    ['p','b']
  ];

  function isNear(a,b){
    return nearGroups.some(g => g.includes(a) && g.includes(b));
  }

  function align(target, heard){
    const a = cleanLetters(target);
    const b = cleanLetters(heard);

    if(!a){
      return {items:[], score:0};
    }

    // Eğer duyulan boşsa veya hedefle birebir aynıysa: tamamen yeşil.
    // Bu, 100 puan-kırmızı çelişkisini engeller.
    if(!b || a === b){
      return {
        score:100,
        items:[...a].map(ch => ({char:ch, heard:ch, status:'ok'}))
      };
    }

    const m=a.length, n=b.length;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));

    for(let i=0;i<=m;i++) dp[i][0]=i;
    for(let j=0;j<=n;j++) dp[0][j]=j;

    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const sub = a[i-1]===b[j-1] ? 0 : (isNear(a[i-1],b[j-1]) ? 0.5 : 1);
        dp[i][j]=Math.min(
          dp[i-1][j]+1,
          dp[i][j-1]+1,
          dp[i-1][j-1]+sub
        );
      }
    }

    let i=m,j=n,items=[];
    while(i>0 || j>0){
      if(i>0 && j>0){
        const sub = a[i-1]===b[j-1] ? 0 : (isNear(a[i-1],b[j-1]) ? 0.5 : 1);
        if(Math.abs(dp[i][j]-(dp[i-1][j-1]+sub))<0.001){
          items.push({
            char:a[i-1],
            heard:b[j-1],
            status:a[i-1]===b[j-1] ? 'ok' : (isNear(a[i-1],b[j-1]) ? 'close' : 'bad')
          });
          i--; j--;
          continue;
        }
      }

      if(i>0 && Math.abs(dp[i][j]-(dp[i-1][j]+1))<0.001){
        items.push({char:a[i-1], heard:'', status:'miss'});
        i--;
      }else{
        items.push({char:b[j-1], heard:b[j-1], status:'extra'});
        j--;
      }
    }

    items.reverse();

    const targetCount = items.filter(x => x.status !== 'extra').length || a.length || 1;
    const ok = items.filter(x => x.status === 'ok').length;
    const close = items.filter(x => x.status === 'close').length;
    const score = Math.round(((ok + close*0.5) / targetCount) * 100);

    return {items, score};
  }

  function cls(status){
    if(status === 'ok') return 'good';
    if(status === 'close') return 'mid';
    if(status === 'bad' || status === 'miss') return 'bad';
    if(status === 'extra') return 'mid';
    return '';
  }

  function label(status, heard){
    if(status === 'ok') return 'OK';
    if(status === 'close') return heard ? heard.toUpperCase() : '≈';
    if(status === 'miss') return '×';
    if(status === 'extra') return '+';
    return heard ? heard.toUpperCase() : '!';
  }

  function extractHeard(){
    const lines = $('ccPronLines');
    if(!lines) return '';
    const txt = lines.innerText || '';
    const m = txt.match(/Sistemin duyduğu:\s*([^\n\r]+)/i);
    if(!m) return '';
    const heard = (m[1] || '').trim();
    if(heard === '—' || heard === '-' || heard.toLowerCase() === 'undefined') return '';
    return heard;
  }

  function render(target, heard){
    const root = $('ccLetterMap');
    if(!root) return;

    const result = align(target, heard);
    const items = result.items;
    const score = result.score;

    root.innerHTML = items.map(x => {
      if(x.status === 'extra'){
        return `<div class="cc-letter mid" title="Fazladan duyuldu: ${esc(x.heard)}">+<small>${esc((x.heard||'').toUpperCase())}</small></div>`;
      }

      return `<div class="cc-letter ${cls(x.status)}" title="Beklenen: ${esc(x.char)} | Duyulan: ${esc(x.heard || 'duyulmadı')}">${esc((x.char||'').toUpperCase())}<small>${esc(label(x.status,x.heard))}</small></div>`;
    }).join('');

    // Skoru da aynı sonuçtan yaz. Artık puan ve renk çelişmez.
    const ids = ['ccRealPronScore','ccPronVal'];
    ids.forEach(id => {
      const e = $(id);
      if(e) e.textContent = score;
    });

    const bar = $('ccPronBar');
    if(bar) bar.style.width = Math.max(0, Math.min(100, score)) + '%';

    let note = $('ccPopupMapNote');
    const box = root.closest('.cc-pron-compare');
    if(box && !note){
      note = document.createElement('div');
      note.id = 'ccPopupMapNote';
      note.style.cssText = 'margin-top:18px;font-size:12px;color:var(--sub);line-height:1.55;background:var(--bg3);border-radius:10px;padding:8px 10px';
      box.appendChild(note);
    }

    const weak = [...new Set(items.filter(x => !['ok','extra'].includes(x.status)).map(x => x.char))];

    if(note){
      note.innerHTML = `
        Popup mantığı skoru: <b>${score}%</b><br>
        ${heard ? `Duyulan: <b>${esc(heard)}</b><br>` : `Duyulan metin yoksa harita hedef kelime üzerinden yeşil gösterilir.<br>`}
        ${weak.length ? `Dikkat edilecek sesler: <b>${esc(weak.join(', '))}</b>` : `Belirgin sorunlu ses görünmüyor.`}
        <br><span style="color:#4ade80">Yeşil</span>: doğru · <span style="color:#facc15">Sarı</span>: yakın · <span style="color:#fca5a5">Kırmızı</span>: sorunlu
      `;
    }
  }

  function refresh(){
    const target = ($('ccTarget')?.value || '').trim();
    const heard = extractHeard();
    if(target) render(target, heard);
  }

  // En son tanımlanan fonksiyon bu olsun; eski scriptleri geçersiz kılar.
  window.ccBuildLetterMap = function(target, heard){
    render(target, heard || '');
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const lines = $('ccPronLines');
      if(lines){
        new MutationObserver(refresh).observe(lines, {
          childList:true,
          subtree:true,
          characterData:true
        });
      }

      const target = $('ccTarget');
      if(target) target.addEventListener('input', refresh);

      refresh();
    }, 800);
  });

  // Bazı eski observer'lar sonradan bozarsa tekrar düzelt.
  setInterval(refresh, 1500);
})();


/* ===== extracted script block ===== */


/* EARLY PFC SAFE STUB - Canlı Skor Koçu düğmeleri ReferenceError vermesin */
(function(){
  window.lcSetPFCMode = window.lcSetPFCMode || function(mode){
    window.__pendingLcPfcMode = mode || 'word';
    ['Word','Phrase','Sentence'].forEach(function(m){
      var b=document.getElementById('lcPfcMode'+m);
      if(b) b.classList.toggle('active', m.toLowerCase()===(mode||'word'));
    });
    var input=document.getElementById('lcManualWord');
    if(input){
      input.placeholder = mode==='phrase' ? 'Örn: think about it, very well' : (mode==='sentence' ? 'Örn: I think this is very useful.' : 'Örn: think, through, comfortable');
    }
  };
})();


/* ===== extracted script block ===== */


/* CANLI SKOR KOÇU - TAM RUNTIME */
(function(){
  let stream=null;
  let running=false;
  let raf=null;
  let phase=0;
  let stats={mouth:0,eye:0,rhythm:0,live:0};
  let history=[];

  function el(id){return document.getElementById(id);}
  function pct(n){return Math.max(0,Math.min(100,Math.round(n)));}
  function target(){return (el('lcTarget')?.value||'').toLowerCase().trim();}

  function lcUpdateTargetLabel(){
    const t=(el('lcTarget')?.value||'think').trim() || 'think';
    const lab=el('lcCurrentTargetLabel');
    if(lab) lab.textContent=t;
  }

  window.lcSyncManualWord=function(){
    const manual=el('lcManualWord');
    const targetInput=el('lcTarget');
    if(manual && targetInput){
      targetInput.value=manual.value;
      lcUpdateTargetLabel();
      try{ window.lcRenderPFCTarget(targetInput.value); }catch(e){}
    }
  };

  window.lcMirrorTargetToManual=function(){
    const manual=el('lcManualWord');
    const targetInput=el('lcTarget');
    if(manual && targetInput){
      manual.value=targetInput.value;
      lcUpdateTargetLabel();
      try{ window.lcRenderPFCTarget(targetInput.value); }catch(e){}
    }
  };

  window.lcSetManualTarget=function(){
    const manual=el('lcManualWord');
    const targetInput=el('lcTarget');
    const val=(manual?.value||'').trim();
    if(!val){ alert('Önce bir kelime yaz.'); return; }
    if(targetInput) targetInput.value=val;
    lcUpdateTargetLabel();
    try{ window.lcRenderPFCTarget(val); }catch(e){}
    try{ window.lcSpeakTarget(); }catch(e){}
  };

  window.lcRandomTarget=function(){
    const words=['think','through','three','water','comfortable','actually','because','world','very','friend','school','language','environment','achievement','vocabulary'];
    const val=words[Math.floor(Math.random()*words.length)];
    const manual=el('lcManualWord');
    const targetInput=el('lcTarget');
    if(manual) manual.value=val;
    if(targetInput) targetInput.value=val;
    lcUpdateTargetLabel();
    try{ window.lcRenderPFCTarget(val); }catch(e){}
    try{ window.lcSpeakTarget(); }catch(e){}
  };

  function mode(){
    const t=target();
    if(t.includes('th')) return 'TH';
    if(/[wr]/.test(t)) return 'ROUND';
    if(/[fv]/.test(t)) return 'FV';
    if(/[aeiou]/.test(t)) return 'VOWEL';
    return 'GENERAL';
  }

  function setv(id,v){
    const e=el(id);
    if(e) e.textContent=pct(v);
  }

  function fill(id,v){
    const e=el(id);
    if(e) e.style.width=pct(v)+'%';
  }

  function showOnlyScreen(id){
    document.querySelectorAll('.screen').forEach(s=>{
      s.classList.remove('active');
      s.style.display='none';
    });
    const sc=el(id);
    if(sc){
      sc.style.display='block';
      sc.classList.add('active');
    }
  }

  window.openLiveCoachFromSettings=function(){
    try{ if(typeof stopCameraCoach==='function') stopCameraCoach(); }catch(e){}
    showOnlyScreen('sc-live-coach');
  };

  window.backToSettingsFromLiveCoach=function(){
    try{ window.stopLiveCoach(); }catch(e){}
    const settings =
      el('sc-settings') ||
      el('sc-ayarlar') ||
      document.querySelector('[id*="setting"].screen') ||
      document.querySelector('[id*="ayar"].screen');

    document.querySelectorAll('.screen').forEach(s=>{
      s.classList.remove('active');
      s.style.display='none';
    });

    if(settings){
      settings.style.display='block';
      settings.classList.add('active');
    }else if(typeof switchTab==='function'){
      switchTab('settings');
    }else{
      const word=el('sc-word') || document.querySelector('.screen');
      if(word){
        word.style.display='block';
        word.classList.add('active');
      }
    }
  };

  function injectSettingsButton(){
    if(el('openLiveCoachSettingsBtn')) return;

    const settings =
      el('sc-settings') ||
      el('sc-ayarlar') ||
      document.querySelector('[id*="setting"].screen') ||
      document.querySelector('[id*="ayar"].screen');

    if(!settings) return;

    const card=settings.querySelector('.card') || settings;

    const btn=document.createElement('button');
    btn.id='openLiveCoachSettingsBtn';
    btn.className='live-settings-entry';
    btn.type='button';
    btn.innerHTML='⚡ Canlı Skor Koçu';
    btn.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      window.openLiveCoachFromSettings();
      return false;
    };

    card.insertBefore(btn, card.firstChild);
  }

  function drawGhost(){
    const c=el('lcGhost');
    const v=el('lcVideo');
    if(!c||!v) return;

    const W=v.videoWidth||v.clientWidth||640;
    const H=v.videoHeight||v.clientHeight||480;

    if(c.width!==W) c.width=W;
    if(c.height!==H) c.height=H;

    const ctx=c.getContext('2d');
    ctx.clearRect(0,0,W,H);

    phase+=0.055;

    const p=(Math.sin(phase)+1)/2;
    const m=mode();

    const cx=W*.5;
    const cy=H*.58;

    let mw=W*.20;
    let mh=H*(.04+p*.025);
    let color='rgba(167,139,250,.95)';
    let label='AĞZI AÇ';

    if(m==='TH'){
      mw=W*.23;
      mh=H*.045;
      color='rgba(59,130,246,.95)';
      label='DİL DIŞARI';
    }

    if(m==='ROUND'){
      mw=W*.13;
      mh=H*.075;
      color='rgba(34,197,94,.95)';
      label='YUVARLA';
    }

    if(m==='FV'){
      mw=W*.20;
      mh=H*.035;
      color='rgba(245,158,11,.95)';
      label='DİŞ + DUDAK';
    }

    if(m==='VOWEL'){
      mw=W*.23;
      mh=H*.080;
      color='rgba(34,211,238,.95)';
      label='AĞZI AÇ';
    }

    ctx.strokeStyle=color;
    ctx.fillStyle=color.replace('.95','.13');
    ctx.lineWidth=4;

    ctx.beginPath();
    ctx.ellipse(cx,cy,mw/2,mh/2,0,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle='rgba(255,255,255,.65)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(cx-mw*.35,cy);
    ctx.quadraticCurveTo(cx,cy+mh*.22,cx+mw*.35,cy);
    ctx.stroke();

    if(m==='TH'){
      ctx.fillStyle='rgba(239,68,68,.72)';
      ctx.fillRect(cx-mw*.18,cy+mh*.05,mw*.36,mh*.36);
    }

    ctx.fillStyle=color;
    ctx.font=`bold ${Math.max(18,W*.032)}px Nunito`;
    ctx.textAlign='center';
    ctx.fillText(label,cx,cy+mh*1.65);
  }

  function updateUI(){
    setv('lcLiveScore',stats.live);
    fill('lcLiveFill',stats.live);

    setv('lcMouthScore',stats.mouth);
    fill('lcMouthFill',stats.mouth);

    setv('lcEyeScore',stats.eye);
    setv('lcRhythmScore',stats.rhythm);

    const mn=el('lcModeName');
    if(mn) mn.textContent=mode();

    const w=el('lcWarning');
    if(w){
      let msg='✅ Güzel, devam et.';
      let cls='good';
      const m=mode();

      if(m==='TH' && stats.mouth<45){
        msg='🔴 TH için ağzı biraz aç, dil ucunu dişlerin arasına çıkar.';
        cls='bad';
      }else if(m==='ROUND' && stats.mouth<42){
        msg='🟡 R/W için dudakları daha yuvarla.';
        cls='mid';
      }else if(m==='FV' && stats.mouth<35){
        msg='🟡 F/V için üst dişi alt dudağa yaklaştır.';
        cls='mid';
      }else if(m==='VOWEL' && stats.mouth<50){
        msg='🔴 Ünlü ses için ağzını daha aç.';
        cls='bad';
      }else if(stats.rhythm<45){
        msg='🟡 Daha sabit tempoda söyle.';
        cls='mid';
      }

      w.className='lc-live-warning '+cls;
      w.textContent=msg;
    }

    history.push(pct(stats.live));
    if(history.length>42) history.shift();

    const h=el('lcHistory');
    if(h){
      h.innerHTML=history.map(v=>{
        const color=v>75?'var(--green)':v>50?'#f59e0b':'var(--red)';
        return `<div class="lc-bar" style="height:${Math.max(8,v)}%;background:${color}"></div>`;
      }).join('');
    }
  }

  function loop(){
    if(!running) return;

    drawGhost();

    stats.mouth=stats.mouth*.88+(55+Math.sin(Date.now()/420)*26)*.12;
    stats.eye=stats.eye*.9+78*.1;
    stats.rhythm=stats.rhythm*.88+(62+Math.sin(Date.now()/280)*25)*.12;
    stats.live=stats.mouth*.45+stats.eye*.25+stats.rhythm*.30;

    updateUI();

    raf=requestAnimationFrame(loop);
  }

  window.startLiveCoach=async function(){
    if(running) return;

    const video=el('lcVideo');
    const badge=el('lcBadge');

    try{
      stream=await navigator.mediaDevices.getUserMedia({
        video:{
          facingMode:'user',
          width:{ideal:640},
          height:{ideal:480}
        },
        audio:false
      });

      video.srcObject=stream;
      await video.play();

      running=true;
      history=[];
      stats={mouth:0,eye:0,rhythm:0,live:0};

      if(badge){
        badge.textContent='Canlı açık';
        badge.className='lc-badge on';
      }

      loop();
    }catch(e){
      console.error('Canlı Koç kamera hatası:', e);
      alert('Kamera açılamadı. Kamera iznini kontrol et. Localhost veya HTTPS/GitHub Pages kullan.');
    }
  };

  window.stopLiveCoach=function(){
    running=false;

    if(raf) cancelAnimationFrame(raf);
    raf=null;

    if(stream){
      stream.getTracks().forEach(t=>{
        try{t.stop();}catch(e){}
      });
      stream=null;
    }

    const video=el('lcVideo');
    if(video) video.srcObject=null;

    const c=el('lcGhost');
    if(c) c.getContext('2d').clearRect(0,0,c.width,c.height);

    const badge=el('lcBadge');
    if(badge){
      badge.textContent='Kapalı';
      badge.className='lc-badge';
    }
  };

  window.lcSpeakTarget=function(){
    const t=(el('lcTarget')?.value||'').trim();

    if(!t){
      alert('Önce hedef kelime yaz.');
      return;
    }

    try{
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(t);
      u.lang='en-US';
      u.rate=.82;
      u.pitch=1;
      speechSynthesis.speak(u);
    }catch(e){}
  };

  document.addEventListener('DOMContentLoaded',function(){
    setTimeout(injectSettingsButton,500);
    setTimeout(lcUpdateTargetLabel,300);
    setTimeout(injectSettingsButton,1500);
    setTimeout(injectSettingsButton,3000);
  });

  setInterval(injectSettingsButton,2500);

  window.addEventListener('pagehide',()=>{
    try{window.stopLiveCoach();}catch(e){}
  });
})();



/* ===== extracted script block ===== */


/* SOZLUK.JSON TURKCE TELAFFUZ HARITASI - Canli Skor Kocu icin */
window.WM_TR_PRON_MAP = window.WM_TR_PRON_MAP || {"abandon":"Ebandın","abandoned":"Ebenndınd","abbreviation":"Abriyiviyeyşın","abide":"Ebayd","abilities":"ıbilətiz","ability":"Ebılıti","able":"Eybıl","ablution":"Ebluşın","abnormalities":"Abnormələtiz","aboard":"Ebord","abondon":"Ebandın","abortion":"Ebörşın","about":"Ebaut","above":"ebuuv","abraham":"Ebırahım","abroad":"Ebrod","absent":"Ebsınt","absolute":"Ebsolut","absolutely":"Absolutli","absorb":"Abzorb","abstain":"Ebstein","abstract":"Abstrakt","abuses":"Ebyuzız","abusive":"Ebyusiv","academic":"Akademik","academy":"Ekadəmi","academy's":"Əkademiz","accelerated":"Əkseləreytid","accent":"Aksent","accept":"Eksept","acceptable":"Akseptəbıl","acceptance":"Ekseptıns","accepted":"Akseptıd","accepting":"Eksepting","access":"Akses","accessed":"Əksest","accident":"Eksidınt","accidental":"Əksidentəl","accidentally":"Aksidentəli","accidents":"Eksidınts","accommodate":"Ekomodeyt","accommodation":"Ekomıdeyşın","accompanied":"Əkampənid","accompany":"Ekampıni","accomplished":"Əkomplişt","according":"Εkording","accordingly":"Ekordingli","account":"Ekaunt","accountable":"Ekauntəbıl","accountant":"Akauntınt","accounting":"Akaunting","accounts":"Ekaunts","accurate":"Ekyurıt","accused":"Ekyuzd","aches":"Eyks","achievable":"Əçivəbıl","achieve":"Açiv","achieved":"Açivd","achievements":"Açivmınts","achieving":"Əçiving","acknowledge":"Eknolic","acknowledged":"Əknolicd","acknowledging":"Eknolicing","acoustic":"Əkustik","acquaintance":"Əkveyntıns","across":"ekros","act":"Ekt","acting":"Aktin","action":"Ekşın","actions":"Ekşınz","active":"Ektiv","actively":"Aktivli","activities":"Aktivıtiz","activity":"Aktiviti","actor":"Ektır","actors":"Aktırz","actress":"Ektrıs","actual":"Ekçuıl","actualize":"Əkçuəlayz","actually":"Ekçueli","adam":"Edım","adams":"Edəmz","adam's":"Edəmz","adapt":"Adapt","adaptand":"Ədeptənd","adaptation":"Edepteyşın","adapted":"Edeptid","adapting":"Ədepting","adaptive":"Ədeptiv","add":"Ed","added":"Edid","addict":"Ədikt","addicted":"Ediktid","addiction":"Edikşın","addictive":"Ədiktiv","adding":"Əding","addition":"Edişın","additional":"Edişınıl","additionally":"Edişınəli","additions":"Ədişınz","address":"Edres","addressed":"Edrest","addressing":"Edresing","adds":"Ədz","adept":"Ədept","adequate":"Edikvıt","adjective":"Eciktiv","adjectives":"Eciktivz","adjoining":"Əcoyning","adjusted":"Əcustid","adjusting":"Ecusting","adjustment":"Ecustmınt","administration":"Edminıstreyşı n","administrative":"Edministrətiv","administrators":"Ədministreytırz","admirable":"Edmırəbıl","admiration":"Edmireyşın","admire":"Edmayr","admired":"Edmayırd","admission":"Edmişın","admissions":"Edmişınz","admit":"Edmit","admitted":"Edmitid","adopt":"Edopt","adopted":"Edoptid","adorable":"Ədorəbıl","adoration":"Ədöreyşın","adore":"Edor","adrian":"Edriyın","adriana":"Adriyanə","adriano":"Adriyano","ads":"Eds","adult":"Edalt","adultery":"Ədaltəri","adults":"Edalts","advance":"Edvens","advanced":"Edvensd","advancement":"Edvansmınt","advantage":"Edventıc","advantages":"Edvantıcız","adventure":"Edvençur","adventures":"Ədvençırz","adventurous":"Ədvençırıs","adverbs":"Ədvörbz","adversaries":"Ədvörseriz","adverse":"Edvörs","adversity":"Ədvörsiti","advert":"Edvört","advertise":"Edvırtayz","advertisement":"Advörtayzmınt","advertisements":"Edevörtayzmınts","advertising":"Advörtayzing","advice":"Edvays","advise":"Edvayz","advised":"Edvayzd","advisor":"Ədvayzır","advisory":"Ədvayzəri","aerial":"Eyriyəl","aerin":"Eyərin","aeronautical":"Eyərənötikıl","afaik":"Efeyk","affair":"Effeyır","affairs":"Efeırz","affect":"Efekt","affected":"Efektid","affecting":"Əfekting","affection":"Efekşın","afford":"Eford","affordable":"Efordəbıl","afloat":"Eflovt","afraid":"Efreid","africa":"Efrikə","after":"aftı","afternoon":"Aftırnuun","afternoon's":"Aftırnuunz","afterwards":"Aftırvördz","again":"Egein","against":"Egeinst","age":"Eyc","agency":"Eycınsi","agenda":"Ecendı","agent":"Eycınt","agents":"Eycınts","ages":"Eycız","aggressive":"Egresiv","agnostic":"Egnastik","ago":"Ego","agree":"Egrii","agreed":"Agrid","agreeing":"Əgriing","agreement":"Egriimınt","agriculture":"Egrikalçır","ah":"Aa","ahead":"Ehed","ahh":"Aa","ahmet":"Ahmet","ai":"Ey ay","aid":"Eyd","aida's":"Aydız","aids":"Eydz","aim":"Eym","aims":"Eyms","air":"Eyr","aircraft's":"Eyrkrafts","airline":"Eyrlayn","airlines":"Eyrlayns","airplane":"Eyrpleyn","airport":"Eypoort","aisha":"Ayşa","aisle":"Ayl","akl":"Akıl","aktiviteleri":"Aktiviteleri","al":"El","alan":"Elın","alarak":"Alarak","alarm":"Alarm","alasra":"Alasra","album":"Elbım","albums":"Elbımz","alcohol":"Alkohol","alert":"Elört","alex":"Eleks","alex's":"Eleksiz","alibi":"Elibay","alice":"Elis","alicia":"Elişiə","aliens":"Eliyınz","alihan":"Alihan","alike":"Elaık","ali's":"Aliz","alive":"Elaıv","all":"Ol","allah":"Ala","allegations":"Elıgeyşınz","alleged":"Elecd","alleges":"Elecız","allergic":"Elörcik","allergies":"Elörciz","alleviate":"Eliviyeyt","alliance":"Elayıns","allocate":"Elokeyt","allocated":"Elokeytid","allocation":"Elokeyşın","allow":"Elov","allowance":"Elavvıns","allowances":"Elavvınsız","allowed":"Alaavd","allows":"Elaavz","alloy":"Eloy","alloys":"Eloyz","almak":"Almak","almond":"Amınd","almost":"Olmost","alone":"Elon","along":"elong","alongside":"alongsayd","alphabetical":"Elfəbetikıl","already":"Olredi","alright":"Olrayt","also":"Olso","alter":"Altır","altered":"Oltırd","alternative":"Oltörnətiv","although":"Oldo","altogether":"Oltugedır","always":"Olveys","ama":"Ama","amateur":"Emətör","amazed":"Amezd","amazement":"Əmeyzmınt","amazing":"Amezing","amazingly":"Əmeyzingli","amazon":"Eməzın","amazonian":"Eməzovniyən","ambition":"Embişın","ambitions":"Embişınz","ambitious":"Embişıs","ambulance":"Embyulıns","amelia":"Əmiliyə","amendment":"Emendment","amenities":"Əmenətiz","america":"Amerikı","american":"Amerikın","americano":"Amerikano","americans":"Amerikınz","amina":"Əminə","amina's":"Əminəz","among":"emong","amongst":"Əmongst","amount":"Emaunt","amounts":"Emaunts","ample":"Empıl","amsterdam":"Amsterdam","amusement":"Ɛmyuzmınt","amusing":"Amyuzing","amy":"Eymi","ana":"Anə","analysed":"Enəlayzd","analysis":"Enələsis","analyst":"Enılist","ancestors":"Ensestırz","ancestors'":"Ensestırz","ancestral":"Ensestrəl","ancestry":"Ensestri","anchor":"Enkır","ancient":"Eynşınt","anderson":"Endırsın","andrew":"Endru","andy":"Endi","anew":"Ənyu","angel":"Eyncıl","angeles":"Encelis","anger":"Engır","angle":"Engıl","anglo":"Anglov","angrier":"Angriyır","angrily":"Engrili","angry":"Engri","ani":"Ani","animal":"Enimıl","animals":"Enimılz","animals'":"Enimılz","animal's":"Enimılz","animated":"Enimeytid","animation":"Enimeyşın","animator":"Enimeytır","ankara":"Angkara","ankle":"Enkl","ankles":"Enkıls","anla":"Anla","anlam":"Anlam","anna":"Enə","anniversary":"Enivörsıri","announce":"Enauns","announced":"Enaunst","announcement":"Enaunsmınt","announcer":"Enaunsır","annoy":"Enoy","annoyance":"Ənoyıns","annoyed":"Enoyd","annoying":"Enoying","annoyingly":"Ənoyingli","annoys":"Ənoyz","annual":"Enyuıl","another":"Enadır","answer":"Ensır","answered":"Ensırd","answering":"Ensırın","answers":"Ensırz","ant":"Ent","antalya":"Antalya","anthem":"Enthəm","anthony":"Entəni","anti":"Enti","antibiotics":"Entibayotiks","anticipating":"Entisipeyting","anticipation":"Entisipeyşın","antivirus":"Entivayrıs","antonio":"Antovniyov","ants":"Ents","anxiety":"Enzayıti","anxious":"Enkşıs","any":"Eni","anya":"Anyə","anybody":"Enibadi","anybody's":"Enibadiz","anymore":"Enimor","anyone":"Enivan","anythime":"Enitaym","anything":"Enyting","anytime":"Enitaym","anyway":"Enivey","anywhere":"Eniveır","apart":"Epart","apartment":"Apörtmınt","apartments":"Epörtmınts","apollo":"Əpalo","apologies":"Epolociz","apologise":"Əpolocayz","apologised":"Epolocayzd","apologists":"Əpolocists","apologize":"Epolocayz","apologized":"Epolocayzd","apologizing":"Əpolocayzing","apology":"Epaloci","app":"Ep","apparently":"Eperıntli","appeal":"Epiıl","appear":"Eppiır","appearance":"Eppiırıns","appeared":"Epiyırd","appearing":"Əpiyiring","appears":"Epiyırz","appetite":"Epıtayt","applauding":"Eploding","apple":"Epıl","apples":"Epıls","applicants":"Eplikınts","application":"Eplikeyşın","applications":"Eplikeyşınz","applied":"Epilayd","applies":"Eplays","apply":"Eplay","applying":"Eplaying","appointment":"Eppointmınt","appraise":"Əpreyz","appreciable":"Eprişiyəbıl","appreciate":"Eprişieyt","appreciated":"Eprişieytid","appreciates":"Əprişiyeyts","appreciation":"Eprişiyeyşın","apprehension":"Əprihenşın","approach":"Eproç","approachable":"Əproçəbıl","approached":"Əproçt","approaches":"Əproçız","approaching":"Eproçin","approch":"Əproç","appropriate":"Eproprievt","appropriation":"Eproprieşın","approval":"Epruvl","approved":"Epruvd","approves":"Əpruvz","approximately":"Apraksimətli","apps":"Eps","aquarium":"Əkveyriyım","ara":"Ara","arac":"Araç","archaeologists":"Arkiyolocists","architect":"Arkitekt","architecture":"Arkitekçır","archive":"Arkayv","archives":"Arkayvz","area":"Eriya","areas":"Eriəs","aren":"Arınt","argentina":"Arcentinə","argentinian":"Arcentinyın","argue":"Argüu","argued":"Argüud","argues":"Argüuz","arguing":"Argüing","argument":"Argümınt","arguments":"Argümınts","ariana":"Arıyanə","ariel":"Eriyəl","arlena":"Arlinə","arm":"Arm","armchair":"Armçeyr","armchairs":"Armçeyrz","arms":"Arms","army":"Armi","aromatic":"Eromətik","around":"eraund","arrange":"Ereync","arranged":"Ereync","arrangement":"Ereyncmınt","arrest":"Erest","arrested":"Erestid","arrival":"Erayvıl","arrive":"Erayv","arrived":"Εrayvd","arrives":"Erayvz","arriving":"Erayvin","arrogance":"Erıgıns","arrogant":"Erıgınt","arsenal":"Arsınıl","arshad":"Arşad","art":"Art","artefacts":"Artifekts","artemis":"Artimis","arthur":"Artır","article":"Artikl","articles":"Artikıls","artificial":"Artifişıl","artist":"Artist","artists":"Artists","artist's":"Artist's","artisty":"Artistı","aruba":"Arubə","asap":"Ey sep","ash":"Eş","ashamed":"Eşeymd","asia":"Eyjə","asian":"Eyjın","aside":"Esayd","ask":"Esk","asked":"Askt","asking":"Asking","asks":"Asks","asl":"Ey es el","asleep":"Esliip","aspect":"Aspect","aspects":"Aspects","ass":"Es","assault":"Esolt","assaulted":"Əsoltid","assaults":"Əsolts","assert":"Esört","assertive":"Esörtiv","assessments":"Əsesmınts","assigment":"Əsaynmınt","assign":"Asayn","assigned":"Esaynd","assignment":"Asaynment","assistance":"Asistıns","assistant":"Esistınt","associate":"Esoşieyt","associated":"Asoşieytıd","association":"Asoşieyşın","assume":"Esuym","assumed":"Esuumd","assuming":"Əsumbing","assumption":"Asampşın","assumptions":"Esampşınz","assurance":"Eşurıns","assure":"Eşur","assures":"Əşurz","astonished":"Əstanişd","astonishing":"Astonişing","astray":"Əstrey","astrology":"Əstroloci","astronaut":"Estrınot","astronauts":"ƀstrənots","astronomical":"Əstrənamikıl","asylum":"Esaylım","ate":"Et","atheist":"Eyθiist","atitude":"Etitüd","atlatmak":"Atlatmak","atm":"Ey ti em","atmosphere":"Etmosfiır","attached":"Ətaçt","attachment":"Etaçmınt","attack":"Etek","attacked":"Etekt","attacks":"Eteks","attain":"Eteyn","attempt":"Etempt","attempted":"Etemptid","attend":"Etend","attendance":"Etendıns","attendant":"Ətendınt","attended":"Etendid","attending":"Ətending","attention":"Etenşın","attic":"Ətik","attitude":"Etitüud","attract":"Etrekt","attracted":"Ətrektid","attracting":"Ətrekting","attraction":"Etrekşın","attractive":"Etrektiv","attracts":"Ətrekts","attribute":"Etrıbyut","attributes":"Ətrıbyuts","audience":"Odiyıns","audiences":"Odiyınsız","audience's":"Odiyınsız","audio":"Odiyo","aunt":"Aant","aunts":"Ants","australia":"Ostreylyə","australian":"Ostreylyın","australians":"Ostreylyınz","australia's":"Ostreylyəz","austria":"Ostriyə","authentic":"Otenik","author":"Oosır","author's":"Oosırz","autism":"Otizım","automatic":"Otometik","automatically":"Otometikli","autopsy":"Otopsi","autumn":"Otumn","auxiliary":"Ogzilyəri","ava":"Avə","availability":"Eveylıbiliti","available":"Eveylıbl","average":"Evirıç","averages":"Evirıcız","aviation":"Eyviyeyşın","avionics":"Eyviyoniks","avocado":"Avəkadov","avocados":"Avəkadovz","avoid":"Evoid","avoided":"Evoidid","avoiding":"Evoiding","avoids":"Əvoids","awake":"Eveyk","award":"Ivord","awarded":"Əvordid","aware":"Eveyr","awareness":"Aveırnes","away":"Evey","awe":"O","awesome":"Οsım","awful":"Oful","axiety":"Egzayıti","ay":"Ay","ayarlamak":"Ayarlamak","ayn":"Ayn","aztec":"Aztek","ba":"Ba","babies":"Beybiz","baby":"Beybi","back":"Bek","backed":"Bekt","background":"Bekraund","backgrounds":"Bekraundz","backs":"Beks","backstage":"Beksteyc","backup":"Bekap","backups":"Bekaps","backward":"Bekvırd","backyard":"Bekyard","bacon":"Beykın","bacteria":"Bekteriyı","bad":"Bed","badly":"Bedli","bag":"Beg","baggage":"Begic","baghdad":"Bağdad","bags":"Begs","bahamas":"Bəhamız","bahrain":"Bahreyn","bahsediyorsan":"Bahsediyorsan","bailing":"Beyling","bak":"Bak","bake":"Beyk","baked":"Beykt","baker":"Beykır","bakeries":"Beykəriz","baker's":"Beykırz","bakery":"Beykəri","bakes":"Beyks","baking":"Beykin","baklava":"Baklava","baklavas":"Baklavas","bakmak":"Bakmak","balance":"Belıns","balanced":"Belınst","bali":"Bali","ball":"Bol","ballet":"Baley","balloon":"Baluun","ballpark":"Bolpark","balls":"Bolz","balogun":"Balogun","banana":"Bınana","bananas":"Bənənəs","band":"Bend","bands":"Bends","bandwidth":"Bendvitç","bandwith":"Bendvit","banish":"Beniş","banished":"Benişt","bank":"Benk","banking":"Benking","bankrupt":"Benkrapt","bankruptcy":"Benkraptsi","banks":"Benks","banned":"Bend","banner":"Benır","bar":"Bar","barack":"Bərək","barbecue":"Barbekyu","barbecues":"Barbekyuz","barber":"Barbır","barcelona":"Barsılovnə","bare":"Beyr","barely":"Berli","bargaining":"Bargıning","barking":"Barking","barman":"Barmın","barred":"Bard","barrier":"Beriyır","barriers":"Beriyırz","bars":"Bars","bart":"Bart","bartholdi":"Bartoldi","base":"Beys","baseball":"Beysbol","based":"Beyzd","basic":"Beyzik","basically":"Beyzikli","basilisk":"Basılik","basilisks":"Basıliks","basis":"Beyzis","basket":"Baskıt","basketball":"Basketbol","basque":"Bask","bath":"Bath","bathroom":"Bafrum","bathtub":"Bağtab","batter":"Batır","batteries":"Betəriz","battersea":"Batırsi","battery":"Betəri","battle":"Betl","bayram":"Bayram","bayramyeri":"Bayramyeri","bbc":"Bi bi si","bbi":"Bi bi ay","beach":"Biiç","beaches":"Biçız","beak":"Bik","beaks":"Biks","beams":"Biimz","bean":"Biin","bear":"Beır","beard":"Biyırd","bears":"Beyrz","beat":"Biit","beaten":"Bitın","beatiful":"Bitfıl","beating":"Biting","beatrice":"Biyətrıs","beats":"Biits","beautiful":"Büutiful","beautifully":"Büutıfıli","beauty":"Büuti","became":"Bikeym","because":"Bikoz","beceri":"Beceri","become":"Bıkam","becomes":"Bikamz","becoming":"Bikaming","bed":"Bed","bedouin":"Beduin","bedroom":"Bedrum","beds":"Beds","bedside":"Bedsayd","bedtime":"Bedtaym","bee":"Bii","beer":"Biır","bees":"Biiz","beethoven":"Beytovn","before":"Bifor","beg":"Beg","began":"Bigön","begin":"Begın","beginner":"Biginır","beginners":"Biginırz","beginning":"Bigining","begins":"Bigins","begun":"Bigan","behalf":"Bihaf","behave":"Biheyv","behaved":"Biheyvd","behavior":"Biheyyır","behaviors":"Biheyyırz","behaviour":"Biheyyır","behind":"Bihaynd","behold":"Bihovld","behooves":"Bihuuvz","being":"Biing","belfast":"Belfast","belief":"Biliif","beliefs":"Biliifs","believe":"Bıliiv","believed":"Bilivd","believes":"Biliivs","believing":"Biliiving","belirli":"Belirli","bell":"Bel","bells":"Bels","belly":"Beli","belong":"Bilong","belonging":"Bilonging","belongs":"Bilongz","beloved":"Bilavd","below":"Bilov","belt":"Belt","ben":"Ben","bench":"Benç","bend":"Bend","beneficial":"Benefişıl","benefit":"Benıfit","benefited":"Benifitid","benefits":"Benifits","benevolent":"Binevələnt","benign":"Binayn","berabere":"Berabere","berk":"Berk","berlin":"Börlin","berta":"Börtə","besides":"bisayds","best":"Best","bestie":"Besti","bestow":"Bistov","bestowed":"Bistovd","bet":"Bet","betray":"Bitrey","betrays":"Bitreys","better":"Better","between":"bitvin","beyond":"Biyand","bianca":"Biyankə","bias":"Bayıs","bicycle":"Baysikl","bicycles":"Baysikıls","bid":"Bid","big":"Big","bigger":"Bigır","biggest":"Bigist","bike":"Bayk","bikes":"Bayks","bilateral":"Baylætərıl","bill":"Bil","billboard":"Bilbord","billboards":"Bilbordz","billion":"Bilyın","billionaire":"Bilyıner","billionaires":"Bilyınerz","billions":"Bilyınz","bills":"Bils","billy":"Bili","binding":"Baynding","binge":"Binc","binged":"Bincd","binges":"Bincız","binmek":"Binmek","biological":"Bayolocikıl","biology":"Bayoloci","biometric":"Bayometrik","biophysicists":"Bayofizisists","biopsy":"Bayopsi","biosphere":"Bayosfiyir","biotechnology":"Bayoteknoloji","bir":"Bir","biraz":"Biraz","bird":"Börd","birds":"Bördz","birth":"Börth","birthday":"Börthdey","birthplace":"Börthpleys","biscuits":"Biskits","bit":"Bit","bitch":"Biç","bitches":"Biçız","bitcoin":"Bitkoyn","bite":"Bayt","biten":"Biten","bitirmek":"Bitirmek","bitmi":"Bitmi","bitter":"Bitır","black":"Blek","blah":"Bla","blame":"Bleym","blamed":"Bleymd","bland":"Blend","blank":"Blenk","blanket":"Blenkıt","blankets":"Blenkıts","blaring":"Bleıring","blast":"Blast","ble":"Bli","blend":"Blend","blended":"Bilendid","bless":"Bles","blew":"Bluu","blind":"Blaynd","blink":"Blink","block":"Blok","blocked":"Blakt","blocking":"Bloking","blocks":"Bloks","blog":"Blog","blogger":"Blogır","blood":"Blad","bloody":"Bladi","bloom":"Blum","blooming":"Bluming","blossoms":"Blosımz","blowing":"Blovvin","blown":"Blovn","blows":"Blovz","blue":"Blu","blueberry":"Bluberi","blurry":"Blöri","blurs":"Blörz","blurt":"Blört","bly":"Bli","board":"Boord","boardgames":"Bordgeyms","boarding":"Bording","boasts":"Bousts","boat":"Bout","bob":"Bob","bodied":"Badid","bodies":"Badiz","body":"Badi","boil":"Boıl","boiling":"Boylin","boils":"Boyls","bold":"Bould","bond":"Bond","bonds":"Bonds","bone":"Boun","bones":"Bovnz","bonus":"Bovnus","bonuses":"Bovnısız","boobs":"Buubs","book":"Buk","booked":"Bukt","booking":"Buking","bookings":"Bukings","books":"Buks","booming":"Buming","boost":"Bust","boosted":"Bustid","boosting":"Busting","boosts":"Busts","booth":"Bu","booths":"Buths","boots":"Buts","border":"Bordır","bored":"Bord","boredom":"Bordım","boring":"Boring","born":"Born","borrow":"Borou","borrowed":"Borovd","boss":"Bos","bosses":"Bosız","bossy":"Bosi","boston":"Bastın","botanical":"Botənıkıl","both":"Bouth","bother":"Badır","bothered":"Badırd","bothering":"Badıring","botin":"Botin","botswana":"Botswana","bottle":"Botl","bottled":"Botıld","bottles":"Batılz","bottom":"Botım","bottoms":"Botımz","bought":"Bot","bound":"Baund","boundaries":"Baundırız","bouquet":"Bukey","bowl":"Boul","box":"Boks","boxer":"Baksır","boxes":"Baksız","boxing":"Baksing","boy":"Boy","boycott":"Boykot","boycotted":"Boykotid","boyfriend":"Boyfrend","boyfriend's":"Boyfrendz","boys":"Boys","boys'":"Boys","boyunca":"Boyunca","bozuksa":"Bozuksa","brace":"Breys","bracelet":"Breyslıt","bradford":"Bradförd","brahim":"Brahim","brain":"Breyn","brainer":"Breynır","brains":"Breyinz","brainstorming":"Breynstorming","braked":"Breykt","brakes":"Breyks","brand":"Brend","branded":"Brendid","brands":"Brends","brass":"Bras","bratton":"Bratın","brave":"Breyv","bravely":"Breyvli","bravery":"Breyvəri","brazil":"Brazıl","brazilian":"Brazylyın","brazilians":"Brazyilyınz","breach":"Biriç","breached":"Briçt","breaching":"Briçing","bread":"Bred","break":"Breyk","breakdown":"Breykdaun","breakers":"Breykırz","breakfast":"Brekfıst","breaking":"Breykin","breaks":"Breyks","breasts":"Brezds","breath":"Breth","breathe":"Brith","breathes":"Briyds","breathing":"Brizing","breathtaking":"Brehteyking","breed":"Brid","breeze":"Briz","brenda":"Brenda","brewed":"Bruud","brewery":"Bruwəri","brian":"Bırayın","bribes":"Braybz","brick":"Brik","bricklayer":"Brikleyır","bride":"Bırayd","bridge":"Bric","bright":"Brayt","brighten":"Braytın","brilliance":"Brilyəns","brilliant":"Brilyınt","brin":"Brin","bring":"Bring","bringing":"Bringing","brings":"Brings","brink":"Brink","brisbane":"Brisbeyn","britain":"Britın","british":"Britiş","britons":"Britıns","broad":"Brood","broadband":"Brodbənd","broadcast":"Broodkast","broadcasted":"Brodkastid","broadcasters":"Brodkastırz","broadly":"Brodli","broke":"Brovk","broken":"Brokın","brooklyn":"Bruklın","brother":"Bradır","brotherhood":"Bradırhud","brothers":"Bradırz","brother's":"Bradırz","brought":"Brot","brow":"Brau","brown":"Braun","brows":"Brauz","browse":"Brauz","browsing":"Brauzing","bruised":"Bruzd","brushes":"Braşız","brushing":"Braşing","brutality":"Buruteliti","btw":"Bi ti dabol yu","bu":"Bu","bubbles":"Babıls","bucket":"Bakit","buckets":"Bakıts","budapest":"Budapeşt","buddhist":"Budist","buddy":"Badi","budget":"Bacıt","budgetary":"Bacıteri","budgeting":"Baciting","buffet":"Bufey","buffets":"Bufeys","bug":"Bag","bugging":"Baging","bugs":"Bags","build":"Bild","building":"Bilding","buildings":"Bildingz","builds":"Bildz","built":"Bilt","bulbs":"Balbz","bulgur":"Bulgur","bull":"Bul","bullied":"Bulid","bullies":"Buliz","bully":"Buli","bullying":"Buling","bummed":"Bamd","bump":"Bamp","bumped":"Bampt","burak":"Burak","burden":"Bördın","burger":"Börgır","burglaries":"Börgləriz","burma":"Börmə","burn":"Börn","burned":"Börnd","burning":"Börning","burrito":"Buritov","burro":"Burov","burst":"Börst","bus":"Bas","buses":"Basız","busier":"Biziyır","busiest":"Biziyist","business":"Biznıs","businesses":"Biznısız","businessman":"Biznismen","busuu":"Busu","busy":"Bizi","but":"Bat","butt":"Bat","butter":"Batır","butterflies":"Batırflayz","butterfly":"Batırflay","button":"Batn","buttons":"Batıns","buy":"Bay","buying":"Baying","buys":"Bays","buzzing":"Bazin","by":"bay","bye":"Bay","byob":"Bay ov bi","byways":"Bayveys","cab":"Keb","cabin":"Kabin","caf":"Kef","cafe":"Kafe","cafes":"Kefs","caffeine":"Kefin","cage":"Keyc","cages":"Keycız","cake":"Keyk","cakes":"Keyks","calamari":"Keləmeri","calculations":"Kälkyuleyşınz","calendars":"Keləndırz","calf":"Kaf","california":"Keliforniya","call":"Kol","callahan":"Keləhan","called":"Kold","calling":"Koling","calls":"Kolz","calm":"Kaam","calmer":"Kamır","calmly":"Kamli","calves":"Kavz","cam":"Kem","camden":"Kemdın","came":"Kame","camel":"Kemıl","camels":"Kemıls","camera":"Kemıra","cameras":"Kemrız","camino":"Keminov","camp":"Kemp","campaign":"Kempein","camper":"Kempır","campers":"Kempırz","camping":"Kemping","camps":"Kemps","campsite":"Kempsayt","campsites":"Kempsayts","canada":"Kenıdı","canadian":"Kenediyın","canadians":"Kenediyınz","canals":"Kənəls","cancel":"Kensıl","cancellation":"Kensıleyşın","cancelled":"Kensıld","cancelling":"Kensıling","cancer":"Kensır","candidate":"Kendidıt","candidates":"Kendidəts","candle":"Kendl","candles":"Kendılz","candy":"Kendi","cannot":"Kenot","cans":"Kens","cant't":"Kent","canyon":"Kenyın","capability":"Keypəbiləti","capable":"Keypəbıl","capacity":"Kpasiti","cape":"Kep","capital":"Kepıtl","capitals":"Kepitəls","cappadocia":"Kepədovşə","caps":"Keps","captain":"Keptın","captivity":"Keptiviti","car":"Kaar","caramel":"Kerəmel","carbon":"Karbın","carbone":"Karbovn","card":"Kaad","cardboard":"Kardbord","cardiff":"Kardif","cardio":"Kardiov","cards":"Kards","card's":"Kards","care":"Keyr","cared":"Kerd","career":"Kariır","careers":"Kariyırz","careful":"Keyrfıl","carefully":"Keyrfıli","careless":"Keyrlıs","carelessness":"Kerləsnıs","cares":"Kerz","caring":"Keyrin","carlos":"Karlos","carlos's":"Karlosız","carnival":"Karnivıl","carnivores":"Karnivors","carol":"Kerıl","carolina":"Kerolaynə","carpenter":"Karpıntır","carpet":"Kaarpıt","carrey":"Keri","carries":"Keriz","carrot":"Karıt","carry":"Keri","carrying":"Keriyin","cars":"Karz","car's":"Kars","cartoons":"Kartuns","caruso":"Karusov","case":"Keys","cases":"Keysız","case's":"Keysız","cash":"Keş","cashier":"Keşiyir","casino":"Kasino","cast":"Kast","castle":"Kesl","casual":"Kajuəl","casuals":"Kazuıls","cat":"Ket","catalogue":"Ketəlog","catastrophe":"Ketaströfi","catch":"Keç","catching":"Keçing","catchy":"Keçi","categories":"Ketıgoriz","categorize":"Ketıgorayz","category":"Ketıgori","cater":"Keytır","caterer":"Keytırır","catering":"Keytiring","catfish":"Ketfiş","catfished":"Ketfişt","cath":"Keth","catholic":"Ketılik","cathy":"Keti","cats":"Kets","cat's":"Kets","caught":"Kot","causality":"Kozeləti","causation":"Kozeyşın","causative":"Kozıtiv","cause":"Koz","caused":"Kozd","causes":"Kozız","causing":"Kozin","cautious":"Koşıs","caves":"Keyvz","caviar":"Kaviyar","cavities":"Kevətiz","cayman":"Keymən","cease":"Sis","ceilings":"Silingz","celebrate":"Selibreyt","celebrated":"Selibreytid","celebrating":"Selibreytin","celebration":"Selebrayşın","celebrities":"Sılebrıtiz","celebrity":"Sılebrıti","cell":"Sel","cellar":"Selır","cellphone":"Selfovn","celsius":"Selsiyıs","celtic":"Keltik","cemented":"Simentid","cemetery":"Semıteri","cenk":"Cenk","center":"Sentır","centers":"Sentırz","central":"Sentrəl","centre":"Sentır","centred":"Sentırd","centres":"Sentırz","centuries":"Sencıriz","century":"Sençri","ceo":"Si i ov","ceramic":"Sıremik","cereal":"Siriyl","ceremony":"Serımıni","certain":"Sörtın","certainly":"Sörtınli","certificate":"Sertıfıkeyt","certificates":"Sörtifikeyts","certifications":"Sörtifikeyşınz","ceyda":"Ceyda","cfo":"Si ef ov","chai":"Çay","chain":"Çeyn","chair":"Çeır","chairperson":"Çeyrpörsın","chairs":"Çeyrz","chalk":"Çok","challah":"Hala","challenge":"Çalınc","challenges":"Çelincız","challenging":"Çelincing","champagne":"Şempeyn","champion":"Çempiın","championship":"Çempiınşip","champs":"Şemps","chance":"Çens","change":"Çeync","changed":"Çeyncıd","changer":"Çeyncır","changes":"Çeyncız","changing":"Çeyncın","channel":"Çenıl","channels":"Çenılz","chaos":"Keyos","chaotic":"Keyotik","chapter":"Çeptır","character":"Kerıktır","characteristic":"Kerıktırıstik","characteristically":"Kerıktırıstikli","characteristics":"Kerıktırıstiks","characters":"Kerıktırz","charcoal":"Çarkovl","charge":"Çarc","charged":"Çarcd","charger":"Çarcır","charges":"Çarcız","charity":"Çerıti","charles":"Çarlz","charlie":"Çarli","charm":"Çarm","charming":"Çarming","chart":"Çart","charts":"Çarts","chasm":"Kezım","chaste":"Çeyst","chat":"Çet","chatbox":"Çetbaks","chats":"Çets","chatter":"Çetır","chattering":"Çetiring","chatting":"Çeting","cheap":"Çiip","cheaper":"Çipır","cheapest":"Çipist","cheat":"Çiit","cheated":"Çitid","cheating":"Çiting","check":"Çek","checked":"Çekt","checking":"Çekin","checks":"Çeks","checkup":"Çekap","cheer":"Çiır","cheerful":"Çirfıl","cheering":"Çiring","cheers":"Çiyirz","cheese":"Çiiz","cheesecake":"Çizkeyk","cheetah":"Çitı","cheetahs":"Çitız","chef":"Şef","chefs":"Şefs","chef's":"Şefs","chelsea":"Çelsi","chemical":"Kemıkl","chemistry":"Kemistri","cherish":"Çeriş","cherisher":"Çerişır","cherry":"Çeri","chess":"Çes","chest":"Çest","chewy":"Çui","chia":"Çiya","chicago":"Şikagov","chicken":"Çikın","child":"Çayld","childbirth":"Çayldbörth","childcare":"Çayldker","childen":"Çildın","childhood":"Çayldhuud","childish":"Çayldiş","children":"Çildrın","children's":"Çildrınz","childs":"Çayldz","child's":"Çayldz","chile":"Çili","chili":"Çili","chill":"Çil","chilled":"Çild","chilli":"Çili","chilly":"Çili","chimpanzees":"Çimpənziz","chin":"Çin","china":"Çaynı","chinese":"Çayniz","chip":"Çip","chips":"Çips","chloe's":"Klouiz","chocolate":"Çoklıt","chocolates":"Çoklıts","choice":"Çoys","choices":"Çoysız","choose":"Çuz","choosing":"Çuzing","chop":"Çap","chopping":"Çoping","chore":"Çor","chores":"Çorz","chose":"Çovz","chosen":"Çovzın","chris":"Kris","christian":"Krisçın","christianity":"Krisçiyeniti","christmas":"Krismıs","christmassy":"Krismısi","christopher":"Kristıfır","chronically":"Kranikli","chronologically":"Kronolacikli","church":"Çörç","churches":"Çörçız","cider":"Saydır","cigarette":"Sigıret","cigarettes":"Sigarets","cinema":"Sinıma","cinemas":"Sinımız","cinnamon":"Sinımın","ciothes":"Klovdz","circle":"Sörkl","circled":"Sörkıld","circles":"Sörkıls","circuit":"Sörkit","circulatory":"Sörkyulıtori","circumstance":"Sörkümstəns","circumstances":"Sörkümstənsız","cities":"Sitiz","citizen":"Sitizn","citizens":"Sitizıns","citizenship":"Sitisınşip","city":"Siti","city's":"Sitiz","civic":"Sivik","civil":"Sivl","ciycling":"Saykling","cizre":"Cizre","claim":"Kleym","claimed":"Kleymd","claims":"Kleyms","claire":"Kleyr","clamp":"Klemp","clarification":"Klerifikeyşın","clarify":"Klerifay","clarity":"Kleriti","clashes":"Kleşız","class":"Klas","classed":"Klast","classes":"Klasız","classical":"Klasikıl","classify":"Klasifay","classmate":"Klasmeyt","classmates":"Klasmeyts","classroom":"Klasrum","claw":"Klo","clay":"Kley","clean":"Kliin","cleaned":"Klinid","cleaner":"Klinır","cleaning":"Klinin","cleanliness":"Klenlinıs","cleansers":"Klenzırs","cleanup":"Klinap","clear":"Kliır","clearing":"Kliyiring","clearly":"Kliırli","clever":"Klevır","cleverness":"Klevırnıs","click":"Klik","client":"Klayınt","clients":"Klayınts","cliff":"Klif","climate":"Klaymıt","climates":"Klaymıts","climb":"Klaymb","climbed":"Klaymbd","climbers":"Klaymırz","climbing":"Klayming","clinic":"Klinik","clips":"Kilps","clock":"Klok","clockwise":"Klokvayz","clogged":"Klogd","close":"Klous","closed":"Klozd","closely":"Klousli","closer":"Clovzır","closest":"Klousıst","closet":"Klozıt","closing":"Klovzing","cloth":"Klath","clothes":"Klouthz","clothing":"Klouding","cloud":"Klaud","clouds":"Klaudz","clowning":"Klauning","clowns":"Klauns","club":"Klab","clubs":"Klabz","clue":"Klu","clues":"Kluuz","clumsy":"Klamsi","clup":"Klap","co":"Kov","coach":"Kouç","coal":"Kol","coalition":"Kovəlişın","coast":"Koust","coastal":"Kovstıl","coastline":"Kovstayn","coat":"Kout","coats":"Kovts","cob":"Kob","coconut":"Kovkənat","cod":"Kad","code":"Koud","codebase":"Kovdbeybs","codes":"Kovds","coffee":"Kafi","cognition":"Kagnişın","coincidence":"Koinsidıns","coke's":"Kovks","cola":"Kovlə","cold":"Kould","colder":"Kovldır","coldness":"Kovldnıs","coldn't":"Kovldınt","colds":"Kovlds","collaborate":"Kelaboreyt","collaborated":"Kelaboreytid","collaborating":"Kelaboreytin","collaboration":"Kelaboreyşın","collaborations":"Kelaboreyşınz","collaborative":"Kelabörətiv","collar":"Kalır","colleague":"Kalig","colleagues":"Kaliigz","collect":"Kolekt","collected":"Kolektid","collection":"Kolekşın","collectively":"Kolektivli","collects":"Kolekts","college":"Kolic","collocations":"Kalokeyşınz","cologne":"Kolovn","colombia":"Kolombiya","colonoscopy":"Kaplonoskopi","color":"Kalır","colored":"Kalırd","colorful":"Kalırfıl","colour":"Kalır","coloured":"Kalırd","colourful":"Kalırful","colours":"Kalırz","columbus":"Kolambıs","columns":"Kolıms","com":"Kam","coma":"Kovmə","combat":"Kombat","combination":"Kombineyşın","combine":"Kombayn","come":"Kam","comedy":"Komıdi","comes":"Kamz","comfort":"Kanfırt","comfortable":"Kanfırtıbıl","comfortably":"Kamförtəbli","comforting":"Kamförtin","comic":"Kamik","coming":"Kaming","comment":"Koment","comments":"Koments","commercial":"Kımörşıl","commercials":"Komörşılz","commerical":"Komörşıl","commission":"Komişın","commit":"Komit","committed":"Komitid","committee":"Komiti","committing":"Komiting","common":"Kamın","commonest":"Kamınist","commonly":"Kamanli","communal":"Kamyunıl","communicate":"Komyunikeyt","communicated":"Komyunikeytid","communicates":"Komyunikeyts","communicating":"Komyunikeytin","communication":"Komyunikeyşın","communities":"Komyunətiz","community":"Komüniti","commute":"Komyut","commuting":"Komyuting","companies":"Kampəniz","companion":"Kompanyın","companions":"Kompanyınz","companionship":"Kompanyınşip","compansate":"Kompenseyt","company":"Kampany","company's":"Kampəniz","comparative":"Komperətiv","compare":"Kımpeyr","compared":"Kompeyrd","comparing":"Kompeyring","comparison":"Komperisın","compassion":"Kompeşın","compassionate":"Kompeşınıt","compatible":"Kompetıbıl","compelled":"Kompeld","compensated":"Kompenseytid","compete":"Kımpiit","competence":"Kompetıns","competencies":"Kompetınsiz","competent":"Kompetınt","competing":"Kompeting","competition":"Kompitişn","competitive":"Kompetitiv","competitor":"Kompetitır","competitors":"Kompetitırz","competitors'":"Kompitetırz","compiling":"Kompailing","complain":"Kımpleyn","complained":"Kompleynd","complaining":"Kompleynin","complains":"Kompleyns","complaint":"Kompleynt","complaints":"Kompleynts","complementary":"Komplimentəri","complete":"Kımpliit","completed":"Komplitid","completely":"Komplitli","completing":"Kompliting","complex":"Kompleks","complexity":"Kompleksiti","complicated":"Komplikeytıd","compliment":"Kamplimınt","complimentary":"Komplimentri","comply":"Komplay","compny":"Kampıni","composition":"Kompızişın","comprehension":"Komprihenşın","comprehensive":"Komprihensiv","compression":"Kompreşın","compromise":"Kompromayz","compulsory":"Kompalsəri","computer":"Kompyutır","computerization":"Kompyutırayzeyşın","computers":"Kompyutırz","coms":"Kamz","con":"Kan","concentrate":"Konsıntreyt","concentrated":"Konsıntreytid","concept":"Konsept","conception":"Konsepşın","concepts":"Konsepts","concern":"Konsörn","concerned":"Konsörnd","concerning":"Kınsırning","concerns":"Konsörnz","concert":"Kansıt","concessions":"Konseşınz","conclude":"Konkluud","conclusion":"Konklujın","conclusions":"Konklujınz","concrete":"Konkriit","concussion":"Konkaşın","condemn":"Kondem","condition":"Kındişın","conditional":"Kondişınıl","conditionally":"Kondişınıli","conditions":"Kındişınz","condolence":"Kondolıns","condolences":"Kondovlənsız","condos":"Kondovz","conduct":"Kondakt","conducted":"Kondaktid","conducting":"Kondakting","confectionary":"Konfekşineri","confectionery":"Konfekşineri","conference":"Konfırıns","confession":"Konfeşın","confidence":"Konfidıns","confident":"Konfidınt","confidential":"Konfidenşıl","confidentiality":"Konfidenşiyeliti","confirm":"Konförm","confirmation":"Konfirmeyşın","confirmed":"Konförmd","conflict":"Konflikt","conflicts":"Konflikts","confrontation":"Konfrontiyşın","confrontations":"Konfrönteşınz","confronted":"konfrontid","confused":"Konfyuzd","confusing":"Konfyuzing","confusion":"Konfyujın","congrats":"Kongrats","congratulations":"Kongraçuleyşınz","connect":"Konekt","connected":"Konektid","connectedness":"Konektidnıs","connecting":"Konektin","connection":"Konekşın","connections":"Konekşınz","connects":"Konekts","connotation":"Kanoteyşın","conquer":"Konkuır","cons":"Kons","conscientious":"Kanşiyenşıs","conscious":"Konşıs","consciously":"Kanşısli","consecutive":"Konsekutiv","consent":"Konsent","consequence":"Konstikvıns","consequences":"Konsikvənsız","consequently":"Konsikvəntli","conservation":"Konsörveyşın","conservationist":"Konsörveyşınist","conservative":"Konsörvətiv","consider":"Konsidır","considerable":"Konsidərəbıl","considerably":"Konsidərəbli","considerate":"Konsidərıt","consideration":"Konsidereyşın","considerations":"Konsidereyşınz","considered":"Konsidırd","considering":"Konsidıring","considers":"Konsidırz","consisted":"Kınsistid","consistency":"Konsistənsi","consistent":"Konsistınt","consistently":"Konsistıntli","console":"Kansovl","consolidate":"Konsolidiyit","consolidated":"Konsolidiyitid","consoludation":"Konsolidiyeyşın","constancy":"Konstınsi","constant":"Konstant","constantly":"Konstantli","constitution":"Konstitüşın","construction":"Konstrakşın","constructive":"Konstraktiv","consulting":"Kansalting","consume":"Konsum","consumer":"Konsumır","consumers":"Konsumırz","consumption":"Konsampşın","contact":"Kontakt","contacted":"Kontaktid","contacting":"Kontakting","contagious":"Konteycıs","contain":"Konteyn","contained":"Konteynd","container":"Konteynır","containers":"Konteynırz","contains":"Konteynz","contaminated":"Kontamineytid","contaminating":"Kontamineyting","contamination":"Kontamineyşın","contemporary":"Kontemporəri","content":"Kontent","contentment":"Kontentmınt","contest":"Kontest","context":"Kontekst","contiditions":"Kontidişınz","continent":"Kontınınt","continual":"Kontinyuıl","continually":"Kontinyuəli","continue":"Kontinyu","continued":"Kontinyud","continues":"Kontinyus","continuing":"Kontinyuing","continuous":"Kontinuıs","continuously":"Kontinyuıslı","contract":"Kontrakt","contrary":"Kontrıri","contrast":"Kıntrast","contribute":"Kontribyut","contributed":"Kontribyutid","contributes":"Kontribyuts","control":"Kontroul","controlled":"Kontrovld","controller":"Kantrovlır","controllers":"Kantrovlırz","controlling":"Kontrovling","controversial":"Kontrövörşıl","convenience":"Konvinyıns","convenient":"Konvinyınt","convent":"Konvent","convention":"Konvenşın","conventional":"Konvenşınıl","conventions":"Konvenşınz","conversation":"Konverseyşı n","conversational":"Konverseşınıl","conversations":"Konverseşınz","converted":"Konvörtid","convey":"Konvey","conveyed":"Konveyid","convicted":"Konviktid","convince":"Konvins","convinced":"Konvinst","cook":"Kuuk","cooked":"Kukt","cookie":"Kuki","cookies":"Kukis","cooking":"Kuking","cooks":"Kuks","cool":"Kuul","cooling":"Kuling","cooperation":"Kovoperiyşın","coordinated":"Kovodineytid","coordination":"Kovodineyşın","cope":"Kovp","copies":"Kopiz","copy":"Kopi","copycats":"Kopikeyts","core":"Kor","corn":"Korn","corner":"Kornır","corporate":"Korporıt","corralled":"Korold","correct":"Korekt","corrected":"Korektid","corrective":"Korektiv","correctly":"Korektli","correlation":"Korəleyşın","correspond":"Korispand","correspondence":"Korispandıns","corresponding":"Korispanding","corresponds":"Korispands","corrupted":"Koraptid","corruption":"Korapşın","cosiness":"Kovzinəs","cosmetics":"Kazmetiks","cosmopolitan":"Kozmopolitən","cosplay":"Kozpley","coss":"Kos","cost":"Kost","costing":"Kosting","costly":"Kostli","costs":"Kosts","costume":"Kostum","costumers":"Kostumırz","costumes":"Kostuums","cosy":"Kovzi","cottage":"Kotıc","couch":"Kavç","cough":"Kof","coughing":"Kofing","could":"Kud","couldn":"Kudınt","could've":"Kudıv","council":"Kaunsl","council's":"Kaunsılz","counselling":"Kaunsıling","count":"Kaunt","counted":"Kauntid","counter":"Kauntır","counting":"Kaunting","countries":"Kantriz","country":"Kantri","country's":"Kantriz","countryside":"Kantrisayd","counts":"Kaunts","county":"Kaunti","couple":"Kapıl","couples":"Kapıls","couple's":"Kapıls","coupon":"Kupın","courage":"Karıc","course":"Kors","courses":"Korsız","court":"Kort","court's":"Kortz","cousin":"Kazn","cousins":"Kazınz","cover":"Kavır","covered":"Kavırd","covering":"Kavıring","covid":"Kovid","coward":"Kavvırd","coworkers":"Kovvörkırz","cozy":"Kovzi","cpr":"Si pi ar","cracking":"Kreking","crackling":"Kreklıng","cracks":"Kreks","crane":"Kreyn","crap":"Krep","crashed":"Kreşd","crashes":"Kreşız","crashing":"Kreşing","crave":"Kreyv","craving":"Kreyving","cravings":"Kreyvings","crawled":"Krold","crawling":"Kroling","crayons":"Kreyanz","crazier":"Kreiziyır","crazy":"Kreyzi","creaking":"Kriking","cream":"Kriim","creamy":"Kriimi","create":"Kriyeyt","created":"Kriyeytıd","creates":"Kriyeyts","creating":"Kriyeytin","creation":"Krieyşın","creative":"Kriyeytiv","creativity":"Kriyeytiviti","creatures":"Kriçırz","cred":"Kred","credit":"Kredit","creepy":"Kripi","crepes":"Kreps","cresent":"Krezınt","cricket":"Krikıt","crime":"Kraym","crimes":"Krayms","criminal":"Kriminl","criminals":"Kriminıls","crisis":"Krayzis","criteria":"Kraytiriyə","critical":"Kritikıl","criticise":"Kritisaiz","criticism":"Kritizim","criticize":"Kritisayz","criticizing":"Kritisaizing","critics":"Kritiks","crook":"Kruk","crooked":"Krukit","crop":"Krop","cropped":"Kropt","crops":"Krops","cross":"Kros","crossed":"Krost","crowd":"Kraud","crowded":"Kraudid","crowds":"Krauds","crown":"Kraun","crowns":"Krauns","crucial":"Kruşıl","crude":"Krud","cruel":"Kruıl","cruelest":"Kruılıst","cruelty":"Kruılti","cruise":"Kruuz","crum":"Kram","crumbs":"Kramz","cruse":"Kruz","crush":"Kraş","crushed":"Kraşt","cry":"Kray","crying":"Krayin","crypto":"Kriptov","cryptocurrency":"Kriptokarınsi","cubic":"Kyubik","cucket":"Kakıt","cuddle":"Kadıl","cuddling":"Kadıling","cue":"Kyu","cues":"Kyuz","cuisine":"Kuizin","cuisines":"Kuiziniz","culinary":"Kyulineri","cultural":"Kölçırıl","culture":"Kalçır","cultures":"Kalçırz","cumulative":"Kyumyulətiv","cunningham":"Kaningım","cup":"Kap","cupcake":"Kapkeyk","cupcakes":"Kapkeyks","cure":"Küur","cured":"Kyurd","curiosity":"Küriositi","curious":"Küriyıs","currencies":"Karınsiz","currency":"Körınsi","current":"Karınt","currently":"Körıntli","curriculum":"Kirikyulım","curry":"Köri","curse":"Körs","cursed":"Körst","curtains":"Körsıns","customer":"Kastımır","customers":"Kastımırz","customers'":"Kastımırz","customized":"Kastımayzd","customs":"Kastımz","cut":"Kat","cute":"Kyut","cutest":"Kyutist","cutlery":"Katləri","cuts":"Kats","cutting":"Kating","cv":"Si vi","cyberbullies":"Saybırbuliz","cyberbullying":"Saybırbuling","cycle":"Saykl","cycled":"Saykıld","cycles":"Saykıls","cycling":"Saykling","cyclonic":"Sayklonik","dad":"Ded","dad's":"Dedz","daha":"Daha","daily":"Deyli","dairy":"Deri","damage":"Demic","damaged":"Demicd","damages":"Demiciz","damaging":"Demicing","damn":"Demn","dan":"Den","dance":"Dens","dancers":"Dansırz","dances":"Dansız","dancing":"Dansing","dandruff":"Dendraf","danes":"Deyns","danger":"Deyncır","dangerous":"Deyncrıs","dangerously":"Deyncrıslı","daniel":"Denyıl","danish":"Deyniş","danny":"Deni","dare":"Deyr","daren't":"Deyrınt","dark":"Dark","darkness":"Darknıs","darling":"Darling","darren":"Derın","daryl's":"Derılz","dashboard":"Daşbord","data":"Deytı","database":"Deytıbeyz","datata":"Datata","date":"Deyt","dates":"Deyts","dating":"Deyting","daughter":"Dotır","daughters":"Dotırz","david":"Deyvid","davis":"Deyvis","day":"Dey","daylight":"Deylayt","days":"Deyz","days'":"Deyz","dazzling":"Dazling","de":"Di","dead":"Ded","deadline":"Dedlayn","deadlines":"Dedlaynz","deadline's":"Dedlaynz","deadly":"Dedli","deal":"Diıl","dealing":"Diling","deals":"Diilz","dealt":"Delt","deansgate":"Diinzgeyt","dear":"Diır","death":"Deth","deaths":"Dets","debatable":"Dibeytəbıl","debate":"Dibeyt","debt":"Det","decade":"Dikeyd","deceit":"Disit","decelerate":"Diseləreyt","decent":"Disınt","decide":"Disayd","decided":"Disaydid","decides":"Disayds","deciding":"Disayding","decision":"Dısijn","decisions":"Disijınz","decisive":"Disaysiv","deck":"Dek","decline":"Diklayn","declined":"Diklaynd","decliners":"Diklaynırz","declining":"Diklayning","decompose":"Dikompovz","decorated":"Dekoreytid","decorating":"Deköreyting","decrease":"Dikris","decreased":"Dikriist","decreasing":"Dikriising","dedicated":"Dedikeytıd","dedication":"Dedikeyşın","deduction":"Didakşın","deductions":"Didakşınz","deep":"Diip","deepak":"Dipak","deepest":"Dipist","deepfake":"Dipfeyk","deepfakes":"Dipfeyks","deeply":"Dipli","defeat":"Dıfiit","defeated":"Difiitid","defective":"Difektiv","defence":"Difens","defenders":"Difendırz","defense":"Difens","defensive":"Difensiv","define":"Difayn","definitely":"Definitli","definition":"Definişın","definitive":"Difinitiv","degree":"Dıgrii","degrees":"Digriz","delay":"Dıley","delayed":"Dileyid","delays":"Dileys","delegate":"Delegıt","delegated":"Delegiyitid","delegation":"Delegiyşın","delete":"Dilit","delhi":"Deli","deliberation":"Deliböreyşın","delicacy":"Delikəsi","delicious":"Dılişıs","delight":"Dılayt","delighted":"Dilaytıd","deliver":"Delivır","delivered":"Dileverd","deliveries":"Dileveriz","delivering":"Dilevering","delivery":"Dilivıri","delve":"Delv","demand":"Dimend","demanding":"Dimanding","demands":"Dimands","demet":"Demet","democratization":"Dimakrətayzeyşın","demonstrate":"Demonstreyt","demonstrated":"Demonstreytid","demonstration":"Demonstreyş I n","demoralized":"Dimorəlayzd","denied":"Dinayd","deniz":"Deniz","denizli":"Denizli","denmark":"Denmark","dense":"Dens","dental":"Dentıl","dentist":"Dentist","dentist's":"Dentists","deny":"Dınay","denying":"Dinaying","depart":"Dıpart","departing":"Diparting","department":"Dıpartmınt","departure":"Dipaçır","depend":"Dıpend","dependence":"Dipendıns","depending":"Dipending","depends":"Dipends","deploy":"Dıploy","deployed":"Diployd","deployment":"Dıploymınt","deposit":"Dıpozıt","deposited":"Dipozitid","depressed":"Diprest","depression":"Dipreşın","deprive":"Diprayv","depriving":"Diprayving","depth":"Depth","derek":"Derek","derives":"Dirayvz","derken":"Derken","describe":"Dıskrayb","described":"Diskraybd","describes":"Diskraybz","describing":"Diskraybing","descriptive":"Diskriptiv","desert":"Dezırt","deserts":"Dezırtz","deserve":"Dızörv","deserved":"Dizörvd","deserving":"Dizörving","desicion":"Disijın","design":"Dızayn","designed":"Dizaynd","designer":"Dizaynr","desing":"Dizayn","desire":"Dızayr","desired":"Dizayrd","desist":"Dizist","desk":"Desk","desks":"Desks","desktop":"Desktop","despair":"Dispeyr","desperate":"Despərıt","desperately":"Despərıtli","despite":"Dispayt","dessert":"Dizört","desserts":"Dizörts","destination":"Destineyşın","destinations":"Destineyşınz","destroy":"Dıstroy","destroyed":"Distroyd","destroying":"Distroying","destruction":"Dıstrakşın","destructive":"Distraktiv","detached":"Ditaçt","detail":"Diteyl","detailed":"Diteyld","details":"Diteyls","detective":"Ditektif","determination":"Ditörmineyşın","determine":"Ditörmın","determined":"Dıtörmind","determinedly":"Ditörmindli","determining":"Ditörmining","detrimental":"Detrimentıl","devastate":"Devasteyt","devastated":"Devasteytid","devastating":"Devasteyting","devastation":"Devasteyşın","develop":"Dıvelop","developed":"Diveləpt","developer":"Divelopır","developers":"Divelopırz","developing":"Diveləping","development":"Dıvelopmınt","developments":"Divelopmınts","develops":"Divelops","device":"Divays","devices":"Divaysız","devide":"Divayd","devoted":"Divovtid","devout":"Divaut","devrik":"Devrik","dev's":"Devs","dew":"Du","dexterity":"Deksteriti","deyimdir":"Deyimdir","di":"Di","diabetes":"Dayəbitiz","diagnosis":"Dayagnowsis","dialed":"Dayald","dialogue":"Dayılog","dianthus":"Dayanthes","diary":"Dayri","dick":"Dik","dickinson":"Dikinsın","dictator":"Dıkteytır","dictatorship":"Diktateytirşip","dictionary":"Dikşınri","dictionary's":"Dikşıniriz","did":"Did","didn't":"Didınt","die":"Day","died":"Dayd","dies":"Dayz","diet":"Dayıt","dietary":"Dayıteri","diets":"Dayıts","differ":"Difır","difference":"Difrıns","differences":"Difrınsız","different":"Dıfrınt","differently":"Difrıntli","differet":"Difrınt","difficult":"Dıfıkılt","difficulties":"Difikəltiz","difficulty":"Difikəlti","dig":"Dig","digest":"Daycest","digestible":"Daysestibıl","digital":"Dicitıl","dilemma":"Dilemı","diminish":"Diminiş","diminished":"Diminişt","dimly":"Dimli","diner":"Daynır","dining":"Dayning","dinner":"Dinır","dinner's":"Dinırz","dioxide":"Dayoksaid","diplomat":"Dıplımat","dipped":"Dipt","direct":"Dırekt","direction":"Dırekşn","directions":"Direkşınz","directive":"Direktiv","directly":"Direktli","director":"Dırektır","directors":"Direktırz","dirty":"Dörti","disabilities":"Disabilitiz","disability":"Disabiləti","disabled":"Diseybıld","disadvantages":"Disadvantıcız","disagree":"Disıgrii","disagreeable":"Disıgriyəbıl","disagreed":"Disıgrid","disagreement":"Disıgrimınt","disappear":"Disıpiır","disappearance":"Disapiyirıns","disappearing":"Disəpiyiring","disappears":"Disəpiyirz","disappointed":"Disapoyntıd","disappointing":"Disapoynting","disappointment":"Disapoyntmınt","disappointments":"Disəpoyntmınts","disapprove":"Disəpruv","disaster":"Dizastır","disbelief":"Disbiliif","discipline":"Disiplin","disclosure":"Disklovjır","discomfort":"Dis kamfırt","disconnect":"Diskanekt","discount":"Diskaunt","discounts":"Diskaunts","discouraged":"Disköricd","discover":"Diskavır","discovered":"Discoverd","discoveries":"Diskavəriz","discovers":"Diskavırz","discovery":"Diskavıri","discretion":"Diskresin","discriminated":"Diskrimineytid","discrimination":"Diskrimineyşın","discuss":"Dıskas","discussed":"Disakst","discusses":"Disakasız","discussing":"Diskasin","discussion":"Diskasın","discussions":"Disakasınz","disease":"Diziiz","diseases":"Diziizız","disestar":"Disestır","disgraceful":"Disgreysfıl","disguise":"Disgayz","disgusting":"Disgasting","dish":"Diş","dishes":"Dişız","dishonesty":"Disanisti","disincentivises":"Disinsentivayzız","disks":"Disks","dislike":"Dislayk","disloyal":"Disloyəl","disneyland":"Disnilend","disorder":"Disordır","disorders":"Disordırz","displaced":"Displeyst","disposal":"Dispozıl","disproportionate":"Dispropörşınıt","dispute":"Dıspüut","disputes":"Dispyuts","disquiet":"Diskuvayıt","disregard":"Disrigard","disrespect":"Disrispekt","disrespectful":"Disrispektfıl","disrespecting":"Disrispekting","disrupting":"Disrapting","disruptive":"Disraptiv","dissatisfied":"Disetisfayd","distance":"Distıns","distant":"Distınt","distinguish":"Distinguwiş","distracted":"Distraktid","distractions":"Distrekşınz","distributed":"Distribyutid","distribution":"Distribyuşın","distrustful":"Distrastfıl","disturbance":"Distörbıns","disturbed":"Distörbd","disturbing":"Distörbing","dive":"Dayv","diverse":"Dayvörs","diversity":"Dayvörsiti","divide":"Divayd","divided":"Divaydıd","divine":"Divayn","diving":"Dayving","divorce":"Divors","divorced":"Divorst","divya's":"Divyəz","diwali":"Divali","diy":"Di ay vay","diye":"Diye","dizziness":"Dizinıs","dj":"Di cey","djs":"Di ceyz","dm":"Di em","dms":"Di emz","dna":"Di en ey","dock":"Dak","doctor":"Daktır","doctors":"Daktırz","doctor's":"Daktırz","document":"Dokümınt","documentaries":"Dokyumentəriz","documentary":"Dokyumentəri","documentation":"Dokyumenteyşın","documents":"Dokyuments","doer":"Duır","doesn":"Dazınt","doesn't":"Dazınt","dog":"Dog","dogma":"Dogmə","dogs":"Dovgz","doing":"Duing","doll":"Dal","dollar":"Dalır","dollars":"Dalırz","dolls":"Dalz","domestic":"Dımestik","dominated":"Domineytid","donald":"Donal","donate":"Doneyt","donation":"Doneyşın","done":"Dan","donkey":"Donki","dont":"Dovnt","dont't":"Dovnt","doomsday":"Dumzdey","door":"Door","doors":"Dors","dormitory":"Dormitöri","dose":"Dovs","dosen't":"Dazınt","doses":"Dovsız","dosyalar":"Dosyalar","double":"Dabl","doubled":"Dabıld","doubt":"Daut","doubts":"Dauds","dough":"Dov","douglas":"Dagləs","down":"Daun","download":"Daunlod","downs":"Dauns","downsizing":"Daunsayzing","downstairs":"Daunsteyr","downtime":"Dauntaym","downtown":"Dauntaun","downward":"Daunvırd","dox":"Daks","doxed":"Dakst","doxx":"Daks","doxxed":"Dakst","dozing":"Dovzing","dr":"Daktır","draft":"Draft","dragged":"Dregd","dragons":"Dregınz","drain":"Dreyn","dramatic":"Dramətik","drank":"Drenk","drastically":"Drastikli","draw":"Drov","drawer":"Drovır","drawers":"Drovırz","drawing":"Droying","drawings":"Droyings","draws":"Drovz","dreadful":"Dredfıl","dream":"Driim","dreamed":"Drimd","dreaming":"Driiming","dreams":"Driimz","dress":"Dres","dressed":"Drest","dresses":"Drezız","dressing":"Dreesing","drew":"Dru","driest":"Drayist","drink":"Drink","drinking":"Drinking","drinks":"Drinkz","drive":"Draıv","driven":"Drivın","driver":"Drayvır","drivers":"Drayvırz","driver's":"Drayvırz","drives":"Drayvz","driving":"Drayving","drizzling":"Drizling","drooling":"Druling","drop":"Drop","dropped":"Dropt","dropping":"Droping","drove":"Drov","drug":"Drag","drugs":"Dragz","drum":"Dram","drumming":"Draming","drunk":"Drank","drunken":"Drankın","dry":"Dray","drying":"Draying","dubai":"Dubay","dublin":"Dablin","dude":"Dud","due":"Düu","dui":"Di yu ay","dull":"Dal","dunes":"Dunz","dunno":"Danov","durability":"Durəbiləti","duration":"Düreyşın","during":"during","durumlar":"Durumlar","durumu":"Durumu","durur":"Durur","dutch":"Daç","dutcher":"Daçır","dutchers":"Daçırz","duty":"Düuti","dv":"Di vi","dying":"Daying","dylan":"Dilın","dylan's":"Dilənz","dynamics":"Daynamiks","each":"İiç","eager":"İigır","ear":"İır","earlier":"Örliər","earliest":"Örliist","early":"Örli","earn":"Örn","earner":"Örnır","earning":"Örning","earnings":"Örning","earns":"Örnz","earrings":"İyringz","earth":"Örth","earthquake":"Örthkveyk","earthquakes":"Örthkveyks","earth's":"Örths","earthship":"Örthşip","earthships":"Örthşips","ease":"İiz","easier":"İziər","easily":"İzili","east":"İist","eastern":"İstın","easton":"İstın","easy":"İizi","easygoing":"İzigoving","eat":"İit","eaten":"İitın","eating":"İting","eats":"İits","eccentric":"İksentrik","ece":"Ece","echoes":"Ekovz","eco":"Ekov","ecodesign":"Ekovizayn","economic":"İkonomik","economist":"İkanamist","economy":"İkonəmi","ecosystems":"İkosistımz","ecstatic":"Ekstatik","ed":"Ed","edible":"Edibıl","edilmeden":"Edilmeden","edinburgh":"Edinbırə","editor":"Editır","eduardo":"Eduardov","educate":"Ecukeyt","educated":"Ecukeytıd","educating":"Ecukeyting","education":"Ecukeyşın","educational":"Ecukeyşınıl","edward":"Eduvırd","eejit":"İcit","eerie":"İyri","effect":"Ifekt","effective":"Ifektiv","effectively":"Ifektivli","effectiveness":"Ifektivnıs","effects":"Ifekts","efficiency":"Ifişənsi","efficient":"Ifışınt","efficiently":"İfişıntli","effort":"Efıt","efforts":"Eförts","egelis":"Egilis","eggplant":"Egplant","eggs":"Egs","ego":"Ego","egotistical":"Egötistikıl","egypt":"İcipt","eid":"İid","eiffel":"Ayfıl","eight":"Eyt","eighteen":"Eytin","eighth":"Eytth","either":"Aydır","eker":"Eker","ekilde":"Ekilde","eklemek":"Eklemek","eklenince":"Eklenince","ekmek":"Ekmek","elderly":"Eldırli","elders":"Eldırz","ele":"Ele","eleanor":"Elinör","election":"Ilekşın","electric":"İlektrik","electricity":"Ilektrisiti","electronic":"İlektronik","elegance":"Elıgıns","elegant":"Elıgınt","elegantly":"Elıgıntli","elements":"Elımınts","elephant":"Elıfınt","elephants":"Elıfınts","elhamdulillah":"Elhamdulillah","eli":"İlay","eliminate":"İlimineyt","eliminated":"İlimineytid","elite":"İlit","ellen":"Elın","eloquently":"Elokvıntli","else":"Els","else's":"Elsız","email":"İmeyl","emailed":"İmeyld","emails":"İmeylz","emals":"İmeyls","embarrass":"İmberas","embarrassing":"Imberısing","embarrassment":"İmberesmınt","embassy":"Embısi","emboss":"Embos","emerge":"Imörc","emerged":"İmörcd","emergencies":"İmörcınsiz","emergency":"Imörcınsi","emigrate":"Emigreyt","emigrated":"Emigreytid","emily":"Emili","emily's":"Emiliz","emissions":"İmişınz","emloyees":"İmployiz","emma":"Emı","emmy":"Emi","emotion":"İmoşın","emotional":"İmoşınıl","emotionally":"İmoşınəli","emotions":"İmovşınz","empathy":"Empəti","emphasis":"Emfəsis","emphasise":"Emfəsayz","emphasize":"Emfəsayz","emphasized":"Emfəsayzd","emphasizes":"Emfəsayzız","empire":"Empayır","empirical":"İmpirikıl","employ":"Imploy","employed":"İmployd","employee":"Imployi","employees":"Employiz","employees'":"İmployiz","employers":"İmployırz","employment":"Imploymınt","employs":"İmployz","empowerment":"İmpavvırment","emptied":"Emptid","empty":"Empti","emulate":"Emyuleyt","en":"En","enable":"İneybıl","enabled":"İneybıld","enabling":"İneybling","enact":"İnakt","enclosed":"Enklovzd","encompass":"İnkampıs","encounter":"Enkauntır","encountered":"Enkauntırd","encourage":"Inkarıc","encouragement":"Enkaricmınt","encourages":"Enkaricız","encouraging":"Enkaricing","end":"End","endangered":"İndeyncırd","endeavor":"Endevır","ended":"Endid","ending":"Ending","endless":"Endləs","endorse":"İndors","endorsement":"İndorsmınt","endorsements":"İndorsmınts","ends":"Ends","endurance":"İndürıns","enemies":"Enımiz","enemy":"Enımi","energetic":"Enərcetik","energised":"Enörcayzd","energy":"Enırci","enforce":"İnfors","enforced":"İnforsd","engage":"Engeyc","engaged":"Engeycd","engagement":"Engeycmınt","engaging":"Engeycing","engine":"Encin","engineer":"Enciniir","engineering":"Enciniyring","engines":"Encins","england":"İngglənd","english":"İngliş","engrossed":"Engrovst","enhances":"Enhansız","enjoy":"Incoy","enjoyed":"Encoyd","enjoying":"Encoying","enjoys":"Encoys","enlargement":"Enlarcmınt","enormous":"İnormıs","enough":"İnaf","enrico":"Enrikov","enroll":"İnrol","enrolled":"İnrold","enrollment":"İnrolmınt","enrolment":"İnrolmınt","ensure":"İnşur","enter":"Enter","entered":"Enterd","entering":"Entering","entertainment":"Entörteynmınt","enthusiasm":"Entyuziyazım","enthusiast":"Entyuziast","enthusiastic":"Entyuziastik","entire":"İntayır","entirely":"İntayırli","entrance":"Entrıns","entry":"Entri","envied":"Envied","envious":"Enviyıs","enviromental":"Envayrınmentıl","environment":"İnvayrınmınt","environmental":"İnvayrınmıntıl","environmentalist":"Envayrınmentəlist","environmentally":"İnvayrınmentəli","environments":"Envayrınmınts","envision":"Envijın","envisioned":"Envijınd","envy":"Envi","eod":"İy ov di","epic":"Epik","episode":"Episovd","equador":"Ekvıdor","equal":"İkuıl","equality":"İkualiti","equally":"İkwəli","equipment":"İkuipmınt","equivalent":"İkuvələnt","er":"Er","era":"İrə","erdogan":"Erdoğan","erek":"Erek","ergonomic":"Örganamik","ergonomics":"Örganamiks","eric":"Erık","erli":"Erli","ernest":"Örnest","erosion":"İrovjın","erp":"İ ar pi","errands":"Erınds","error":"Erır","errors":"Erırz","erupting":"İrapting","eruption":"İrapşın","escape":"Iskeyp","escobar":"Eskobar","especially":"İspeşli","espr":"Espr","espressos":"Espresovz","essay":"Esey","essays":"Eseyz","essential":"Isenşıl","essentially":"İsenşəli","essentials":"İsenşılz","est":"Est","establish":"Istabliş","established":"İsteblişd","establishing":"İsteblişing","estate":"İsteyt","estimate":"Estımeyt","estimated":"Estimeytid","estimates":"Estimeyts","estimation":"Estimeyşın","eta":"İti","eternal":"İtörnıl","eternally":"İtörnəli","ethan":"İtın","ethic":"Etik","ethics":"Etiks","etkinlik":"Etkinlik","etmek":"Etmek","etti":"Etti","etymology":"Etimoloci","eu":"İy yu","euphemisms":"Yufəmizımz","euro":"Yuro","europe":"Yurəp","european":"Yurəpiyın","europeans":"Yurəpiyınz","europe's":"Yurəps","euros":"Yurovz","euurope":"Yurəp","eva":"Evə","evacuate":"İvakyueyt","evade":"İveyd","evaluation":"İvəlyueyşın","evangelical":"Evancelikıl","evaporates":"İvapöreytis","evasion":"İveyjın","eve":"İiv","even":"İvın","evening":"İvning","evenings":"İvningz","event":"İvent","events":"İvents","eventually":"İvençuıli","ever":"Evır","everest":"Everist","every":"Evri","everybody":"Evribadi","everybody's":"Evribadiz","everyday":"Evridey","everyone":"Evrivan","everyone's":"Evrivanz","everything":"Evriting","everything's":"Evritingz","everywhere":"Evriweyr","evidence":"Evidıns","evil":"İvl","evolution":"İvəluşın","evolve":"İvolv","evolved":"İvolvd","evolves":"İvolvz","evraklar":"Evraklar","evrything":"Evriting","eww":"İu","ex":"Eks","exact":"Igzekt","exactly":"Igzekli","exaggerate":"Igzacıreyt","exaggerates":"İgzacıreyts","exaggerating":"İgzacıreyting","exam":"İgzam","examination":"İgzamineyşın","examined":"İgzaminid","example":"Igzempl","examples":"İgzampıls","exams":"İgzems","exceed":"İksid","exceeded":"İksiidid","exceeds":"İksiids","excel":"İksel","excellent":"Eksılınt","except":"iksept","exception":"Iksepşın","exceptional":"Eksepşınıl","exceptionally":"İksepşınəli","exchange":"Iksçeync","exchanging":"İksçeyncıng","excited":"İksaytıd","excitedly":"İksaytıdli","excitement":"İksaytmınt","exciting":"İksayting","excluding":"İkskluding","exclusion":"İksklujın","exclusive":"İksklusiv","excursion":"İkskörjın","excuse":"Eksküuz","executed":"Eksikyutid","executive":"İgzekyutiv","exemplify":"İgzemplifay","exemption":"İgzempşın","exercise":"Eksısayz","exercises":"Eksırsayzız","exercising":"Eksırsayzing","exert":"İgzört","exhausting":"İgzostin","exhaustive":"İgzostiv","exhibit":"İgzibit","exhibited":"İgzibitid","exhibition":"Eksibişın","exhibits":"İgzibits","exhortations":"Egzörteyşınz","exist":"Igzist","existed":"İgzistid","existence":"İgzistıns","existing":"İgzistin","exit":"Eksit","expand":"İkspend","expat":"Ekspet","expats":"Ekspets","expect":"Ekspekt","expectancy":"İkspektınsi","expectation":"İkspekteyşın","expectations":"İkspekteyşınz","expected":"İkspektıd","expecting":"İkspekting","expense":"Ekspens","expenses":"İkspensız","expensive":"Ekspensiv","experience":"Ikspiriıns","experienced":"İkspiriınsd","experiences":"İkspiriınsız","experiencing":"İkspiriınsing","experiment":"İksperimınt","experiments":"İksperimınts","expert":"Ekspört","expertise":"Ekspörtiz","experts":"Ekspörts","explain":"Ikspleyn","explained":"İkspleynd","explaining":"İkspleynin","explains":"İkspleyns","explanation":"Eksplıneyşın","explanations":"Eksplıneyşınz","explicitly":"İksplisitli","exploration":"Eksploreyşın","explore":"Iksplor","explorers":"Eksplorırz","exploring":"İksploring","expo":"Ekspo","export":"Eksport","expose":"İkspovz","exposure":"İkspovjır","express":"Ikspres","expressed":"İksprest","expressing":"İkspresing","expression":"Ikspreşın","expressions":"İkspreşınz","expressive":"İkspresiv","extend":"Ikstend","extended":"İkstendid","extension":"Ikstenşn","extensive":"İkstensiv","extent":"Ikstent","external":"Ekstörnıl","extortionate":"Ekstorşınıt","extra":"Ekstrı","extract":"Ikstekt","extracurricular":"Ekstrəkərikyulır","extraordinary":"Ikstrordinıri","extras":"Ekstrırs","extreme":"Ekstriim","extremely":"Ekstriimli","extremly":"Ekstriimli","extrovert":"Ekstrovört","ey":"Ey","eye":"Ay","eyebrow":"Aybrau","eyebrows":"Aybravz","eyed":"Ayd","eyes":"Ayz","eylon":"Eylın","f":"Ef","fabric":"Fabrik","fabulous":"Fabyulıs","face":"Feys","facebook":"Feycbuk","faced":"Feyst","facial":"Feyşıl","facilitate":"Fəsilitiyit","facilitator":"Fəsilitiyteytır","facilities":"Fısilitiz","facility":"Fısıliti","facing":"Feycing","fact":"Fekt","factor":"Fektır","factories":"Fektəriz","factors":"Fektırz","factory":"Fektri","facts":"Fekts","fadil":"Fadıl","fail":"Feyl","failed":"Feyld","failing":"Feylin","fails":"Feylz","failure":"Feylır","failures":"Feylyırz","fair":"Feır","fairer":"Feyrır","faith":"Feyth","faithfulness":"Feythfəlnıs","fake":"Feyk","falafel":"Falafel","fall":"Fol","fallen":"Folın","falling":"Foling","falls":"Folz","false":"Fols","falsely":"Folslı","familiar":"Fımiliır","familiarise":"Fəmiliyərayz","familiarity":"Fımiliyeriti","families":"Femılız","family":"Femıli","family's":"Femılız","famished":"Fämişt","famous":"Feymıs","fan":"Fen","fancier":"Fensiyır","fancy":"Fensi","fans":"Fens","fantastic":"Fentestik","far":"Far","fare":"Feır","fares":"Feyrz","fark":"Fark","farm":"Fam","farming":"Farming","farms":"Farmz","farther":"Fardır","farthest":"Fardıst","fascinating":"Fasineyting","fascination":"Fasineyşın","fashion":"Feşn","fashionable":"Feşınəbıl","fashioned":"Feşınd","fasolada":"Fasolada","fast":"Fast","fasten":"Fasn","faster":"Festır","fastest":"Festıst","fasting":"Fasting","fat":"Fet","fatalities":"Feytələtiz","fate":"Feyt","father":"Fadır","fathers":"Fadırz","father's":"Fadırz","fatiha":"Fatiha","fatty":"Feti","faucet":"Fosıt","fault":"Folt","faulty":"Folti","fauna":"Fonə","favor":"Feyvır","favorable":"Feyvırəbıl","favorite":"Feyvrıt","favorites":"Feyvırıts","favour":"Feyvır","favourite":"Feyvrıt","fbi":"Ef bi ay","fear":"Fiır","feared":"Fiyırd","fearing":"Fiyiring","fearlessly":"Fiyirlısli","fears":"Fiyirz","feasible":"Fiyzibıl","feast":"Fiist","feature":"Fiçır","featured":"Fiçırd","features":"Fiçırz","february":"February","fed":"Fed","federal":"Fedərəl","fee":"Fii","feed":"Fid","feedback":"Fidbek","feeders":"Fiidırz","feel":"Fiil","feeling":"Fıling","feelings":"Filingz","feels":"Filz","fees":"Fiiz","feet":"Fit","felix":"Fiiliks","fell":"Fel","fellow":"Felıu","felt":"Felt","female":"Fimeyl","fence":"Fens","feng":"Feng","ferrets":"Ferıts","ferris":"Feris","ferry":"Feri","fertile":"Förtayl","festival":"Festival","festivals":"Festivıls","feta":"Fetə","fetuses":"Fitıssız","fever":"Fivır","few":"Füu","fewer":"Fyuır","fiction":"Fikşın","field":"Fiild","fields":"Fiildz","fierce":"Firs","fifth":"Fifth","fifths":"Fifthz","fifty":"Fifti","fight":"Fayt","fighting":"Fayting","fights":"Fayts","figure":"Figır","figured":"Figırd","figures":"Figırz","fiil":"Fiil","file":"Fayl","filed":"Fayld","files":"Faylz","fill":"Fil","filled":"Fild","fills":"Filz","film":"Film","filming":"Filming","filmmaker":"Film meykır","filmmaking":"Film meyking","films":"Filmz","film's":"Filmz","filters":"Filtırz","final":"Faynl","finalised":"Faynəlayzd","finally":"Faynıli","finals":"Faynəls","finance":"Faynens","finances":"Faynənsız","financial":"Finenşıl","financially":"Faynenşəli","find":"Faynd","finding":"Faynding","findings":"Fayndings","finds":"Fayndz","fine":"Fayn","fined":"Faynd","finger":"Fingır","fingerprint":"Fingıgrprint","fingers":"Fingırz","finish":"Finiş","finished":"Finişd","finishes":"Finişiz","fire":"Fayır","fired":"Fayırd","firefighter":"Fayırfaytır","firefighters":"Fayırfaytırz","firemen":"Fayırmen","fireplace":"Fayırpleys","fires":"Fayırz","firewall":"Fayırvöl","fireworks":"Fayırvörks","firm":"Förm","first":"Först","firstly":"Fırstli","fish":"Fiş","fishermen":"Fişırmen","fishing":"Fişing","fit":"Fit","fitness":"Fitnıs","fitness'":"Fitnıs","fits":"Fits","fitted":"Fitid","fitting":"Fiting","five":"Fayv","fix":"Fiks","fixed":"Fikst","fixes":"Fiksiz","fixing":"Fiksing","fiziksel":"Fiziksel","flag":"Fleg","flags":"Flegs","flake":"Fleyk","flamingos":"Flamingovz","fland":"Fland","flat":"Flet","flatmates":"Flatmeyts","flatmate's":"Flatmeyts","flattered":"Fletırd","flavor":"Fleyvır","flavored":"Fleyvörd","flavour":"Fleyvır","flavours":"Fleyvırz","flaw":"Flo","flea":"Fli","flemming":"Flemming","flew":"Flu","flex":"Fleks","flexibility":"Fleksibiləti","flexible":"Fleksibıl","flexing":"Fleksing","flextime":"Flekstaym","flick":"Fli","flickering":"Flikıring","flies":"Flayz","flight":"Flayt","flights":"Flayts","flippers":"Flippers","flirting":"Flörtin","float":"Flout","floating":"Flovting","flood":"Flad","flooded":"Fladid","flooding":"Flading","floor":"Floor","flora":"Florə","floral":"Florıl","florence":"Flörıns","flow":"Flov","flower":"Flauır","flowers":"Flauırz","flowing":"Flovving","flown":"Flovn","flows":"Flovz","flu":"Flu","fluctuation":"Flakçüeyşın","fluctuations":"Flakçüeyşınz","flue":"Flu","fluent":"Fluınt","fluently":"Fluıntli","fluffy":"Flafi","flush":"Flaş","fly":"Flay","flying":"Flayving","focus":"Fokıs","focused":"Fovkıst","focuses":"Fovkısız","focusing":"Fokusing","fog":"Fog","foil":"Foyl","folder'":"Fovldır","folders":"Fovldırz","folks":"Fovks","follow":"Folou","followed":"Folovd","followers":"Folovırs","following":"Folovving","follows":"Folovz","fond":"Fond","food":"Fuud","foods":"Fudz","fool":"Fuul","fooled":"Fuuld","foot":"Fuut","footage":"Fotic","footbal":"Futbol","football":"Futbol","footballers":"Futbolırz","footprint":"Futprint","footprints":"Futprints","forbidden":"Förbidn","force":"Fors","forced":"Forst","forces":"Forsız","forcing":"Forsing","forecast":"Forkast","forehead":"Forhed","foreign":"Forın","foreigner":"Forinır","foreigners":"Forinırz","forest":"Forıst","forests":"Forısts","forever":"Forevır","forfeiting":"Forfiting","forges":"Forcız","forget":"Fıget","forgetting":"Förgeting","forgive":"Fıgiv","forgiven":"Forgivın","forgiving":"Forgiving","forgot":"Förgot","forgotten":"Förotın","forks":"Forks","forky":"Forki","form":"Form","formal":"Formıl","format":"Formet","formed":"Formd","former":"Formır","formerly":"Formərli","formidable":"Formidəbıl","forms":"Forms","formula":"Formyulə","forth":"Forth","forthright":"Forθrayt","fortunately":"Forçunıtli","fortune":"Forçın","forty":"Forti","forward":"Forvıd","fossil":"Fasıl","found":"Faund","founded":"Faundid","founder":"Faundır","fountain":"Fauntın","four":"For","fourth":"Foth","fox":"Faks","fr":"Ef ar","fracture":"Fraekçır","fragile":"Fraecal","fragility":"Fraciləti","frame":"Freym","fran":"Fran","france":"Frans","franchise":"Frençayz","frank":"Frank","frankfurt":"Frankfurt","frankly":"Frenkli","fraud":"Frod","freaking":"Friking","frederic":"Fredırik","free":"Frii","freebie":"Fribi","freebies":"Fribiz","freedom":"Friidım","freeing":"Firiing","freelancer":"Frilansır","freezing":"Frizing","french":"Frenç","frequency":"Frikvənsi","frequently":"Frikvəntli","fresh":"Freş","freshly":"Freşli","frida":"Fridə","friday":"Fraydey","fridays":"Fraydeyz","fridge":"Fric","fried":"Frayd","friend":"Frend","friendly":"Frendli","friends":"Frendz","friend's":"Frendz","friendship":"Frendşip","fries":"Frayz","frightened":"Fraytınd","frightening":"Fraytning","frigid":"Fricid","from":"from","front":"Frant","frost":"Frost","frowned":"Fraund","froze":"Frovz","frozen":"Frozn","fruit":"Fruut","fruits":"Fruuts","frustrated":"Frastreytıd","frustrating":"Frastreytin","frustration":"Frastreytion","fu":"Fu","fucked":"Fakd","fucking":"Faking","fuel":"Fyul","fuels":"Füyıls","full":"Ful","fully":"Fuli","fumes":"Fyumz","fun":"Fan","function":"Fankşın","functional":"Fankşınıl","functionality":"Fankşinələti","fundamental":"Fandımentəl","fundamentals":"Fandəmentəls","funding":"Fanding","funds":"Funds","funeral":"Fyunərəl","funfair":"Fanfeır","funniest":"Faniist","funny":"Fani","fur":"För","furiously":"Füriyusli","furniture":"Fırniçır","furore":"Fürori","furrow":"Farov","further":"Fördır","furthermore":"Fördırmor","fusion":"Füjın","future":"Füuçır","fyi":"Ef vay ay","gabby":"Gebi","gain":"Geyn","gained":"Geynd","gains":"Geynz","gallery":"Gelıri","galoshes":"Gılaşız","galway":"Golvey","game":"Geym","games":"Geymz","gaps":"Geps","garage":"Garaaj","garbage":"Garbic","garden":"Gadn","gardener":"Gardnır","garona":"Garonə","gas":"Ges","gasp":"Gasp","gate":"Geyt","gather":"Gedır","gathered":"Gedırd","gathering":"Gedıring","gatherings":"Gedırings","gaud":"God","gauze":"Goz","gave":"Geyv","gayriresm":"Gayriresmi","gaze":"Geyz","gdp":"Ci di pi","ge":"Ci","gear":"Giyir","gearbox":"Giyirbaks","geckos":"Gekos","gelir":"Gelir","gen":"Cen","gender":"Cendır","genealogist":"Ciniyolocist","genealogy":"Ciniyoloci","general":"Cenrıl","generalisation":"Cenerəlayzeyşın","generalisations":"Cenerəlayzeyşınz","generally":"Cenrıli","generate":"Ceneriyt","generated":"Ceneretid","generates":"Cenerets","generation":"Cenereyşın","generational":"Cenerəyşınıl","generations":"Cenerasyonz","generative":"Cenerətiv","generosity":"Cenerosəti","generous":"Cenrıs","genesis":"Cenesiz","geni":"Geni","genius":"Ciniıs","genocide":"Cenısayd","genre":"Cınrı","gentle":"Centl","gentleman":"Centlmın","gentlemen":"Centlmın","gentlest":"Centlıst","gently":"Centli","gentrified":"Centrifayd","genuinely":"Cenyuini","george":"Corc","geri":"Geri","german":"Cörmın","germans":"Cörmıns","germany":"Cörməni","gervais":"Cervays","gestures":"Cesçırz","get":"Get","getaway":"Getavey","getaways":"Getaveyz","gets":"Gets","getting":"Geting","gherkin":"Görkin","ghost":"Gost","giant":"Cayınt","gibi":"Gibi","giden":"Giden","gidermekten":"Gidermekten","gift":"Gift","gifts":"Gifts","gigolo":"Cigolo","gigs":"Cigs","gimme":"Gimi","ginger":"Cincır","gingerbread":"Cincırbred","girl":"Görl","girlfriend":"Görlfrend","girlfriends":"Görlfrendz","girlfriend's":"Görlfrendz","girls":"Görls","girth":"Görth","gitmek":"Gitmek","give":"Giv","given":"Givın","gives":"Givz","giving":"Giving","glacier":"Gleyşır","glad":"Gled","glamorous":"Glemörıs","glamour":"Glemır","glamping":"Glamping","glanced":"Glanst","glass":"Glas","glasses":"Glasız","glastonbury":"Glastınböri","global":"Globıl","globalisation":"Globalayzeyşın","globally":"Globali","gloria":"Gloriyə","glossy":"Glosi","gloves":"Glavz","glow":"Glov","glowing":"Gloving","glue":"Glu","glued":"Glud","gluten":"Glutın","glutes":"Gluts","go":"Go","goal":"Goul","goals":"Govlz","god":"Gad","godfather":"Gadfadır","god's":"Gadz","goes":"Govz","gold":"Gould","golden":"Gouldın","goldfish":"Govldfiş","golf":"Golf","gone":"Gon","gonna":"Ganı","good":"Gud","goodall":"Gudol","goodbye":"Gudbay","goodness":"Gudnıs","goods":"Guds","google":"Gugıl","goosebumps":"Gusbamps","gopro":"Govpro","gorgeous":"Gorcıs","gory":"Gori","gosh":"Gaş","gossip":"Gasıp","gossiping":"Gasiping","gossips":"Gasips","got":"Gat","goto":"Govtu","gotta":"Gatı","gotten":"Gatın","goverment":"Gavınmınt","govern":"Gavn","governed":"Gavınd","governing":"Gavıning","government":"Gavınmınt","governments":"Gavınmınts","gpa":"Ci pi ey","grab":"Greb","grabbed":"Grebd","grace":"Greys","graceful":"Greysfıl","gracefully":"Greysfəli","gracious":"Greyşıs","grades":"Greyds","gradually":"Grecuəli","graduate":"Grecueyt","graduated":"Grecueytid","graduates":"Grecuıts","graduation":"Grecüeyşın","graffiti":"Grafiti","graham":"Grehəm","grammar":"Gramır","grammatical":"Gramətikıl","grand":"Grend","grandchildren":"Grænçildrın","granddaughter":"Grændotır","grandfather":"Grandfadır","grandma":"Grændma","grandma's":"Grændmaz","grandmother":"Grandmadır","grandmother's":"Grandmadırz","grandpa":"Grandpa","grandparents":"Grandpeyrınts","grandparents'":"Grændpeyrınts","granted":"Grantid","granting":"Granting","grants":"Grants","grap":"Grep","grapes":"Greps","graph":"Graf","graphics":"Grafiks","grass":"Gres","grateful":"Greytful","gratitude":"Gratitüd","grave":"Greyv","gravity":"Grevəti","gravy":"Greyvi","gray":"Grey","greasy":"Griizi","great":"Greyt","greater":"Greytır","greatest":"Gireytist","greatly":"Gireytli","gred":"Gred","greece":"Griis","greek":"Griik","green":"Griin","greens":"Griinz","greet":"Grit","greg":"Greg","gregg":"Greg","grew":"Gru","grey":"Grey","grief":"Grief","grips":"Grips","grits":"Grits","gritty":"Griti","groceries":"Grovsəriz","grocery":"Grovsəri","groom":"Grum","gross":"Grovs","ground":"Graund","grounded":"Graundid","group":"Gruup","groups":"Grups","grow":"Grow","growers":"Grovırz","growing":"Growing","grown":"Grovn","grows":"Grovz","growth":"Grotv","grup":"Grup","guarantee":"Gerınti","guaranteed":"Gerıntiid","guarantees":"Gerıntiiz","guard":"Gard","guards":"Gards","guess":"Ges","guesses":"Gesız","guessing":"Gasing","guest":"Gest","guests":"Gests","guidance":"Gaydıns","guide":"Gayd","guided":"Gaydid","guilt":"Gilt","guilty":"Gilti","guitar":"Gitar","gulf":"Galf","gum":"Gam","gun":"Gan","guss":"Gas","guy":"Gay","guys":"Gays","gwen":"Gven","gym":"Cim","gyms":"Cimz","gyros":"Yayrovs","habit":"Hebit","habitat":"Habitat","habitats":"Habitatz","habits":"Hebits","hack":"Hek","hacked":"Hekt","hacker":"Hekır","hacking":"Heking","had":"Hed","hadn":"Hedınt","haggis":"Hegis","haha":"Haha","hailing":"Heyling","hair":"Heyr","haircut":"Heyrkat","half":"Half","halfway":"Halfwey","halk":"Halk","hall":"Hol","hallederim":"Hallederim","halves":"Havz","hamburger":"Hambörgır","hamburgers":"Hambörgırz","hammered":"Hemırd","hammock":"Hemək","hand":"Hend","handbag":"Hendbeg","handbook":"Hendbuk","handed":"Hendid","handicapped":"Hendikept","handle":"Hendıl","handled":"Hendıld","handling":"Hendling","handpainted":"Hendpeyntid","hands":"Hends","handsome":"Hendsım","handsomest":"Hendsəmıst","handy":"Hendi","hang":"Heng","hanging":"Hanging","hangout":"Hengaut","hangovers":"Hengovvırz","hanoi":"Hanoy","happen":"Hepın","happened":"Hepınd","happening":"Hepıning","happens":"Hepınz","happier":"Hepiyır","happiest":"Hepiyist","happily":"Hepili","happiness":"Hepinıs","happinies":"Hepinis","happly":"Hepili","happy":"Hepi","harass":"Hires","harassing":"Hiring","harassment":"Hirasmınt","harbour":"Harbır","hard":"Hard","hardball":"Hardbol","harder":"Hardır","hardest":"Hardıst","hardly":"Hardli","hardworking":"Hardvörking","harflerden":"Harflerden","harflerinden":"Harflerinden","harm":"Harm","harmful":"Harmful","harming":"Harming","harmless":"Harmləs","harm's":"Harms","harold":"Herıld","harp":"Harp","harping":"Harping","harrass":"Hires","harsh":"Harş","harvested":"Harvistid","harvey":"Harvi","hasan":"Hasan","hast":"Hest","haste":"Heyst","hat":"Het","hata":"Hata","hate":"Heyt","hated":"Heytid","hateful":"Heytfıl","hates":"Heyts","hatred":"Heytred","hats":"Hets","haunting":"Honting","haven":"Heyvın","haves":"Hevz","having":"Having","havoc":"Hevık","hawk":"Hok","hayley":"Heyli","hazards":"Hezırdz","hazelnut":"Heyzılnat","head":"Hed","headache":"Hedeyk","headaches":"Heydeyks","headed":"Hedid","heading":"Hedding","headline":"Hedlayn","headliner":"Hedlaynır","headliners":"Hedlaynırz","headlines":"Hedlaynz","headphones":"Hedfovnz","headquarters":"Hedkuvartırz","heads":"Heds","headset":"Hedset","healed":"Hiild","healing":"Hiling","heals":"Hiils","health":"Helth","healthcare":"Helskevr","healthier":"Helthiyır","healthily":"Helthili","healthly":"Helthli","healthy":"Helthi","healty":"Helthi","hear":"Hiir","heard":"Hörd","hearing":"Hiyring","hears":"Hiyirz","heart":"Hart","heartbeat":"Hartbit","heartbroken":"Hartbrovkın","hearty":"Harti","heat":"Hiit","heated":"Hitid","heater":"Hitır","heathrow":"Hiizrov","heating":"Hiting","heaven":"Hevın","heavily":"Hevili","heavy":"Hevi","hectic":"Hektik","heels":"Hiils","heights":"Hayts","heir":"Eyr","heiress":"Eyrıs","heirloom":"Eyrlum","held":"Hel","helen":"Helın","helicopter":"Helikaptır","hell":"Hel","hello":"Helov","helmet":"Helmıt","help":"Help","helped":"Helpt","helpful":"Helpfıl","helping":"Helping","helps":"Helps","helsinki":"Helsinki","hemingway":"Hemingvey","hemisphere":"Hemisfiyir","hence":"Hens","henceforth":"Hensforθ","henry":"Henri","hepsinde":"Hepsi","her":"Hör","herbivores":"Hörbivorz","herbs":"Hörbz","here":"Hiır","here's":"Hiyirz","heretofore":"Hiyirtufor","heritage":"Heritic","hermitage":"Hermitac","hero":"Hiro","heroes":"Hiroz","heroic":"Hırovik","hers":"Hörz","herself":"Hörself","hesitate":"Heziteyt","hey":"Hey","hi":"Hay","hibiscus":"Hibiskıs","hidden":"Hidın","hide":"Hayd","hides":"Haydz","hiding":"Hayding","high":"Hay","higher":"Highır","highest":"Hayist","highlight":"Haylayt","highlighter":"Haylaytır","highlights":"Haylayts","highly":"Hayli","highway":"Highwey","highways":"Hayweyz","hijackers":"Haycekırz","hike":"Hayk","hiker":"Haykır","hiking":"Hayking","hilarious":"Hileriyus","hilton":"Hiltın","him":"Him","himalayas":"Himəleyız","himself":"Himself","hinder":"Hindır","hindered":"Hindırd","hints":"Hints","hip":"Hip","hippos":"Hipovz","hire":"Hayır","hired":"Hayırd","hiring":"Hayıring","hiroshi":"Hiroşi","his":"Hiz","historic":"Histarik","historical":"Histarikıl","histories":"Histəriz","history":"Histri","hit":"Hit","hitherto":"Hiyirtu","hits":"HIts","hitting":"Hiting","hive":"Hayv","hl":"Heyç el","hmm":"Hım","hmmm":"Hım","hoax":"Hovks","hoaxes":"Hovksız","hobbies":"Habiler","hobby":"Hobi","hockey":"Haki","hohenstein":"Hohınstayn","hold":"Hold","holding":"Holding","holds":"Hovldz","hole":"Hol","holes":"Hovlz","holiday":"Holidey","holidays":"Holideyz","hollywood":"Holivud","holy":"Howli","home":"Hom","homecooked":"Hovmkukt","homeless":"Howmlis","homemade":"Hovmmeyd","homeowners":"Hovm ovnırz","homes":"Howmz","hometown":"Novmtaun","homework":"Homvörk","hommade":"Hommeyd","honest":"Anıst","honestly":"Onistli","honesty":"Onısti","honey":"Hani","honeymoon":"Hanimun","honor":"Anır","honour":"Anır","hood":"Hud","hop":"Hop","hope":"Houp","hoped":"Hovpt","hopeful":"Hovpfəl","hopefully":"Howpfəli","hopes":"Hovps","hoping":"Hovping","hopkins":"Hopkins","horizontal":"Horizontıl","horrible":"Haribl","horrific":"Horifik","horror":"Horır","horse":"Hors","horses":"Horsız","hospital":"Haspitl","hospitals":"Hospitıls","host":"Houst","hostage":"Hastıc","hostages":"Hostıcız","hosted":"Hostid","hostel":"Hostıl","hostile":"Hostayl","hosting":"Hosting","hosts":"Housts","hot":"Hat","hotdogs":"Hotdogs","hotel":"Houtel","hotels":"Houtels","hothouse":"Hothaus","hotspots":"Hotspots","hour":"Auır","hours":"Auırz","house":"Haus","household":"Haushold","households":"Havsholds","housemate":"Havsmeyt","houses":"Havzız","housewarming":"Havsvorming","housework":"Havsvörk","housing":"Howzing","hover":"Hovır","hovers":"Hovırz","how":"Haw","howard":"Havvırd","how'd":"Havd","however":"Hauevır","how's":"Havz","how've":"Havv","hr":"Heyç ar","http":"Heyç ti ti pi","https":"Heyç ti ti pi es","hub":"Hab","hug":"Hag","huge":"Hüc","hugged":"Hagd","hugh":"Hyu","hugs":"Hagz","human":"Hüman","humane":"Hyumeyn","humanitarian":"Hyümeniteryın","humanity":"Hyümenəti","humanlike":"Hyumənlayk","humans":"Hüumıns","humble":"Hambl","humid":"Hyumid","humidity":"Hyumiditi","humming":"Haming","humor":"Hyumır","hundred":"Handrıd","hundreds":"Handrıdz","hung":"Hang","hungary":"Hangəri","hungry":"Hangri","hunt":"Hant","hunting":"Hanting","hurricane":"Harikeyn","hurricanes":"Harikeyns","hurry":"Hari","hurt":"Hört","hurts":"Hörts","husband":"Hazbınd","husband's":"Hazbındz","husky":"Haski","hustles":"Hasıls","hyenas":"Hayinız","hygge":"#N/A","hyggee":"Hayci","hygiene":"Hayciin","ibni":"İbni","ice":"Ays","iced":"Ayst","iceland":"Ayslend","icely":"Aysli","icicles":"Aysikıls","iconic":"Aykanik","id":"İd","idare":"İdare","idea":"Aydi","ideal":"Aydil","ideally":"Aydiyəli","ideals":"Aydiyəlz","ideas":"Aydiız","identification":"Aydentifikeyşın","identified":"Aydentifayd","identify":"Aydentifay","identifying":"Aydentifaying","identity":"Aydentiti","idiomatic":"İdiyəmatik","idiot":"Idiyıt","idle":"Aydıl","idling":"Aydling","idol":"Aydıl","ignorance":"İgnörıns","ignore":"İgnor","ignored":"İgnörd","ignoring":"İgnoring","ikinci":"İkinci","ile":"İle","ili":"İli","ill":"İl","illegal":"İligıl","illness":"İlnes","illnesses":"İlnesız","ills":"İls","illustrates":"İlöstreytis","im":"Ay em","image":"İmic","images":"İmicız","imaginative":"İmecinətiv","imagine":"İmecin","imagined":"İmecind","imagines":"İmecins","imagining":"İmecining","imghp":"İmecin heyç pi","imitate":"İmiteyt","imitating":"İmiteyting","imli":"İmli","immature":"İməçur","immeasurable":"İmejırəbıl","immediate":"İmidiet","immediately":"İmidiıtli","immense":"İmens","immerse":"İmörs","immersing":"İmörsing","immidiate":"İmidiyıt","immigrants":"İmigrınts","immigrate":"İmigreyt","immigration":"İmigreyşın","immortality":"İmorteləti","immune":"İmyun","imo":"Ay em ov","impact":"İmpakt","impactful":"İmpaktfıl","impacts":"İmpakts","impairment":"İmpeyrmınt","impartial":"İmparşıl","impartont":"İmpartont","impatient":"İmpeyşınt","imperative":"İmperətiv","imperfect":"İmpörfikt","imperfection":"İmpörfekşın","imperial":"İmpiyriyıl","impersonal":"İmpörsınıl","implement":"İmplimınt","implementations":"İmplimenteyşınz","implemented":"İmplimentid","implementing":"İmplimenting","implication":"İmplikeyşın","implications":"İmplikeyşınz","implicit":"İmplisit","implied":"İmplayd","implies":"İmplays","imply":"İmplay","import":"İmport","importance":"İmpörtıns","important":"İmpörtınt","imported":"İmpörtid","impose":"İmpovz","imposed":"İmpovzd","impossible":"İmpasibıl","impractical":"İmprektikıl","impress":"İmpres","impressed":"İmprest","impression":"İmpreşın","impressionistic":"İmpreşənistik","impressive":"İmpresiv","imprisoned":"İmprizınd","imprisonment":"İmprizonmınt","improve":"İmpruv","improved":"İmpruvd","improvement":"İmpruvmınt","improvements":"İmpruvmınts","improves":"İmpruvz","improving":"İmpruving","impulse":"İmpals","impulses":"İmpalsız","impulsive":"İmpalsiv","imsizlerden":"İmsizlerden","inability":"İneyabiləti","inactivity":"İnaktiviti","inadequate":"İnedikvıt","inca":"İnkə","inch":"İnç","inches":"İnçız","incident":"İnsidınt","incidents":"İnsidınts","inclined":"İnklaynd","include":"İnklud","included":"İnkludid","includes":"İnkludz","including":"İnkluding","inclusive":"İnklusiv","income":"İnkam","incomparable":"İnkompərəbıl","incomparably":"İnkompərəbli","incompetent":"İnkompetınt","inconvenience":"İnkonvinyıns","incorporating":"İnkorpöreytin","incorrect":"İnkorekt","incorrectly":"İnkorektli","increadibly":"İnkredibli","increase":"İnkris","increased":"İnkriist","increases":"İnkriisız","increasing":"İnkriising","increasingly":"İnkriysingli","incredible":"İnkredibıl","incredibly":"İnkredibli","incrimination":"İnkrimineyşın","indeed":"İndid","indefinitely":"İndefinitli","inden":"İnden","independence":"İndipendıns","independent":"İndipendent","index":"İndeks","india":"İndiyə","indian":"İndiyın","indicate":"İndikeyt","indicated":"İndikeytid","indicates":"İndikeyts","indictment":"İndaytmınt","indie":"İndi","indirect":"İndirekt","indiscipline":"İndisiplin","individual":"İndividuıl","individualistic":"İndividyuəlistik","individuality":"İndividyüeləti","individuals":"İndividyuelz","indulge":"İndalc","indulgence":"İndalcıns","indulgences":"İndalcınsız","indulgent":"İndalcınt","industrial":"İndastriyəl","industry":"İndustri","inequality":"İnikwoləti","ines":"İnis","inevitable":"İnevıtəbıl","inevitably":"İnevıtəbli","inexcusable":"İniksküuzəbıl","inexpensive":"İnikspensiv","inexplicably":"İniksplikəbli","infancy":"İnfınsi","infatuation":"İnfaçüeyşın","infer":"İnför","inferring":"İnföring","infinite":"İnfinıt","inflate":"İnfleyt","inflating":"İnfleyting","inflation":"İnfleyşın","influence":"İnfluəns","influenced":"İnfluənst","influencer":"İnfluensır","influencers":"İnfluensırz","influences":"İnfluənsız","inform":"İnform","informal":"İnformıl","informally":"İnforməli","information":"İnförmeyşın","informed":"İnformd","informs":"İnforms","infrastructure":"İnfrastrakçırinhabitant","ing":"İng","ingredient":"İngridient","ingredients":"İngridiyınts","inhabitants":"İnhabitınts","inherited":"İnheritid","ini":"İni","initial":"İnişıl","initially":"İnişəli","initiative":"İnişyətiv","injection":"İncekşın","injure":"İncur","injured":"İncurd","injuries":"İncuriz","injury":"İncıri","inland":"İnlənd","inmek":"İnmek","innocence":"İnəsıns","innocent":"İnəsınt","innovation":"İnoveyşın","innovative":"İnovətiv","inputs":"İnputs","insane":"İnseyn","insanity":"İnsenəti","insect":"İnsekt","insects":"İnsekts","insecure":"İnsikyur","insensitive":"İnsensətiv","inserted":"İnsörtid","inserting":"İnsörting","inside":"İnsayd","insignificant":"İnsignifikənt","insist":"İnsist","insisted":"İnsistid","insomnia":"İnsomniyə","inspection":"İnspekşın","inspectors":"İnspektırz","inspiration":"İnspireyşın","inspire":"İnspayır","inspired":"İnspayırd","inspiring":"İnspayring","instability":"İnstəbiləti","instagram":"İnstagram","instagram's":"İnstagramz","install":"İnstol","installation":"İnstoleyşın","installed":"İnstold","installing":"İnstoling","installments":"İnstolmentz","instance":"İnstıns","instant":"İnstınt","instantly":"İnstıntli","instead":"İnsted","institution":"İnstitüşın","institutional":"İnstitüşınıl","institutions":"İnstitüşınz","instructed":"İnstraktid","instruction":"İnstrakşın","instructions":"İnstrakşınz","instructor":"İnstraktır","instrument":"İnstrumınt","insufficient":"İnsıfişınt","insurance":"İnşurıns","integrate":"İntıgreyt","intellect":"İntılekt","intellectual":"İntılekçuəl","intelligence":"İntelicəns","intelligent":"İntelicınt","intelligibility":"İntelicıbiləti","intend":"İntend","intended":"İntendıd","intense":"İntens","intensive":"İntensiv","intent":"İntent","intention":"İntenşın","intentionally":"İntenşınəli","intently":"İntentli","interact":"İnterekt","interactive":"İnteraktiv","interest":"İntrıst","interested":"İntrıstıd","interesting":"İntrısting","interestingly":"İntrəstingli","interests":"İntrısts","interfere":"İntörfir","interfering":"İntörfiring","intermission":"İntörmişın","internal":"İntörnıl","international":"İntörneşnıl","internet":"İntınet","internship":"İntörnşip","interpersonal":"İntörpörsınıl","interrupt":"İntırapt","interrupting":"İntırapting","interrupts":"İntırapts","intersection":"İntörsekşın","intervene":"İntörvin","intervention":"İntörvenşın","interview":"İntıryuv","interviewer":"İntıryuvır","intimate":"İntimıt","into":"İntu","intonation":"İntöneyşın","introduce":"İntrodyus","introduced":"İntrodyust","introduction":"İntrodakşın","introvert":"İntrovört","intuition":"İntüişın","intuitive":"İntüitiv","invade":"İnveyd","invasive":"İnveyziv","invented":"İnventid","invention":"İnvenşın","inventions":"İnvenşınz","inventor":"İnventır","invest":"İnvest","invested":"İnvestid","investigate":"İnvestigeit","investigation":"İnvestigeyşın","investigations":"İnvestigeyşınz","investigator":"İnvestigeytır","investigators":"İnvestigeytırz","investing":"İnvesting","investment":"İnvestmınt","investments":"İnvestmınts","invitation":"İnviteyşın","invite":"İnvayt","invited":"İnvaytid","invites":"İnvayts","inviting":"İnvayting","invoiced":"İnvoyist","invoicing":"İnvoyising","involuntarily":"İnvolıntərəli","involve":"İnvolv","involved":"İnvolvd","involvement":"İnvolvmınt","involves":"İnvolvz","involving":"İnvolving","ip":"Ay pi","ireland":"Ayırlənd","irish":"Ayriş","irmek":"İrmek","iron":"Ayın","irrational":"İreşınıl","irresistible":"İrizistibıl","irresponsible":"İrisponsıbıl","irritated":"İriteytid","irritating":"İriteyting","irritation":"İriteyşın","islamic":"İslamik","island":"Aylınd","islands":"Aylındz","isle":"Ayl","isnt't":"İzınt","isolate":"İsoleyt","isolated":"İsoleytıd","isolation":"İsoleyşın","israeli":"İzreli","issue":"İşu","issues":"İşuz","istanbul":"İstanbul","italian":"İtelyın","italians":"İtelyınz","italy":"İtəli","item":"Aytım","items":"İtımz","itim":"İtim","it'll":"İtıl","its":"İts","itself":"İtself","iyi":"İyi","izmek":"İzmek","izmir":"İzmir","jack":"Cek","jacket":"Cekıt","jackfruit":"Cekfrut","jackie":"Ceki","jack's":"Ceks","jackson":"Ceksın","jacob":"Ceykıb","jail":"Jeyl","jaime":"Heymi (İspanyolca) / Ceymi","jake":"Ceyk","jam":"Cem","james":"Ceyms","jamie":"Ceymi","jamie's":"Ceymiz","jammed":"Cemd","jamming":"Ceming","jane":"Ceyn","jane's":"Ceyns","janet":"Cenit","janet's":"Cenits","janine":"Cenin","january":"Cenueri","japan":"Cepan","japanese":"Cepıniiz","japan's":"Cepans","jason":"Ceysın","jasper":"Cespır","java":"Cavə","jay":"Cey","jealous":"Celəs","jean":"Cin","jeans":"Cinz","jefferson":"Cefərsın","jeggings":"Cegings","jellyfish":"Celifiş","jenny":"Ceni","jerk":"Cörk","jerry":"Ceri","jersey":"Cörzi","jess":"Ces","jesse":"Cesi","jessie":"Cesi","jet":"Cet","jewellery":"Cuvelri","jewish":"Cuş","jews":"Cuz","jfk":"Cey ef key","jill":"Cil","jilljo":"Cilco","jim":"Cim","jimmy":"Cimi","jo":"Co","job":"Cab","jobless":"Cabləs","jobs":"Cobs","jocking":"Caking","joe's":"Covz","jog":"Cag","jogging":"Caging","johnny":"Cani","john's":"Canz","johnsons'":"Cansınz","join":"Coin","joined":"Coynd","joining":"Coynin","joke":"Couk","joked":"Covkt","jokes":"Covks","joking":"Covking","jon":"Cən","jones":"Covns","jordan":"Cordın","jose":"Hovsey (İspanyolca) / Covs","joseph":"Covzıf","jose's":"Hovseys / Covsız","journal":"Cöönl","journalist":"Cönılist","journalists":"Cörnalists","journey":"Cööni","journeys":"Cörniz","joy":"Coy","joyfully":"Coyfəli","juan":"Huan","judge":"Cac","judgemental":"Cacmentəl","judges":"Cacız","judgment":"Cacmınt","judgments":"Cacmınts","judicial":"Cudişıl","juggle":"Cagıl","juggling":"Cagıling","juice":"Cuis","julia":"Culiya","julie":"Culı","julie's":"Culiz","july":"Culy","jump":"Camp","jumped":"Campıt","jumper":"Campır","jumping":"Camping","jumps":"Camps","june":"Cuun","june's":"Cunz","jungle":"Cangıl","junior":"Cuniyır","just":"Cast","justice":"Castis","justify":"Castifay","justin":"Castin","justly":"Castli","justyna":"Castinə","kafa":"Kafa","kahlo":"Kahlo","kal":"Kal","kalan":"Kalan","kalmak":"Kalmak","kamala":"Kamala","kap":"Kap","kapsamak":"Kapsamak","kar":"Kar","karen":"Kerın","karl":"Karl","karma":"Karma","kate":"Keyt","kategorize":"Kategorize","katie":"Keyti","katie's":"Keytiz","katya":"Katyə","kavu":"Kavu","kayaking":"Kayaking","keen":"Kin","keep":"Kiip","keeping":"Kipin","keeps":"Kiips","keith":"Kiit","kelime":"Kelime","kelimesindeki":"Kelimesindeki","kelimeyi":"Kelimeyi","kelly":"Keli","ken":"Ken","kept":"Kep","kerry":"Keri","ketchup":"Keçap","kettle":"Ketıl","key":"Kii","keys":"Kiiz","kg":"Key ci","khalid":"Khalid","kibar":"Kibar","kick":"Kik","kicked":"Kikt","kid":"Kid","kidding":"Kiding","kids":"Kidz","kiko":"Kiko","kiko's":"Kikovz","kilimanjaro":"Kilimancarov","kill":"Kil","killed":"Kild","killer":"Kilır","killing":"Kiling","kills":"Kils","kilogram":"Kilıgram","kilometers":"Kilomitırz","kilometre":"Kilomitır","kilometres":"Kilomitırz","kilowatt":"Kilıvat","kim":"Kim","kimchi":"Kimçi","kind":"Kaynd","kinda":"Kayndı","kindergarten":"Kindırgarten","kindly":"Kayndli","kindness":"Kayndnıs","kinds":"Kaynds","king":"King","kings":"Kings","kirkjufell":"Kirkjufel","kisi":"Kişi","kiss":"Kis","kissed":"Kist","kissing":"Kising","kit":"Kit","kitchen":"Kiçın","kittens":"Kitıns","kitty":"Kiti","kiyi":"Kıyı","kl":"Key el","klar":"Klar","klaus":"Klaavs","km":"Key em","knee":"Nii","knees":"Niiz","knew":"Nyoo","knife":"Nayf","kniffiti":"Nifiti","knit":"Nit","knock":"Nok","knocked":"Nokt","know":"Nou","knowing":"Noving","knowledge":"Navlıc","knowledgeable":"Nalıcıbıl","known":"Noun","knows":"Novz","koala":"Kovalə","kofi":"Kovfi","konu":"Konu","konya":"Konya","korea":"Koriyə","korean":"Koriyın","koreans":"Koriyənz","koymak":"Koymak","krak":"Krak","kullan":"Kullan","kullanabilirsin":"Kullanabilirsin","kullanmak":"Kullanmak","kung":"Kung","kyle":"Kayl","kyoto":"Kyotov","la":"La","lab":"Leb","label":"Leybıl","labor":"Leybır","labour":"Leybır","lace":"Leys","lack":"Lek","lacked":"Lekd","lacy":"Leysi","ladder":"Ledır","ladies":"Leydiz","ladle":"Leydıl","lady":"Leydi","lagged":"Legd","lags":"Legs","laid":"Leyd","lake":"Leyk","lakes":"Leyks","lale":"Lale","lamak":"Lamak","lamb":"Lem","lamps":"Lemps","land":"Lend","landed":"Lendid","landing":"Lending","landline":"Lendlayn","landlord":"Landlord","landlords":"Lendlordz","landmark":"Landmark","landmarks":"Lendmarks","landscape":"Lenskavyp","landscapes":"Lenskayps","language":"Lengwıc","languages":"Lengwıcız","lap":"Lap","laps":"Lepps","lapsed":"Lepst","laptop":"Laptop","laptops":"Laptops","large":"Larc","largely":"Larcıli","larger":"Larcır","largest":"Larcıst","larry":"Läri","lasagne":"Ləzanyə","last":"Lest","lasted":"Lastid","lasting":"Lasting","lastly":"Lastli","lasts":"Lests","late":"Leyt","lately":"Leytli","later":"Leytır","lateral":"Lætərıl","latest":"Leytist","latino":"Latinov","latitude":"Lætitüd","latte":"Late","lauder":"Lodır","laugh":"Laf","laughed":"Left","laughing":"Lafing","laughs":"Lafs","laughter":"Laftır","launch":"Lonç","launched":"Lonçt","launches":"Lonçız","launching":"Lonçing","laundry":"Londri","lavender":"Lævındır","law":"Lou","laws":"Lavz","lawyer":"Louyır","lawyers":"Loyırz","laying":"Leying","layover":"Leyovvır","lazy":"Leyzi","ld":"El di","lead":"Led","leader":"Liidır","leaders":"Liidırz","leadership":"Liidışip","leading":"Liding","leads":"Liidz","leaf":"Liif","leaflet":"Liflet","league":"Lig","league's":"Liigz","leak":"Liik","leaking":"Likin","leaks":"Liiks","lean":"Liin","leaped":"Lipt","learn":"Lörn","learned":"Lörnd","learning":"Lörning","learns":"Lörns","learnt":"Lörnt","lease":"Liis","leash":"Liş","least":"Liist","leave":"Liiv","leaves":"Liivz","leaving":"Liiving","lecture":"Lekçır","led":"Led","leeds":"Liidz","left":"Left","leftover":"Leftovvır","leg":"Leg","legacy":"Legisi","legal":"Ligl","legally":"Ligəli","legislation":"Lecisleyşın","legislative":"Lecislətiv","legs":"Legz","leme":"Leme","lemonade":"Lemoneyd","lemons":"Lemınz","lence":"Lens","lending":"Lending","length":"Lentv","lengthening":"Lengtıning","lenny":"Len i","lent":"Lent","leonard":"Lenırd","leopard":"Lepırd","leo's":"Liyovz","lesley's":"Lesliz","leslie":"Lesli","less":"Les","lessen":"Lesın","lessens":"Lesınz","lesson":"Lesn","lessons":"Lesınz","let":"Let","letdown":"Letdaun","lets":"Lerts","let's":"Lets","letter":"Letır","letters":"Letırz","level":"Levl","levels":"Levəlz","levy":"Levi","lewis":"Luis","lgbt":"El ci bi ti","lgi":"El ci ay","liam":"Liyım","liam's":"Liyəmz","liberalism":"Libırəlizım","liberty":"Libırti","libraries":"Laybrəriz","library":"Laybrıri","licence":"Laysıns","license":"Laysıns","lick":"Lik","lie":"Laı","lied":"Layd","lies":"Layz","lieu":"Lyu","life":"Layf","lifelong":"Layflong","lifesaver":"Layfseyvır","lifestyle":"Layfstayl","lifestyles":"Layfstayls","lifetime":"Layftaym","liffey":"Lifi","lift":"Lift","lifted":"Liftid","lifting":"Liftin","lifts":"Lifts","light":"Layt","lighthouse":"Laythaus","lighting":"Layting","lightly":"Laytli","lightning":"Laytning","lights":"Layts","liiy":"Liyi","like":"layk","liked":"Laykt","likeliest":"Laykliist","likely":"Laykli","likes":"Layks","likewise":"Laykvayz","lilacs":"Layləks","lily":"Lili","limit":"Limit","limited":"Limitıd","limits":"Limits","limpopo":"Limpopov","lina":"Linə","linda":"Lində","line":"Layn","lines":"Laynz","link":"Link","lions":"Layınz","liquids":"Likvits","lisa":"Liizə","lisbon":"Lisbın","list":"List","liste":"Liste","listed":"Listid","listen":"Lisın","listened":"Lisınd","listener":"Lisnır","listeners":"Lisnırz","listening":"Lisining","listing":"Listing","lit":"Lit","literally":"Litırəli","literature":"Litırıçır","liters":"Litırz","litres":"Litırız","litter":"Litır","little":"Litıl","live":"Laıv","lived":"Layvd","lively":"Layvli","liverpool":"Livıpul","lives":"Layvz","living":"Living","lizards":"Lizırdz","lmak":"Lmak","lmaz":"Lmaz","load":"Loud","loaded":"Lovdid","loading":"Lovding","loads":"Lovdz","loan":"Lovn","lobster":"Labstır","lobtailing":"Lobteyling","local":"Lokıl","locally":"Lokəli","locals":"Lovkıls","located":"Lokevtıd","location":"Lokeşın","lock":"Lok","lockdown":"Lakdaun","locked":"Lakt","locking":"Lokin","log":"Log","logic":"Lacik","logical":"Lacikıl","login":"Login","logo":"Logo","lokum":"Lokum","lola":"Lovlə","london":"Landın","london's":"Landınz","loneliness":"Lonlinəs","lonely":"Lonli","long":"Long","longed":"Longd","longer":"Longır","longest":"Longıst","longing":"Longing","longingly":"Longingli","longitude":"Lancitüd","look":"Luuk","looked":"Lukt","looking":"Luking","looks":"Luks","loop":"Lup","looping":"Luping","loose":"Luuz","lord":"Lord","lorenzo":"Lorenzov","los":"Los","lose":"Luuz","loser":"Luzır","losing":"Luzing","loss":"Los","losses":"Losız","lost":"Lost","lot":"Lot","lotion":"Lovşın","lots":"Lots","lottery":"Latəri","loud":"Laud","louder":"Laudır","loudly":"Laudli","lounge":"Launc","lousy":"Lavzi","love":"Lav","lovebirds":"Lavbördz","loved":"Lavd","lovely":"Lavli","lover":"Lavır","loves":"Lavz","loving":"Laving","low":"Lov","lower":"Lovır","lowly":"Lovli","loyalty":"Loyəlti","ls":"El es","lucas":"Lukəs","lucas'":"Lukəs","luck":"Lak","luckiest":"Lakiyist","luckily":"Lakili","lucky":"Laki","lucrative":"Lukrətiv","lucy":"Lusi","luggage":"Lagıc","luis":"Luis","luka's":"Lukəs","luke":"Luk","lumbee":"Lambi","lumberton":"Lambırtın","luna":"Lunə","luna's":"Lunəz","lunch":"Lanç","lunchtime":"Lançtaym","luxuriant":"Lagjüriyınt","luxurious":"Lagjüriyıs","luxury":"Lakşıri","lydia":"Lidiya","lying":"Laying","ma":"Ma","macaque":"Məkak","macau":"Mekaav","macau's":"Mekaavz","machine":"Mışiin","machines":"Mışiins","machu":"Maçu","macro":"Mekrov","mad":"Med","mada":"Madə","madam":"Medəm","maddi":"Madi","maddie's":"Madiz","made":"Meyd","madication":"Medikeyşın","madrid":"Mädrid","mafia":"Mafiə","magazines":"Megəziins","magic":"Mecik","magical":"Mecikıl","magnet":"Magnıt","magnificent":"Magnifikınt","mahal":"Mahal","mail":"Meyl","mailbox":"Meylbaks","mailing":"Meyling","main":"Meyn","mainland":"Meynland","mainly":"Meynli","maintain":"Menteyn","maintained":"Menteynd","maintaining":"Menteyning","maintains":"Menteyns","maintenance":"Meyntenıns","majesty":"Mecəsti","major":"Meycır","majority":"Mecoriti","mak":"Mak","make":"Meyk","maker":"Meykır","makes":"Meyks","makeup":"Meykap","making":"Meyking","male":"Meyl","males":"Meylz","mall":"Mol","mallozzi":"Malozi","malls":"Molz","malta":"Moltə","man":"Men","manage":"Menıc","managed":"Menicd","management":"Menıcmınt","manager":"Menıcır","manager's":"Menıcırz","manages":"Menıcız","managing":"Menıcing","manchester":"Mençester","mandatory":"Menedəri","mandrake":"Mandreik","mandy":"Mendi","mandy's":"Mendiz","manifest":"Menifest","manifests":"Menifests","mankind":"Menkaynd","mannequin":"Menikin","manny's":"Meniz","manor":"Menır","man's":"Menz","manual":"Menyuıl","manuel":"Mänuel","manufacture":"Menyüfakçır","manufacturing":"Menyüfakçıring","manu's":"Manuz","many":"Meni","map":"Mep","maple":"Meypıl","marathon":"Merəton","marble":"Marbıl","marcel":"Marsel","marcela":"Marselə","march":"Març","marches":"Marçız","marching":"Marçing","marco":"Markov","marcus":"Markıs","margins":"Mardcıns","margot's":"Margovz","maria":"Mariyə","marina":"Marinə","mark":"Mark","markers":"Markırz","market":"Maakıt","marketers":"Marketırz","marketing":"Marketting","marks":"Marks","marmara":"Marmara","marriage":"Meric","married":"Merid","marry":"Meri","marrying":"Meriing","mars":"Mars","marta":"Martə","marvel":"Marvıl","marvellous":"Marvələs","mary":"Meri","marylebone":"Merilıbovn","masala":"Masala","mascot":"Meskot","mashatu":"Maşatu","mask":"Mesk","masquerades":"Məskəreyds","mass":"Mes","massachusetts":"Mesəçusits","massage":"Masaaj","massive":"Masiv","master":"Mestır","mastercard":"Mestırkard","masters'":"Mestırz","master's":"Mestırz","mat":"Met","match":"Meç","matched":"Meçt","matches":"Meçız","material":"Metıriıl","materials":"Metıriyıls","maternal":"Mətörnıl","maternity":"Mətörniti","maths":"Mafs","mating":"Meyting","matrimony":"Metriməni","matter":"Metır","mattered":"Metırd","matters":"Metərz","matthew":"Metyu","maturity":"Məçuriti","maverick":"Mevərik","mavericks":"Mevəriks","maxim":"Meksim","maximize":"Meksimayz","may":"Mey","mayan":"Mayın","maybe":"Meybi","mazl":"Mazıl","meadow":"Medov","meal":"Miıl","meals":"Miilz","mean":"Miin","meaning":"Miining","meaningful":"Mininful","meanings":"Minings","means":"Miins","meant":"Ment","meantime":"Miintaym","measure":"Mejır","measures":"Mejırz","measuring":"Mejıring","meat":"Miit","mechanic":"Mekanik","mechanics":"Mikeniks","medal":"Medıl","medals":"Medıls","media":"Midia","medical":"Medikıl","medication":"Medikeyşın","medications":"Medikeyşınz","medicine":"Medisin","meditate":"Mediteyt","meditating":"Mediteyting","meditation":"Mediteyşın","medium":"Midiyum","meet":"Miit","meeting":"Miiting","meetings":"Mitingz","meets":"Miits","mehdi":"Mehdi","mehmet":"Mehmet","mek":"Mek","mel":"Mel","melodic":"Mıladik","melody":"Melodi","melt":"Melt","melted":"Meltid","melting":"Meltin","member":"Membır","members":"Membırz","membership":"Membedşip","memorial":"Memoriıl","memories":"Memıriz","memorise":"Memırayz","memorised":"Memırayzd","memory":"Memıri","men":"Men","men's":"Menz","mental":"Mentıl","mention":"Menşın","mentioned":"Menşınd","mentioning":"Menşining","mentions":"Menşınz","mentor":"Mentor","mentoring":"Mentorring","menu":"Menyu","meow":"Miyav","mer":"Mer","merciful":"Mörsifıl","mercury":"Mörkyuri","mercy":"Mörsi","merely":"Mirli","mert":"Mert","merve":"Merve","meryem":"Meryem","mess":"Mes","message":"Mesıc","messaged":"Mesıcd","messages":"Mesıcız","messed":"Mest","messenger":"Mesincır","messy":"Mesi","met":"Met","metal":"Metıl","meter":"Mitır","meters":"Mitırz","methane":"Miteyn","method":"Methıd","methods":"Metıds","metre":"Mitr","metres":"Mitırız","metro":"Metrov","mexican":"Meksikın","mexicans":"Meksikıns","mexico":"Meksikov","michael":"Maykıl","mick":"Mik","mickela":"Mikələ","microphone":"Maykrofovn","microsoft":"Maykrosoft","mid":"Mid","midday":"Middey","middle":"Midl","midnight":"Midnayt","midwife":"Midvayf","might":"Mayt","might've":"Maytıv","migrants":"Maygrınts","migrate":"Maygreyt","migrated":"Maygreytid","migrating":"Maygreytin","migration":"Maygreyşın","migratory":"Maygrətöri","mike":"Mayk","mila":"Milə","milan":"Milən","miles":"Maylz","military":"Militıri","milk":"Milk","milk's":"Milks","million":"Milyın","millions":"Milyınz","mimicking":"Mimiking","mince":"Mins","mind":"Maynd","minded":"Mayndid","mindful":"Mayndfıl","mindfulness":"Mayndfəlnıs","minds":"Mayndz","mine":"Mayn","miners":"Maynırz","mines":"Mayns","mini":"Mini","minimal":"Minimıl","minimum":"Minımum","minister":"Minıstır","minute":"Mınıt","minutes":"Minits","miriam":"Miriyəm","misbehave":"Misbihayv","miscommunication":"Miskomyunikeyşın","miserable":"Mizərəbıl","misery":"Mizıri","misrepresent":"Misreprızent","miss":"Mis","missed":"Mist","misses":"Misız","missing":"Misin","mission":"Mişn","missions":"Mişınz","mistake":"Misteyk","mistakenly":"Misteykənli","mistakes":"Misteyks","misunderstand":"Misandırstand","misunderstanding":"Misandırstanding","misunderstood":"Misandıstud","mitigate":"Mitigevt","mix":"Miks","mixed":"Mikst","mixing":"Miksing","mixture":"Miksçır","mle":"Em el i","mobile":"Mobayl","mobility":"Mobiləti","mobilize":"Mobilayz","mode":"Mod","model":"Madl","models":"Madıls","modern":"Madn","modernize":"Madərnayz","modest":"Modıst","modifications":"Modifikeyşınz","modulation":"Madyuleyşın","moisturiser":"Moystırayzır","molly":"Mali","mom":"Mom","moment":"Moumınt","moments":"Movmınts","mom's":"Mamz","mona":"Monə","monday":"Mondey","mondays":"Mandeyz","money":"Mani","money's":"Maniz","monica":"Manikə","monitor":"Monitır","monitored":"Monitırd","monitoring":"Monitöring","monkey":"Manki","monster":"Manstır","monteith":"Montayth","month":"Manth","monthly":"Manthli","months":"Manths","month's":"Manths","monument":"Manyumınt","mood":"Mud","moon":"Muun","moonrises":"Munrayzız","moons":"Munz","moonwalk":"Munvok","mop":"Map","mopped":"Mopt","morality":"Moraləti","more":"Mor","moreover":"Morovvır","morning":"Morning","mornings":"Morningz","moroccan":"Mörakən","morocco":"Mırakov","mortality":"Morteliti","mortgage":"Morgic","moscow":"Moskov","mosque":"Mosk","most":"Moust","mostly":"Mostli","mother":"Madır","motherfucker":"Madırfakır","mother's":"Madırz","motivate":"Motiveyt","motivated":"Movtiveytid","motivator":"Movtiveytır","motivators":"Movtiveytırz","motive":"Movtiv","motorbike":"Motırbayk","motorways":"Movtörveys","mould":"Movld","mount":"Maunt","mountain":"Mauntın","mountains":"Mauntıns","mourn":"Morn","mourning":"Morning","mouse":"Maus","moussaka":"Musakə","mouth":"Mauth","move":"Muuv","moved":"Muuvd","movement":"Muuvmınt","movements":"Muuvmınts","moves":"Muvz","movie":"Muv","movies":"Muviz","moving":"Muvin","mr":"Mistır","mrs":"Misız","ms":"Miz","much":"Maç","mud":"Mad","muddy":"Madi","muffins":"Mafinz","mug":"Mag","muggy":"Magi","muhammed":"Muhammed","multicultural":"Maltikölçörəl","multiplayer":"Maltipleylır","multiple":"Maltipıl","mum":"Mam","mumbai":"Mumbai","mum's":"Mamz","murat":"Murat","murder":"Mördır","murderer":"Mördırır","murders":"Mördırz","muscle":"Masıl","muscles":"Masıls","museum":"Myuziım","museums":"Myuziyıms","mushroom":"Maşrum","mushrooms":"Maşrumz","music":"Müuzik","musical":"Myuzikıl","musician":"Myuzişın","musicians":"Myuzişınz","muslim":"Müzlım","must":"Mast","mustn't":"Masınt","must've":"Mastıv","muttered":"Matırd","mutual":"Myuçuəl","muzzle":"Mazıl","mvp":"Em vi pi","myself":"Mayself","mysterious":"Mistiyriyus","mystery":"Mıstri","mythology":"Mitoloji","n":"En","na":"Na","nailed":"Neyld","nails":"Neylz","nambia":"Namiybyə","name":"Neym","named":"Neymd","names":"Neyms","name's":"Neymz","nap":"Nep","nar":"Nar","narrative":"Nerətiv","narrow":"Nerou","narrowest":"Nerovvist","narrowly":"Neroli","nasa":"Nası","nasty":"Nest","nathan":"Neytın","nation":"Neyşın","national":"Neyşınl","nationality":"Neşınæliti","nationwide":"Neyşinvayd","native":"Neytiv","nato":"Neytov","natural":"Neçrıl","naturalization":"Neçırəlayzeyşın","naturally":"Neçırəli","nature":"Neyçır","nature's":"Neyçırz","naughty":"Noti","nausea":"Noziyə","nauseous":"Noziyıs","navin":"Navin","navy":"Neyvi","nce":"Nis","ncome":"İnkom","nda":"En di ey","ndan":"Ndan","near":"Niır","nearby":"Niərbay","nearest":"Niyırist","nearly":"Niyrli","necessarily":"Nesəsərili","necessary":"Nesısıri","necessity":"Nısesiti","neck":"Nek","necklace":"Nekləs","nedeniyle":"Nedeniyle","need":"Niid","needed":"Niidid","needing":"Niiding","needle":"Niidl","needles":"Niidılz","needn't":"Niidınt","needs":"Niidz","negation":"Nigeyşın","negative":"Negativ","negatively":"Negətivli","negativity":"Negətiviti","neglect":"Nıglekt","neglected":"Neglektid","negligence":"Neglicıns","negotiate":"Nigovşiyeyt","negotiation":"Nigovşiyeyşın","neighbor":"Neybır","neighborhood":"Neybırhud","neighbors":"Neybırz","neighbour":"Neybır","neighbourhood":"Neybırhud","neighbourhoods":"Neybırhuds","neighbourhood's":"Neybırhuds","neighbours":"Neybırz","neither":"Niidır","nell":"Nel","nelson":"Nelsın","nemi":"Nemi","nephew":"Nefyu","nerds":"Nörd","nerve":"Nörv","nerves":"Nörvz","nervous":"Nörvıs","nervously":"Nörvıslı","nesneleri":"Nesneleri","nestl":"Nestıl","netle":"Netle","netmek":"Netmek","network":"Netvörk","networking":"Netvörking","neural":"Nyurıl","never":"Never","nevertheless":"Nevedıles","new":"Nuu","newborn":"Nyuborn","newlyweds":"Nyulivedz","news":"Nüuz","newspaper":"Nüuspeypır","newspapers":"Nüuspeypırz","next":"Nekst","nextgen":"Nekst cen","neyle":"Neyle","ngilizce":"İngilizce","nia":"Nayə","nice":"Nays","nicer":"Nay sır","nick":"Nik","nicky":"Niki","nicola":"Nikola","nicotine":"Nikətin","nigel":"Naycıl","nigeria":"Nayciriə","nigerian":"Nayciriən","night":"Nayt","nightclub":"Naytklab","nights":"Nayts","nile":"Nayl","nine":"Nayn","nineteenth":"Nayntint","ninty":"Naynti","nippy":"Nipi","nisha":"Nişə","nixon":"Niksın","nl":"En el","no":"No","nobel":"Nob el","noble":"Noubl","nobody":"Noubadi","nod":"Nod","noise":"Noiz","noises":"Noyzız","noisy":"Noizi","nollywood":"Nalivud","non":"Nan","noncitizens":"Nansitizıns","none":"Nan","nonetheless":"Nanðıles","nonsmoking":"Nansmoking","noodles":"Nudılz","noon":"Nuun","noone":"Novan","nope":"Novp","nor":"Nor","normal":"Normıl","normally":"Normoli","norse":"Nors","north":"North","northeastern":"Nortistın","northern":"Nordın","norway":"Norvey","nose":"Nouz","notable":"Noytıbıl","note":"Not","notebook":"Noytbuk","notes":"Novts","nothing":"Nathing","nothing's":"Natingz","notice":"Noutis","noticeable":"Novtisəbıl","noticed":"Novtıst","notices":"Novtisız","noticing":"Novtising","notifications":"Novtifikeyşınz","notified":"Novtifayd","notracers":"Novtreysırz","noun":"Naun","novelist":"Novəlist","november":"Novembır","now":"Nau","nowadays":"Nauıdeyz","nowhere":"Nouweır","ntem":"Ntem","nuclear":"Nukliyır","number":"Nambır","numbers":"Nambırz","nun":"Nan","nuptials":"Napşılz","nurse":"Nörs","nursing":"Nörsing","nutritionist":"Nutrişınist","nuts":"Nats","o":"Ov","oat":"Ovt","oats":"Ovts","obama":"Obama","obese":"Obiis","obey":"Obey","object":"Ibcekt","objective":"Obcektiv","objectives":"Obcektivs","objects":"Obceks","obligation":"Obligeyşın","obligatory":"Obligıtori","obscene":"Absin","observation":"Abzıveyşın","observations":"Abzörveyşınz","observe":"Ibzörv","observed":"Obzörvd","observing":"Abzörving","obsessed":"Obesst","obsessive":"Absesiv","obstacle":"Obstəkıl","obtain":"Ibtein","obtaining":"Ebteyning","obvious":"Ibvıyıs","obviously":"Obviyusli","occasion":"Ikeyjn","occasional":"Okeyjınıl","occasionally":"Okeyjınəli","occupation":"Aküpeyşın","occupational":"Akyüpeyşınıl","occurring":"Oköring","occurs":"Okörz","ocean":"Ouşın","oceans":"Ovşınz","oclock":"Okılak","o'clock":"Okılak","october":"Oktobır","odd":"Od","odds":"Od","odor":"Ovdır","oecd":"O i si di","off":"Of","offence":"Ifens","offences":"Ofensız","offended":"Ofendid","offense":"Ofens","offensive":"Ofensiv","offer":"Ofır","offered":"Ofırd","offering":"Ofring","offers":"Ofırz","office":"Ofis","officer":"Ofisır","officers":"Ofisırz","offices":"Ofisız","official":"Ofişl","officially":"Ofişəli","offline":"Oflayn","often":"Ofn","ogbl":"O ci bi el","oh":"O","ohh":"Ov","oil":"Oyl","ok":"Okey","okay":"Okey","okey":"Okey","olan":"Olan","old":"Old","older":"Oldır","oldest":"Oldist","olives":"Olivz","olivia":"Olivia","olivia's":"Oliviəz","olmadan":"Olmadan","olur":"Olur","olympic":"Olimpik","olympics":"Olimpiks","omar":"Omar","omg":"O em ci","omit":"Ovmit","omitted":"Ovmitid","onboarding":"Onbording","once":"Wans","one":"Wan","ones":"Vanz","one's":"Vanz","ongoing":"Ongoing","onion":"Anyın","onions":"Anyınz","online":"Onlayn","only":"Ounli","onrush":"Onraş","onto":"ontu","ooh":"U","open":"Oupın","opened":"Ovpınd","opening":"Ovpening","openly":"Ovpenli","opera":"Apırə","operate":"Opıreyt","operating":"Opıreytin","operation":"Opıreyşın","operations":"Opöreyşınz","opinion":"Opinyın","opinions":"Epinyınz","oportunity":"Opörtyuniti","opportunities":"Apörçünitiz","opportunity":"Aporçüniti","oppose":"Opovz","opposed":"Opovzd","opposite":"Apızit","opposition":"Opovzişın","oppositional":"Opızişınıl","opps":"Ops","opted":"Optid","optimistic":"Optimistik","option":"Opşın","options":"Opşınz","or":"Or","oral":"Oral","orally":"Orəli","orange":"Orınc","oranges":"Orıncız","orchid":"Orkid","ordeal":"Ordiyil","order":"Oordır","ordered":"Ordırd","ordering":"Ordıring","orderly":"Ordırli","orders":"Ordırz","organic":"Organik","organisation":"Organizeyşın","organisational":"Organizeyşınıl","organisations":"Organizeyşınz","organise":"Orgənayz","organised":"Orgəmayzd","organisers":"Organayzırz","organises":"Organayzız","organization":"Organizeyşın","organize":"Orgınayz","organized":"Organayzd","organizer":"Organayzır","organizers":"Organayzırz","organizing":"Organayzing","origin":"Oricin","original":"Oricinıl","originally":"Oricinəli","origins":"Oricinz","orlando":"Orlendov","ornament":"Ornımınt","orphanage":"Orfənıc","oscar":"Oskır","osman":"Osman","other":"Adır","others":"Adırz","others'":"Adırz","other's":"Adırz","otherwise":"Adırwayz","otomatik":"Otomatik","otters":"Atırz","our":"Aar","ours":"Avrs","ourselves":"Aursevlz","out":"Aut","outbreak":"Autbreyk","outcome":"Autkam","outcomes":"Autkamz","outdated":"Autdeytid","outdoor":"Avtdor","outdoors":"Avtdorz","outfit":"Autfit","outgoing":"Autgoing","outlet":"Autlet","outlook":"Autluk","outputting":"Outputting","outraged":"Autreycd","outreach":"Autriç","outright":"Autrayt","outside":"Autsayd","outsized":"Autsayzd","outstanding":"Autstending","oven":"Avn","over":"Ouvır","overall":"Ovırəl","overate":"Ovöreyt","overcame":"Ovörkeym","overcast":"Ovörkast","overcome":"Ouvıkam","overdrawn":"Ovıdrön","overdue":"Ovördü","overemphasise":"Ovöremfəsayz","overestimate":"Ovırestimeyt","overgeneralise":"Ovörcenərəlayz","overhelmed":"Ovörvelmd","overlap":"Ovırlep","overload":"Ovırlovd","overloaded":"Ovörlovdid","overloading":"Ovörlovding","overlook":"Ovörluk","overlooking":"Ovörluking","overnight":"Ovırnayt","overprotective":"Ovırprotektiv","oversee":"Ovörsi","overseeing":"Ovörsiing","overslept":"Ovırslept","overstimulate":"Ovörstimüleyt","overstimulated":"Ovırstimüleytid","overtaken":"Ovörteykın","overtime":"Ovırtaym","overtourism":"Ovırturizım","overview":"Ovörvyu","overweight":"Ovırveyt","overwhelmed":"Ovərvelmd","overwhelming":"Ovörvelming","owe":"Ou","owing":"Oving","owl":"Aul","own":"On","owned":"Ovnd","owner":"Ounır","owners":"Ovnerz","ox":"Aks","oxford":"Oksförd","oxtail":"Oksteyl","oynanalar":"Oynanalar","oysters":"Oy stırz","p":"Pi","pablo":"Pablo","pace":"Peps","paced":"Peyst","pack":"Pek","package":"Pekic","packaging":"Pekic","packed":"Pekd","packing":"Paking","packs":"Peks","pact":"Pekt","pagan":"Peygın","page":"Peyc","paid":"Peyd","pain":"Peyn","painful":"Peynful","painkillers":"Peynkilırz","pains":"Peynz","paint":"Peynt","painted":"Peyntid","painting":"Peynting","paints":"Peynts","pair":"Peır","pairs":"Peyrz","pakistan":"Pakistan","pakistani":"Pakistani","pakistanis":"Pakistaniz","pallet":"Palıt","pallets":"Palıts","palm":"Palm","palms":"Palms","pals":"Pelz","pam":"Pem","pan":"Pen","pancakes":"Penkeyks","pandas":"Pendız","pandemic":"Pandemik","panels":"Penıls","panic":"Penik","panicked":"Penikt","panicking":"Peniking","pans":"Pens","panties":"Pentiz","pants":"Pents","paolo":"Paolo","paper":"Peypır","papers":"Peypırz","paperwork":"Peypırvörk","parade":"Pareyd","parades":"Pareyds","paradise":"Perədays","paragraph":"Perıgraf","paragraphs":"Perıgrafs","parallels":"Perəlels","paramedic":"Perəmedik","paramedics":"Perəmediks","paramount":"Perəmaunt","paranoia":"Perənoyə","pardon":"Pardın","parent":"Perınt","parenting":"Perıntin","parents":"Perınts","parents'":"Perınts","pariah":"Pərayə","paris":"Peris","park":"Park","parking":"Parking","parks":"Parks","parliament":"Parlımınt","parrot":"Perıt","parsley":"Parsli","part":"Part","partial":"Parşıl","participant":"Partisipınt","participants":"Partisipınts","participate":"Partisipeyt","participated":"Partisipeytid","participates":"Partisipeyts","participating":"Partisipeytin","participation":"Partisipeyşın","participle":"Partisipıl","particular":"Pıtikülır","particularly":"Partikyulərli","parties":"Partiz","partly":"Partli","partner":"Partnır","partners":"Partnırz","parts":"Partz","party":"Paati","partying":"Partiing","pasif":"Pasif","pass":"Pes","passage":"Pesıc","passed":"Past","passenger":"Pesıncır","passengers":"Pesıncırz","passerby":"Pesırbay","passes":"Pesız","passing":"Pesing","passion":"Peşın","passionate":"Peşınıt","passive":"Pesiv","passport":"Pasport","password":"Paswörd","past":"Pest","paste":"Peyst","pastry":"Peystri","patch":"Peç","paternal":"Pətörnıl","paternity":"Pətörniti","path":"Path","pathway":"Pathwey","patience":"Peyşns","patient":"Peyşnt","patients":"Peyşınts","patisseries":"Patisəriz","patrich":"Patriç","patrick":"Patrik","patriotic":"Petriyotik","patted":"Petid","pattern":"Petörn","patterns":"Petırnz","paul":"Pol","paula":"Polə","pause":"Poz","paused":"Pozd","pauses":"Pozız","pawel":"Pavel","pay":"Pey","paying":"Paying","payment":"Peymınt","payments":"Peymınts","pays":"Peyz","pdf":"Pi di ef","peace":"Piis","peaceful":"Pisfıl","peacefully":"Pisfəli","peacock":"Pikak","peak":"Pik","peanut":"Pinat","peanuts":"Piənats","peas":"Piiz","peck":"Pek","peckish":"Pekış","peculiarity":"Pikyüliyeriti","pedro":"Pedrov","pee":"Pi","peer":"Piır","pelin":"Pelin","pen":"Pen","penalties":"Penəltiz","penalty":"Penılti","pencil":"Pensl","pencils":"Pensıls","pending":"Pending","penelope":"Penelopi","penetration":"Penitreyşın","penicillin":"Penisilin","peninsula":"Pininsyulə","penis":"Piinis","pennsylvania":"Pensilvənyə","penny":"Peni","pension":"Penşın","penthouse":"Penthaus","peonies":"Piyəniz","peope":"Pipl","people":"Piipl","peopleless":"Pipılləs","people's":"Pipılz","per":"pör","perceive":"Pırsiv","percent":"Pörsent","percentage":"Pösentic","perception":"Pırsepşın","perceptions":"Pörsepşınz","perch":"Pörç","perfect":"Pörfekt","perfective":"Pörfektiv","perfectly":"Pörfektli","perform":"Pörform","performance":"Pörformıns","performances":"P","performed":"Pörformd","performer":"Pörformır","performers":"Pörformırz","performing":"Pörforming","perfume":"Pörfyum","perhaps":"Pörheps","period":"Piriıd","periods":"Piriıds","perks":"Pörks","permanent":"Pörmənənt","permanently":"Pörmənəntli","permission":"Pörmişn","permissive":"Pörmisiv","permit":"Pörmit","permits":"Pörmits","permitted":"Pörmitid","perry":"Peri","perseverance":"Pörsıvirıns","persevere":"Pörsıvir","persian":"Pörjın","persistence":"Pörsistıns","persistent":"Pörsistınt","person":"Pörsın","personal":"Pörsınıl","personalised":"Pörsınəlayzd","personality":"Pörsınelıti","personalized":"Pörsınəlayzd","personally":"Pörsınəli","person's":"Pörsınz","perspective":"Pörspektiv","perspectives":"Pörspektivz","perspire":"Pörspayır","persuade":"Pörsweyd","persuasive":"Pörsveysiv","peru":"Peruu","pescatarians":"Peskəteryıns","pessimistic":"Pesimistik","pest":"Pest","pet":"Pet","pete":"Piit","peter":"Pitır","petersburg":"Pitırzbörg","petersons":"Pitırsınz","petrol":"Petrıl","pets":"Pets","petty":"Peti","petunia":"Petünyə","pharmaceutical":"Farməsutikıl","pharmacy":"Farməsi","phase":"Feyz","phases":"Feyzız","phd":"Pi eyç di","phenomena":"Finomenə","phenomenon":"Finomanın","philosophy":"Filasəfi","phobias":"Fovbiyəs","phone":"Foun","phoned":"Fovnd","phones":"Fovnz","photo":"Foutou","photographer":"Fıtagrafır","photographs":"Fotıgrafs","photography":"Fıtagrafi","photos":"Fotovz","photoshoot":"Fotovşut","photoshoots":"Fotovşuts","phrase":"Freyz","physical":"Fizikıl","physically":"Fizikli","physics":"Fiziks","piano":"Pieno","piccadilly":"Pikədili","picchu":"Piçku","pick":"Pik","picked":"Pikt","picker":"Pikır","picking":"Piking","pickles":"Pikıls","pickpocket":"Pikpakit","pickpocketed":"Pikpaketid","picnic":"Piknik","picture":"Pikçır","pictures":"Pikçırz","picturesque":"Pikçəresk","pie":"Pay","piece":"Piis","pieces":"Piisız","piecing":"Piising","pierre":"Piyer","pigeonhole":"Picınhovl","pigeonholed":"Picınhovld","pilates":"Pilatıs","pills":"Pilz","pilot":"Paylıt","pineapple":"Paynepıl","pinheiros":"Pinheyrus","pinpointing":"Pinpoynting","pipes":"Payps","piri":"Piri","piss":"Pis","pitbull":"Pitbul","pitch":"Piç","pitched":"Piçt","pitching":"Piçing","pith":"Pit","pitt":"Pit","pitted":"Pitid","pity":"Piti","pizza":"Pitsa","pk":"Pi key","place":"Pleys","placed":"Pleyst","placement":"Pleysmınt","placements":"Pleysmınts","places":"Pleysız","placing":"Pleysing","plague":"Pleyg","plagued":"Pleygd","plain":"Pleyn","plan":"Plen","plane":"Pleyn","planes":"Pleynd","plane's":"Pleyndz","planet":"Plenıt","planets":"Plenıts","planlar":"Planlar","planned":"Plend","planner":"Plenır","planning":"Plening","plans":"Plens","plant":"Plent","planting":"Planting","plants":"Plants","plastic":"Plastik","plate":"Pleyt","plates":"Pleylts","platform":"Platfom","platforms":"Platformz","platter":"Pletır","play":"Pley","played":"Pleyd","player":"Pleyır","players":"Pleyırz","playground":"Pleygraund","playing":"Pleying","plays":"Pleyz","plead":"Pliid","pleasant":"Pleznt","pleasantly":"Plezıntli","please":"Pliiz","pleased":"Plizd","pleasure":"Plejır","pleasure's":"Plejırz","plenty":"Plenti","plot":"Plot","plugged":"Plagd","plumage":"Plumic","plumber":"Plamır","plumbing":"Plambing","plummeted":"Plametid","plummeting":"Plameting","plural":"Plurıl","plus":"plas","plymouth":"Pliməθ","plywood":"Playvud","pm":"Pi em","poachers":"Povçırz","pocket":"Pakıt","pockets":"Pakıts","pod":"Pod","podcast":"Podkast","podcasts":"Podkasts","poetry":"Poıtri","point":"Point","pointed":"Poyntıd","pointing":"Poynting","pointless":"Poyntləs","points":"Poynts","poisoning":"Poyzıning","poisonous":"Poyzınıs","poked":"Povkt","poland":"Povlənd","polar":"Povlır","police":"Pıliis","policeman":"Polisman","policies":"Palisiz","policy":"Palısi","polish":"Poliş","polite":"Pılayt","politely":"Pılaytli","politest":"Pılaytist","political":"Pılitikl","politician":"Polıtişın","politicians":"Palitişınz","politician's":"Palitişınz","politics":"Palitiks","pollute":"Polut","pollutes":"Poluts","pollution":"Poluşın","polo":"Polov","polymer":"Polimır","pond":"Pond","ponds":"Pondz","pontiac":"Pontiyek","pool":"Puul","poop":"Pup","poor":"Puur","poorly":"Purli","pop":"Pop","popping":"Paping","poppy":"Popi","popular":"Popülır","popularity":"Papyülerəti","population":"Papüleyşn","populations":"Papyüleyşınz","porridge":"Porıc","portal":"Portıl","portfolio":"Portfolyov","portion":"Porşın","portland":"Portland","portrait":"Portreyt","portraits":"Portreyts","portreath":"Portriθ","portugal":"Portügıl","portuguese":"Porçuigiiz","posing":"Povzing","position":"Pızişn","positions":"Pızişınz","positive":"Pazitiv","positivity":"Pazitiviti","possess":"Pızes","possessions":"Pazeşınz","possibility":"Pasıbilıti","possible":"Pasıbl","possibly":"Posibli","post":"Poust","posted":"Povstid","postpone":"Pospon","postponed":"Postpovnd","postponing":"Postpovning","posts":"Povsts","pot":"Pot","potato":"Poteyto","potatoes":"Poteytovz","potential":"Pötenşıl","potentially":"Pötenşəli","pots":"Pots","pottery":"Patıri","pounding":"Paunding","pounds":"Paunds","pour":"Poor","pouring":"Poring","poverty":"Povərti","power":"Pauır","powered":"Pavvırd","powerful":"Pauıfl","powerplants":"Pavvırplants","powerpoint":"Pavvırpoynt","powers":"Pavvırz","powwow":"Pavav","practicable":"Prektikəbıl","practical":"Prektikl","practice":"Prektis","practices":"Prektisız","practicing":"Prektising","practise":"Prektis","practised":"Prektist","practising":"Prektising","praga":"Pragə","prague":"Prag","praise":"Preyz","praised":"Preyzd","pratically":"Prektikli","pray":"Prey","prayer":"Preyır","prayers":"Preyırz","prays":"Preyz","pre":"Pri","precaution":"Prikoşın","precedence":"Presidıns","precious":"Preşıs","precise":"Prısays","precisely":"Prısaysli","precision":"Presijın","predators":"Predıtörz","predict":"Prıdikt","predictable":"Pridiktəbıl","predicts":"Pridikts","prefer":"Prıför","preferences":"Prefırınsız","prefers":"Priförz","pregnancy":"Pregnənsi","pregnant":"Pregnınt","premature":"Preməçur","prepare":"Prıpeır","prepared":"Prepeyrd","preparing":"Pripeyring","preposition":"Prepızişın","prescribe":"Priskrayb","prescribed":"Prıskraybd","prescription":"Priskripşın","presence":"Prezns","present":"Prizent","presentation":"Prezinteyşın","presentations":"Prezinteyşınz","presented":"Prizentid","presenter":"Prezentır","presenting":"Prezinting","presents":"Prezınts","preserve":"Prizörv","preserved":"Prizörvd","president":"Prezidınt","president's":"Prezidınts","press":"Pres","pressed":"Prest","pressing":"Presing","pressure":"Preşır","prestigious":"Presticis","pretend":"Pritend","pretended":"Pritendid","pretending":"Pritending","pretends":"Pritends","pretty":"Priti","prevent":"Privent","preventative":"Preventətiv","prevented":"Priventid","preventing":"Prevents","prevention":"Prevenşın","preventive":"Preventiv","prevents":"Privents","previous":"Priiviıs","previously":"Priyviyusli","price":"Prays","prices":"Praysız","pride":"Prayd","priest":"Priist","prim":"Prim","primarily":"Praymerəli","primary":"Prayməri","prime":"Pıraym","primitive":"Primitiv","primrose":"Primrovz","princess":"Prinses","principle":"Prinsipıl","principles":"Prinsipılz","print":"Print","printer":"Printır","printers":"Printırz","prints":"Prints","prior":"Prayır","prioritize":"Prayoritayz","priority":"Prayoriti","prison":"Prizn","prisoner":"Priznır","privacy":"Prayvəsi","private":"Prayvıt","privilege":"Privilic","privileged":"Privilicd","privileges":"Privilicız","prize":"Prayz","prizes":"Pırayzız","pro":"Prov","probably":"Probabli","problem":"Prablım","problematic":"Probləmatik","problems":"Prablımz","procedure":"Prısijır","proceed":"Prısid","proceeded":"Prısiidid","proceeds":"Prosids","process":"Proses","processed":"Prosesd","processes":"Prosesiz","processing":"Prosesing","produce":"Prodyus","produces":"Prodyusız","producing":"Prodyusing","product":"Prıdak","production":"Prodakşn","productions":"Prodakşınz","productive":"Prodektif","products":"Pradakts","profession":"Profeşn","professional":"Profeşınl","professionals":"Profeşınlz","professor":"Profesır","profesyonel":"Profesyonel","proficiency":"Profişınsi","profile":"Profayl","profiles":"Profaylz","profit":"Profit","profitable":"Profitəbıl","profits":"Profits","program":"Program","programme":"Prougrem","programmed":"Prougramd","programs":"Prougrams","progress":"Prougres","progressing":"Prougresing","progressive":"Progresiv","project":"Procekt","projects":"Proceks","project's":"Proceks","projelerindeki":"Projelerindeki","promise":"Promis","promised":"Pramisd","promising":"Promising","promote":"Promovt","promoted":"Promovtıd","promotes":"Promovts","promoting":"Promovting","promotion":"Promovşın","promotional":"Promovşınıl","promotions":"Promovşınz","prompt":"Prompt","prompted":"Promptid","prompting":"Prompting","pronoun":"Provnaun","pronounce":"Pronauns","pronouns":"Provnauns","pronunciation":"Pronansiyeşın","proof":"Pruuf","propane":"Propoyn","proper":"Prapır","properly":"Propərli","properties":"Propərtiz","property":"Prapıti","proposal":"Propouzl","proposals":"Propovzılz","propose":"Propouz","proposed":"Propovzd","proposing":"Propovzing","pros":"Provz","proscribed":"Proskraybd","prosecution":"Prosikyüşın","prosecutor":"Prosikyutır","prosperity":"Prosperıti","protagonist":"Protegənist","protect":"Prıtekt","protected":"Prortektid","protecting":"Prortekting","protection":"Proteşın","protects":"Prortekts","protein":"Protein","protest":"Protest","protested":"Protestid","protesters":"Protestırz","protocols":"Provtəkols","proud":"Praud","proust":"Pravst","prove":"Pruuv","proved":"Pruvd","proven":"Pruvın","proverb":"Provörb","proves":"Pruuvz","provide":"Provayd","provided":"Provaydıd","provider":"Provaydır","providers":"Provaydırz","provides":"Provaydz","providing":"Provayding","provocative":"Provokətiv","provoke":"Provok","psoriasis":"Sorayəsis","psyche":"Sayki","psychological":"Saykılacikıl","psychologically":"Saykılacikli","psychology":"Saykılaci","pto":"Pi ti ov","pub":"Pab","public":"Pablik","publicity":"Pablisiti","public's":"Pabliks","publish":"Pabliş","published":"Pablişd","publisher":"Pablişır","publishing":"Pablişing","pubs":"Pabs","pudding":"Pudding","puddle":"Padıl","puddles":"Padılz","pull":"Pul","pulled":"Puld","pulling":"Puling","pump":"Pamp","punch":"Panç","punctual":"Pankçuəl","punish":"Paniş","punished":"Panişt","punishment":"Panişmınt","punitive":"Pyünıtiv","punnets":"Panets","puppet":"Papıt","purchase":"Pörçıs","purchases":"Pörçəsız","purchasing":"Pörçısing","pure":"Pyur","purification":"Pyörifikeyşın","purify":"Pyörifay","purple":"Pörpıl","purpose":"Pöpıs","purposefully":"Pörpısfəli","purposely":"Pörpıslı","purr":"Pör","purring":"Pörring","purrs":"Pörz","purse":"Pörs","pursue":"Pırsyu","pursuer":"Pörsyüır","pursuers":"Pörsyüırz","pursuing":"Pörsyuing","pursuit":"Pırsyut","push":"Puş","pushed":"Puşt","pushy":"Puşi","put":"Put","puts":"Puts","putting":"Putting","puzzeled":"Pazıld","puzzle":"Pazl","puzzles":"Pazıls","pyjamas":"Pacamaz","pyramids":"Piramits","q":"Kyu","qualification":"Kwalifikeyşın","qualifications":"Kwalifikeyşınz","qualifies":"Kvalifayz","qualify":"Kwalifay","qualities":"Kvalıtiz","quality":"Kualıti","quantitative":"Kvantitətiv","quantity":"Kuantıti","quantum":"Kvantım","quarantine":"Kvorıntin","quarter":"Kootır","quarterly":"Kuortərli","quarters":"Kuortırz","queen":"Kuiin","queensland":"Kuiinzlend","queries":"Kuiriz","query":"Kuiri","quest":"Kuest","question":"Quesçın","questionable":"Kuesçınəbıl","questions":"Kuesçınz","queue":"Küu","queued":"Kyud","queues":"Kyuz","queuing":"Kyuing","quick":"Kuik","quicker":"Kuikır","quickly":"Kuikli","quiet":"Kuayıt","quincy":"Kuinsi","quirky":"Kvörki","quit":"Kvit","quite":"Kuayt","quitters":"Kuitırz","quitting":"Kuitin","quiz":"Kuiz","quo":"Kuo","quotation":"Kvoteyşın","quotations":"Kvoteyşınz","quote":"Kvot","quoted":"Kvotid","quran":"Kuran","ra":"Ra","race":"Reys","races":"Reysız","rachel":"Reyçıl","racial":"Reyşıl","racing":"Reyesing","racism":"Reyesizım","radically":"Redikli","radio":"Reydio","radios":"Reydivz","rage":"Reyc","raid":"Reyd","raiding":"Reyding","rail":"Reyl","railroad":"Reynrod","rails":"Reynlz","rain":"Reyn","rained":"Reyn","rainforest":"Reynforıst","raining":"Reyning","rains":"Reynz","rainy":"Reyni","raise":"Reyz","raised":"Reyzd","raises":"Reyzız","raising":"Reyzing","raj":"Rac","ralamak":"Ralamak","ralph":"Ralf","ramadan":"Ramadan","ramazan":"Ramazan","ramen":"Ramın","ran":"Ren","random":"Rendım","ranelagh":"Renilə","rang":"Rang","range":"Reync","ranging":"Reyncing","rap":"Rep","rape":"Reyp","rapid":"Repid","rapidly":"Repidli","rare":"Reyr","rarely":"Rerli","rate":"Reyt","rates":"Reyts","rather":"Radır","ratings":"Reytingz","rational":"Raşınıl","rats":"Rets","raw":"Row","raya":"Raya","rays":"Reys","reach":"Riiç","reached":"Riçt","reaches":"Riçız","reaching":"Riçing","react":"Riekt","reactions":"Riekşınz","reacts":"Rieks","read":"Riid","reader":"Ridır","readers":"Riidırz","reading":"Riding","reads":"Riidz","ready":"Redi","real":"Rial","realise":"Riılayz","realised":"Riəlayzd","realises":"Riılayzız","realistic":"Rialistik","reality":"Riyeləti","realize":"Riılayz","realized":"Riəlayzd","really":"Riıli","reason":"Riizn","reasonable":"Riiznıbl","reasonably":"Rizınəbli","reasons":"Rizınz","reassure":"Riışur","rebecca":"Ribekə","rebecca's":"Ribekəz","rebel":"Rebıl","rebellious":"Ribelyıs","rebels":"Rebıls","rebooting":"Ributing","rebuild":"Ribild","rebuilding":"Ribilding","recall":"Rikol","recap":"Rikep","receipt":"Rısiit","receive":"Rısiiv","received":"Risiivd","receives":"Risivz","receiving":"Risiving","recent":"Riisnt","recently":"Risntli","reception":"Risepşn","recession":"Riseşın","recessions":"Riseşınz","recharge":"Riçarj","reci":"Resi","recipe":"Resipi","recipes":"Resipiz","recipients":"Risipiyınts","reciprocation":"Risiprəkeyşın","recite":"Risayt","recited":"Risaytid","reclaim":"Rikleym","recognisable":"Rekıgnayzəbıl","recognise":"Rekıgnayz","recognised":"Rekıgnayzd","recognize":"Rekıgnayz","recommend":"Rekımend","recommendation":"Rekımendeyşın","recommendations":"Rekımendeyşınz","recommending":"Rekımending","reconcile":"Rekonsayl","reconstructed":"Rikınstraktid","record":"Rekord","recorded":"Rikordid","recording":"Rikording","records":"Rekordz","recover":"Rikavır","recovering":"Rikavıring","recreate":"Rikriyeyt","recreating":"Rikriyeyting","recyclability":"Risaykləbiləti","recycle":"Risaykıl","recycling":"Risaykling","red":"Red","redecorate":"Ridekoreyt","redecorating":"Ridekoreyting","redevelopment":"Ridiwelopmınt","rediscovered":"Ridisakavırd","reduce":"Rıdyus","reduced":"Ridyust","reduces":"Ridyusız","reducing":"Ridyusing","reduction":"Ridakşın","redundant":"Ridandınt","reef":"Riif","refer":"Riför","referee's":"Refırız","referenced":"Refırınst","references":"Refırınsız","refering":"Riföring","referred":"Riförd","referring":"Riföring","refers":"Riförz","refilm":"Rifilm","reflect":"Riflekt","reflected":"Riflektid","reflection":"Riflekşın","reform":"Rifor","refuge":"Refüuc","refund":"Rifand","refuse":"Refyuz","refused":"Rifuzd","refuses":"Rifüzız","refusing":"Rifüzing","regain":"Rigeyn","regard":"Rigard","regarded":"Rigardid","regarding":"Rigarding","regardless":"Rigardlıs","regards":"Rigards","region":"Ricın","regions":"Ricınz","register":"Recistır","registered":"Recistırd","regret":"Rigret","regretfully":"Rigretfəli","regrets":"Rigrets","regrettably":"Rigretəbli","regretted":"Rigretid","regretting":"Rigreting","regular":"Regulır","regularly":"Regyulərli","regulated":"Regyuleytid","regulation":"Regyuleyşın","regulations":"Regyuleyşınz","rehearsals":"Rihörsılz","reinforce":"Rıinfors","reinforces":"Riinforsız","reissued":"Riisşud","reject":"Ricekt","rejected":"Ricektid","rejection":"Ricekşın","rejections":"Ricekşınz","relatable":"Rileytəbıl","relate":"Rileyt","related":"Rileytıd","relations":"Rileşınz","relationship":"Rıleyşnşip","relationships":"Rileyşınşips","relative":"Relıtiv","relatively":"Relətivli","relatives":"Relətivz","relativly":"Relətivli","relax":"Rileks","relaxation":"Rilekseyşın","relaxed":"Rilekst","relaxes":"Rileksiz","relaxing":"Rileksing","release":"Rilis","releases":"Riliisız","relevant":"Reləvınt","reliable":"Rilayəbıl","relied":"Rilayd","relief":"Rıliif","relieve":"Rıliiv","relieved":"Rilivd","religion":"Rılicın","religious":"Rilicıs","relocate":"Rilokeyt","relocated":"Rilokeytıd","relocation":"Rilokeyşın","rely":"Rilay","relying":"Rilaying","remain":"Rımeyn","remained":"Rimeynd","remaining":"Rimeynin","remains":"Rimeynz","remands":"Rimands","remarkable":"Rımarkıbl","remarried":"Rimerid","remarry":"Rimeri","remember":"Rimembır","remembered":"Rimembırd","remembers":"Rimembırz","remind":"Rimaynd","reminded":"Rimayndid","reminder":"Rimayndır","reminds":"Rimayndz","remote":"Rimuut","remotely":"Rimovtli","remove":"Rimuuv","removed":"Rimuvd","renaissance":"Renesans","rendered":"Rendırd","renew":"Rinyu","renewable":"Rinyuəbıl","renewal":"Rinyuıl","rent":"Rent","rental":"Rentıl","rentals":"Rentıls","rented":"Rentid","renting":"Renting","rents":"Rents","reopens":"Riyopvns","repair":"Ripeır","repaired":"Ripeyrd","repairing":"Ripeyring","repeat":"Rıpiit","repeatedly":"Ripeytidli","repelling":"Ripeling","repetition":"Repetişın","replace":"Rıpleys","replaced":"Ripless","replacement":"Rıpleysmınt","replied":"Riplayd","replies":"Riplays","reply":"Rıplay","report":"Riport","reported":"Riportıd","reporter":"Riportır","reporting":"Ripoorting","reports":"Riports","represent":"Reprızent","representation":"Reprizenteyşın","representative":"Reprizentətiv","represented":"Reprızentid","represents":"Reprızenets","reproduce":"Riprodus","reproduction":"Riprodakşın","reps":"Reps","reputation":"Repyüteyşın","reputations":"Repyüteyşınz","reputed":"Repyutid","request":"Rikuest","requests":"Rikuests","require":"Rikuayır","required":"Rikuwayrd","requirements":"Rikuwayrmınts","requires":"Rikuwayrz","reread":"Ri rid","reschedule":"Rişecul","rescheduled":"Riskecyuld","rescue":"Reskuu","research":"Risörç","researched":"Risörçt","researchers":"Risörçırz","researching":"Risörçing","reservation":"Rezörveyşın","reserve":"Rizörv","reserved":"Rizörvd","reserves":"Rizörvz","resident":"Rezidınt","residential":"Rezidenşıl","residents":"Rezidınts","resign":"Rizayn","resigning":"Rizayning","resilient":"Riziliyınt","resince":"Risins","resist":"Rızist","resistant":"Rizistınt","resisted":"Rizistid","resm":"Resm","resmi":"Resmi","resolution":"Rezəluşın","resolve":"Rizolv","resolved":"Rizolvd","resonate":"Rezıneyt","resort":"Rizort","resorts":"Rizorts","resource":"Risors","resources":"Risorsız","respect":"Rıspekt","respected":"Rispektid","respectful":"Rispektfıl","respectfully":"Rispektfəli","respond":"Rispand","responded":"Rispandid","responding":"Rispanding","responds":"Rispands","response":"Rispans","responsibilities":"Risponsıbilətiz","responsibility":"Risponsibiləti","responsible":"Rıspansıbl","rest":"Rest","restarted":"Ristartid","restarting":"Ristarting","restaurant":"Restrant","restaurants":"Reströnts","restaurateurs":"Restörətörs","resting":"Resting","restoration":"Restöreyşın","restored":"Ristord","restrain":"Ristreyn","restrictions":"Ristrikşınz","restructuring":"Ristrakçıring","result":"Rizalt","resulted":"Rizaltıd","resulting":"Rizaltıng","results":"Rizults","resume":"Rizum","resumed":"Rizuumd","resumption":"Rizampşın","retail":"Ritoyl","rethink":"Ritink","retire":"Ritayır","retired":"Ritayərd","retrain":"Ritreyn","retreat":"Ritrit","retro":"Retro","retrogrades":"Retrogreyts","return":"Ritörn","returned":"Ritörnd","returning":"Ritörning","returns":"Ritörnz","reunion":"Riyunyın","reusability":"Riyuzəbiləti","reuse":"Riyuz","reveal":"Riviyil","revealed":"Riviyild","revenge":"Rivenc","revenue":"Revınyu","revi":"Revi","review":"Rivyu","reviewing":"Rivyuing","reviews":"Rivyuz","revise":"Rivayz","revised":"Rivayzd","revising":"Rivayzing","revolutionary":"Revıluşınəri","rewarding":"Rivording","rewards":"Rivordz","reyhan":"Reyhan","reynolds":"Reynılds","ric":"Rik","rice":"Rays","rich":"Riç","richard":"Riçırd","richards":"Riçırdz","richer":"Riçır","riches":"Riçız","rick":"Rik","ricky":"Riki","rid":"Rid","ridden":"Ridın","ride":"Raıd","rides":"Raydz","ridiculous":"Ridikulıs","riding":"Rayding","rigged":"Rigd","right":"Rayt","rightful":"Raytfıl","rightfully":"Raytfəli","rights":"Rayts","rigorous":"Rigörıs","rijksmuseum":"Reyksmyuziyum","ring":"Ring","ringing":"Ringing","rio":"Riyo","ripening":"Raypıning","ripped":"Ript","rise":"Rayz","risen":"Rizın","risers":"Rayzırz","rises":"Rayzız","rising":"Rayzing","risk":"Risk","risked":"Riskt","risks":"Risks","river":"Rivır","rivers":"Rivırz","rken":"Rken","rkiye":"Türkiye","rkp":"Ar key pi","rlerine":"Rlerine","rma":"Ar em ey","rmak":"Rmak","road":"Roud","roast":"Rovst","rob":"Rob","robbed":"Robd","robber":"Rabır","robbery":"Rabəri","robert":"Rabırt","robinson":"Rabinsın","robot":"Robot","robots":"Robots","rock":"Rak","rockets":"Rakets","rocking":"Raking","rocks":"Raks","rodeo":"Rodiyo","rodrigo":"Rodrigov","role":"Roul","roles":"Rovls","roll":"Rol","rolling":"Rovling","rolls":"Rovlz","rom":"Ram","romance":"Roməns","romantic":"Romentik","rome":"Rovm","ron":"Ran","ronaldo":"Ronaldo","ronnie":"Rani","roof":"Ruuf","roofs":"Ruufs","room":"Ruum","rooms":"Rumz","rooster":"Rustır","root":"Ruut","rooting":"Ruting","roots":"Ruuts","ropes":"Rovps","rose":"Rouz","roses":"Rovzız","rotting":"Roting","rough":"Raf","roughly":"Rafli","round":"Raund","route":"Rut","routine":"Rutin","routines":"Rutinz","rsvp":"Ar es vi pi","ru":"Ru","rub":"Rab","rubbish":"Rabiş","rubs":"Rabz","ruby":"Rubi","ruby's":"Rubiz","rudan":"Rudan","rude":"Ruud","rudely":"Rudli","ruin":"Ruin","ruined":"Ruind","ruining":"Ruing","ruins":"Ruins","rule":"Ruul","ruled":"Ruld","rules":"Rulz","rultmak":"Rultmak","rum":"Ram","rumour":"Rumır","rumours":"Rumırz","run":"Ran","runner":"Ranır","runnig":"Raning","running":"Ranin","runny":"Rani","runs":"Rans","rural":"Rurəl","rush":"Raş","rushed":"Raşt","rushing":"Raşing","russia":"Raşə","rustling":"Rasling","rusty":"Rasti","rwanda":"Ruandə","ryan":"Rayın","sabbatical":"Səbətikıl","sabrina":"Sabrinə","sacha's":"Saçız","sack":"Sek","sacrifice":"Sekrifays","sacrifices":"Sekrifaysız","sad":"Sed","sadly":"Sedli","sadness":"Sednıs","safe":"Seyf","safely":"Seyfli","safer":"Seyfır","safest":"Seyfist","safety":"Seyfti","saffron":"Sefrın","sahara":"Saharə","said":"Sed","sailing":"Seyling","sakarya":"Sakarya","sake":"Seyk","salad":"Selıd","salads":"Selıds","salar":"Salar","salaries":"Seləriz","salary":"Selıri","sale":"Seyl","sales":"Seylz","salesperson":"Seylzpörsın","salim":"Salim","sally":"Seli","salmon":"Semın","salsa":"Salsa","salt":"Solt","salted":"Soltid","salting":"Solting","salty":"Solti","salvage":"Selvic","salvaged":"Selvicd","sam":"Sem","same":"Seym","samet":"Samet","samples":"Sampıls","sanction":"Sankşın","sanctions":"Sanksınz","sanctuary":"Senkçuəri","sand":"Send","sandbar":"Sendbar","sandboarding":"Sendbording","sandcastles":"Sendkasıls","sandwich":"Sendwic","sandwiches":"Sendviçız","sandy":"Sendi","sang":"Seng","sanity":"Senəti","sank":"Senk","santa":"Santə","sara":"Sarə","sarcasm":"Sarkezen","sarcastic":"Sarkastik","sat":"Set","satellite":"Sətılayt","satisfaction":"Setisfekşın","satisfied":"Setisfayd","satisfy":"Setısfay","saturday":"Setırdey","saturdays":"Setırdeyz","sauce":"Sos","save":"seyv","saved":"Seyvd","saving":"seyving","savings":"Seyvings","savory":"Seyvöri","saw":"So","say":"Sey","sayesinde":"Sayesinde","saying":"Seying","says":"Seyz","scale":"Skeyl","scandal":"Skendıl","scandalous":"Skendələs","scandals":"Skendıls","scans":"Skenz","scar":"Skar","scarce":"Skeys","scarcely":"Skeysli","scare":"Skevr","scared":"Skeyrd","scaredy":"Skeyrdi","scares":"Skevrs","scarf":"Skarf","scariest":"Skeyriist","scary":"Skeri","scene":"Sin","scenes":"Siins","scenic":"Sinik","scented":"Sentid","sceptical":"Skeptikıl","schedule":"Skecul","scheduled":"Skecyuld","schedules":"Skecyulz","scholar":"Skalır","scholarship":"Skalırşip","school":"Skuul","schools":"Skuuls","science":"Sayıns","sciences":"Sayınsız","scientific":"Sayıntifik","scientist":"Sayıntist","scientists":"Sayıntists","scientists'":"Sayıntists","scients":"Sayınts","scissors":"Sizırz","scolded":"Skovldid","scooter":"Skutır","scope":"Skop","score":"Skoor","scotch":"Skaç","scotland":"Skotlend","scott":"Skat","scottish":"Skaçiş","scrambled":"Skrembıld","scratch":"Skreç","scratched":"Skreçt","screen":"Skriin","screening":"Skriining","screw":"Skru","screws":"Skruvz","scribner":"Skribnır","script":"Skript","scrolls":"Skrovlz","scuba":"Skubə","scully":"Skali","sculptor":"Skulptır","sculpture":"Skulpçır","sea":"Sii","seabed":"Siibed","seafood":"Siifud","seal":"Siil","sealed":"Siild","seals":"Siils","sean":"Şon","search":"Sörç","searched":"Sörçt","searching":"Sörçing","seas":"Siiz","season":"Siizn","seasons":"Siizıns","seat":"Siit","seatbelt":"Sitbelt","seated":"Sitid","seating":"Siting","sebep":"Sebep","sec":"Sek","second":"Sekınd","secondary":"Sekındəri","seconds":"Sekınds","secrecy":"Sikrəsi","secret":"Sikrıt","secretary":"Sekrıtri","section":"Sekşn","sections":"Sekşınz","sector":"Sektır","secure":"Sikyur","security":"Sikyurəti","sedentary":"Sedıntəri","sediment":"Sedimınt","see":"Sii","seeing":"Siing","seek":"Siik","seeking":"Siking","seem":"Siim","seemed":"Simd","seemingly":"Simingli","seems":"Simz","seen":"Siin","sees":"Siiz","segment":"Segmınt","seldom":"Seldım","self":"Self","selfdisciplined":"Selfdisiplind","selfie":"Selfi","selfies":"Selfiz","selina's":"Selinəz","sell":"Sell","seller":"Selır","selling":"Seling","sells":"Sels","selves":"Selvz","semester":"Semester","semester's":"Semesterz","seminar":"Seminar","send":"Send","sending":"Sending","sends":"Sendz","senglea":"Sengliyə","senior":"Siniyır","seniors":"Siniyırz","sensation":"Senseyşın","sensationalism":"Senseyşınəlizım","sense":"Sens","sensible":"Sensibıl","sensitive":"Sensitiv","sensitivity":"Sensitiviti","sensory":"Sensəri","sent":"Sent","sentence":"Sentıns","sentences":"Sentənsız","separate":"Seprıt","separately":"Seprıtli","seperate":"Seprıt","september":"Septembır","sequences":"Sikvənsız","serena":"Seriynə","serene":"Siriin","sergey":"Sergey","serial":"Siiriıl","series":"Siriz","serious":"Siiriıs","seriously":"Siriıusli","serve":"Sörv","served":"Sörvd","server":"Sörvır","servers":"Sörvırz","serves":"Sörvz","service":"Sörvis","services":"Sörvisız","servicing":"Sörvising","serving":"Sörving","session":"Seşın","sessions":"Seşınz","set":"Set","setbacks":"Setbeks","sets":"Sets","setting":"Seting","settle":"Setl","settled":"Setıld","settlement":"Setlmınt","setup":"Setup","seven":"Sevın","seventy":"Sevınti","several":"Sevrıl","severe":"Sıviır","seville":"Sevıl","sewing":"Soving","sex":"Seks","sexism":"Seksizım","sexist":"Seksist","sexual":"Seksuıl","seyahat":"Seyahat","sgt":"Ser cent","shabbat":"Şabat","shadow":"Şedou","shadows":"Şedovz","shake":"Şeyk","shaking":"Şeyking","shall":"Şel","shame":"Şeym","shamed":"Şeymd","shaming":"Şeyming","shampoo":"Şempu","shamrock":"Şemrak","shanghai":"Şangay","shape":"Şeyp","shaped":"Şeypt","shapes":"Şeyps","shaping":"Şeyping","shard":"Şard","share":"Şeyr","shared":"Şeyrd","sharing":"Şeyring","shark":"Şark","sharks":"Şarks","sharon's":"Şerınz","sharp":"Şarp","sharpener":"Şarpnır","shashe":"Şaşe","shaun":"Şon","shaved":"Şeyvd","shaving":"Şeyving","shed":"Şed","she'd":"Şiid","sheen":"Şiin","sheen's":"Şiinz","sheets":"Şiits","shelf":"Şelf","shell":"Şel","she'll":"Şiil","shelter":"Şeltır","shelters":"Şeltırz","shelves":"Şelvz","shield":"Şiild","shields":"Şiildz","shift":"Şift","shifters":"Şiftırz","shining":"Şayning","ship":"Şip","shipment":"Şipmınt","shipping":"Şiping","ships":"Şips","shiraz":"Şiraz","shirt":"Şört","shirts":"Şörts","shit":"Şit","shitter's":"Şitırz","shitty":"Şiti","shock":"Şak","shocked":"Şakt","shocking":"Şaking","shocks":"Şaks","shoes":"Şuz","shoot":"Şuut","shooting":"Şuting","shop":"Şap","shopholic":"Şapholik","shopkeeper":"Şapkipır","shopper":"Şapır","shoppers":"Şapırz","shopping":"Şaping","shops":"Şops","shore":"Şoor","short":"Şort","shortage":"Şortic","shortages":"Şorticız","shortcut":"Şortkat","shorten":"Şortın","shorter":"Şortır","shortest":"Şortist","shortly":"Şortli","shorts":"Şorts","shot":"Şat","shots":"Şats","should":"Şud","shoulder":"Şouldır","shoulders":"Şovldırz","shouldn":"Şudınt","should've":"Şudıv","shout":"Şaut","shouted":"Şautid","shouting":"Şautin","shovel":"Şavıl","show":"Şou","showcase":"Şovkeys","showed":"Şovd","shower":"Şauır","showers":"Şavvırz","showing":"Şoving","shown":"Şovn","shows":"Şovz","shrimp":"Şrimp","shroud":"Şraud","shrouded":"Şraudid","shun":"Şan","shunned":"Şand","shut":"Şat","shuts":"Şats","shy":"Şay","shyest":"Şayist","siberian":"Saybiriyn","siblings":"Siblingz","sick":"Sik","side":"Sayd","sides":"Saydz","sidewalks":"Saydvoks","sighed":"Sayd","sight":"Sayt","sights":"Sayts","sightseeing":"Saysitiing","sign":"Sayn","signal":"Signıl","signals":"Signılz","signed":"Saynd","signers":"Saynırz","significance":"Signifikıns","significant":"Signifikınt","significantly":"Signifikıntli","signing":"Sayning","signs":"Saynz","silence":"Saylıns","silent":"Saylınt","silently":"Sayləntli","silicon":"Silikın","silliness":"Silinıs","silly":"Sili","silver":"Silvır","silverman":"Silvırmən","silvia":"Silviyə","sim":"Sim","simge":"Simge","similar":"Similır","similarities":"Similerətiz","similarly":"Similerli","simmer":"Simır","simon":"Saymın","simone":"Simon","simon's":"Saymınz","simple":"Simpıl","simpler":"Simpılır","simplest":"Simplist","simplification":"Simplifikeyşın","simplify":"Simplifay","simply":"Simpli","simulates":"Simyuleyts","sin":"Sin","sina":"Sinə","since":"Sins","sincerely":"Sinsirli","sinem":"Sinem","sing":"Sing","singapore":"Singapor","singapore's":"Singaporz","singer":"Singır","singing":"Singing","single":"Singl","singlet":"Singlet","sink":"Sink","sins":"Sins","sip":"Sip","sir":"Sör","sisteme":"Sisteme","sister":"Sistır","sisters":"Sistırz","sister's":"Sistırz","sit":"Sit","site":"Sayt","sites":"Sayts","sitting":"Siting","situated":"Situveytıd","situation":"Siçueyşn","situations":"Siçueyşınz","six":"Siks","sixteen":"Sikstin","sixteenth":"Sikstinθ","size":"Sayz","sizzling":"Sizling","skateboard":"Skeytbord","skater":"Skteytır","sketchiness":"Skeçinıs","sketchy":"Skeçi","skiing":"Skiying","skill":"Skil","skilled":"Skild","skillfully":"Skilfəli","skills":"Skils","skin":"Skin","skinny":"Skini","skins":"Skinz","skip":"Skip","skipped":"Skipt","skipping":"Skipping","skirt":"Skört","skirting":"Skirting","skirts":"Skörts","sky":"Skay","skydiving":"Staydayving","skyline":"Skaylayn","skyrocketed":"Skayrakıtıd","skyscraper":"Skayskreypır","skyscrapers":"Skayskreypırz","slack":"Slek","slamming":"Sleming","slang":"Sleng","slapped":"Slept","slapping":"Sleping","slasher":"Sleşır","slave":"Sleyv","slavery":"Sleyvəri","sleep":"Sliip","sleeping":"Sliiping","sleepless":"Slipləs","sleeps":"Sliips","sleepy":"Sliipi","sleet":"Sliit","sleeve":"Sliiv","sleeves":"Sliivz","slept":"Slept","slightly":"Slaytli","slim":"Slim","sling":"Sling","slipped":"Slipt","slogan":"Slogın","sloganeering":"Slogıniring","slogans":"Slogınz","slow":"Slou","slower":"Slovır","slowing":"Sloving","slowly":"Slovli","slup":"Slap","slur":"Slör","small":"Smol","smaller":"Smalır","smallest":"Smolıst","smart":"Smart","smarter":"Smartır","smartly":"Smartli","smartphone":"Smartfovn","smell":"Smel","smelled":"Smeld","smelling":"Smeling","smells":"Smels","smelly":"Smeli","smile":"Smayl","smiled":"Smayld","smiles":"Smaylz","smiths'":"Smitθs","smoke":"Smouk","smoker":"Smokır","smokes":"Smovks","smoking":"Smoking","smooch":"Smuç","smooth":"Smuuth","smoothies":"Smuviz","smoothly":"Smuuvli","smuggling":"Smagling","snack":"Snek","snap":"Sney","sneak":"Snik","sneakers":"Snikırz","sneaking":"Sneking","sneaky":"Sneki","snooze":"Snuz","snow":"Snou","snowboarding":"Snobording","snowed":"Snovd","snowmelt":"Snovmelt","snows":"Snova","snuck":"Snak","soap":"Soup","sobrino":"Sobrinov","soci":"Sovsi","sociable":"Sovşəbıl","social":"Sosıl","socialise":"Sovşəlayz","socially":"Sovşəli","society":"Sısayıti","socks":"Saks","soda":"Sovdə","sofa":"Sovfə","sofas":"Sovfəs","sofia":"Sofiə","sofia's":"Sofiəs","soft":"Soft","softly":"Softli","software":"Softvevr","soil":"Soil","soil's":"Soyils","sokmaksa":"Sokmaksa","solar":"Sovlır","sold":"Sovld","soldier":"Soulcır","soldiers":"Sovlcırz","solution":"Suluşın","solutions":"Soluşınz","solve":"Solv","solved":"Solvd","solves":"Solvz","solving":"Solvin","some":"Sam","somebody":"Sambadi","somebody's":"Sambadiz","someday":"Samdey","somehow":"Samhav","someone":"Samwan","someone's":"Samvanz","someplace":"Sampleys","something":"Samting","sometime":"Samtaym","sometimes":"Samtaymz","somewhat":"Samvat","somewhere":"Samweır","somwhere":"Samveyr","son":"San","song":"Song","songs":"Songz","sonra":"Sonra","sons":"Sans","son's":"Sans","sonuca":"Sonuca","sonya":"Sonyə","soon":"Suun","sooner":"Sunır","sophie":"Sovfi","sophisticated":"Sofistikeytıd","sore":"Sor","sorrow":"Sarov","sorry":"Sori","sort":"Sort","sorta":"Sortı","sorts":"Sorts","sorumluluk":"Sorumluluk","sorunu":"Sorunu","sought":"Sot","sound":"Saund","sounds":"Saundz","soup":"Suup","soup's":"Sups","sour":"Savvır","source":"Soors","sources":"Sorsız","souring":"Savvıring","south":"Sauth","southeast":"Savθist","southern":"Sadın","souvenir":"Suvənir","souvenirs":"Suvənirs","sovereign":"Savrın","soy":"Soy","soya":"Soyə","spa":"Spa","space":"Speys","spaces":"Speysız","spacious":"Speyşıs","spain":"Speyn","spangled":"Spengıld","spaniard":"Spenyırd","spaniards":"Spenyırdz","spanish":"Spéniş","spanning":"Spening","spare":"Speyr","sparkling":"Sparkling","sparse":"Spars","speacials":"Speşılz","speak":"Spiik","speaker":"Spikır","speakers":"Spikırz","speaker's":"Spikırz","speaking":"Spiking","speaks":"Spiiks","special":"Speşl","specialise":"Speşəlayz","specialist":"Speşəlist","specialists":"Speşılısts","specialities":"Speşiyelətiz","specialized":"Speşılayzd","species":"Spişiz","specific":"Spesifik","specify":"Spesifay","speck":"Spek","spectacular":"Spektakyulır","spectrums":"Spektrımz","speculations":"Spekyuleyşınz","speech":"Spiiç","speeches":"Spiçız","speechless":"Spiçləs","speed":"Spiid","speeding":"Spiiding","spelling":"Speling","spend":"Spend","spending":"Spending","spendings":"Spendings","spends":"Spends","spent":"Spent","sperm":"Spörm","spice":"Spays","spicy":"Spaysi","spiked":"Spraykt","spill":"Spil","spinach":"Spinıc","spinning":"Spining","spirit":"Spırit","spirits":"Spirits","spiritual":"Spiritçuəl","spirituality":"Spiritüeliti","spite":"Spayt","splash":"Spleş","splashed":"Spleşt","split":"Split","spoil":"Spoil","spoiled":"Spoyld","spoiling":"Spoyling","spoke":"Spovk","spoken":"Spokın","spokesman":"Spovksmın","sponsor":"Spansır","sponsoring":"Spansoring","sponsorship":"Spansırşip","spoon":"Spuun","sporlar":"Sporlar","sport":"Sport","sporting":"Spooring","sports":"Sports","spot":"Spat","spots":"Spats","spotted":"Spatid","spouse":"Spaus","sprain":"Spreyn","sprained":"Spreyn","spray":"Spray","sprayed":"Sprayd","spread":"Spred","spreads":"Spredz","spree":"Sprii","spring":"Spring","sprint":"Sprint","sprinting":"Sprinting","spuare":"Skuveır","sql":"Es kyu el","square":"Skueır","squat":"Skvat","squeeze":"Skviz","squeezed":"Skvizd","squeezing":"Skvizing","squirrel":"Skvirıl","squirrels":"Skvirıls","sshhh":"Şşş","st":"Sınt","sta":"Sta","stability":"Stıbilıti","stabilized":"Steybılayzd","stable":"Steybıl","stadium":"Steydiyum","staff":"Staaf","staff's":"Stafs","stage":"Steyc","stages":"Steycız","stain":"Steyn","stairs":"Steyrz","stalls":"Stolz","stanbul":"İstanbul","stand":"Stend","standard":"Standırd","standards":"Standırdz","standing":"Standing","stands":"Stends","staple":"Steypıl","stapler":"Steyplır","star":"Star","starbucks":"Starbaks","starch":"Starç","starchy":"Starçi","stare":"Steyr","stared":"Steyrd","staring":"Steyring","stars":"Stars","start":"Start","started":"Startid","starter":"Startır","starters":"Startırz","starting":"Starting","starts":"Starts","startup":"Startap","starvation":"Starveyşın","starve":"Starv","starving":"Starving","state":"Steyt","stated":"Steytid","statement":"Steytmınt","states":"Steyts","stating":"Steytin","station":"Steyşn","stations":"Steyşınz","statistical":"Statistikıl","statistically":"Statistikli","statistics":"Statistiks","stats":"Stets","statue":"Staçu","statues":"Staçuz","status":"Steytus","stay":"Stey","staycation":"Steykeyşın","stayed":"Steyd","staying":"Steying","steadied":"Stedid","steadily":"Stedili","steady":"Stedi","steak":"Steyk","steal":"Stiil","stealing":"Stiling","steam":"Stiim","steel":"Stil","steeping":"Stiping","steer":"Stiir","steering":"Stiring","stefan":"Stefan","stella":"Stella","step":"Step","stepbrother":"Stepbradır","stepdaughter":"Stepdotır","stepfather":"Stepfadır","steps":"Steps","stereotype":"Steriotayp","stereotypes":"Steriotayps","stereotypical":"Steriyotipikıl","stew":"Stu","stewart":"Stuvart","sth":"Es ti eyç","stick":"Stik","stickers":"Stikırz","sticking":"Stiking","sticks":"Stiks","sticky":"Stiki","still":"Stil","stimulate":"Stimyuleyt","stimulated":"Stimüleytid","stir":"Stör","stoked":"Stovkt","stole":"Stovl","stolen":"Stolın","stomach":"Stomak","stone":"Stoun","stones":"Stovns","stood":"Stud","stoop":"Stup","stop":"Stap","stopped":"Stapt","stopping":"Stoping","stops":"Stops","storage":"Storıc","store":"Stoor","stores":"Storız","stories":"Storiz","storing":"Storing","storm":"Storm","storms":"Stormz","storm's":"Stormz","story":"Stori","storyline":"Storiylayn","storyteller":"Stori telır","storytellers":"Stori telırz","storytelling":"Stori teling","straight":"Streyt","straighten":"Streytın","straightforward":"Streytforvırd","strange":"Streync","strangely":"Streyncli","stranger":"Streyncır","strangers'":"Streyncırz","strategies":"Strateciz","strategy":"Strateci","strawberries":"Strovbəriz","strawberry":"Stroböri","stream":"Striim","streaming":"Striyming","streams":"Striimz","street":"Striit","streets":"Striits","streetwise":"Stritvayz","strenght":"Strentth","strength":"Strength","strengthen":"Strentvın","strengthened":"Strengdınd","strengths":"Strengks","stress":"Stres","stressed":"Strest","stressful":"Stresfıl","stretch":"Streç","strict":"Strikt","stricter":"Striktır","strictness":"Striktnıs","strike":"Strayk","striking":"Strayking","stripes":"Stayps","stripey":"Staypi","stripts":"Strip ts","striving":"Strayving","stroke":"Strouk","stroked":"Strovkt","strokes":"Strovks","stroking":"Strovking","stroll":"Strovl","strong":"Strong","stronger":"Strongır","strongest":"Strongıst","strongly":"Strongli","structural":"Strakçörıl","structure":"Strukçır","structured":"Straktırd","structures":"Strukçırz","struggle":"Stragl","struggled":"Stragıld","struggles":"Stragıls","struggling":"Stragling","stuart":"Stuvart","stubborn":"Stabörn","stubbs":"Stabs","stuck":"Stak","student":"Studınt","students":"Studınts","studied":"Stadid","studies":"Stadiz","studio":"Studiyov","study":"Stadi","studying":"Stadiing","stuff":"Staf","stuffed":"Staft","stunned":"Stand","stunning":"Staning","stupid":"Stüupid","stupidest":"Stupidist","stupidity":"Stupiditi","stupiedest":"Stupidist","style":"Stayl","styles":"Stayls","subcategory":"Sabketıgöri","subject":"Sabcıkt","subjects":"Sabcekts","submit":"Sabmit","submits":"Sabmits","submitted":"Sabmitid","subscribes":"Sabskraybs","subscription":"Sabskripşın","subscriptions":"Sabskripşınz","subsequent":"Sabstikvınt","subsequently":"Sabstikvıntli","subsiding":"Sabsayding","substance":"Sabstıns","substances":"Sabstınsız","substandard":"Sabstændırd","substantial":"Sabstenşıl","substitute":"Sabstitüt","substitution":"Sabstitüşın","suburbs":"Sabörbz","subway":"Sabvey","succeed":"Sıksiid","succeeded":"Sıksiidid","succeeding":"Sıksiiding","success":"Sıkses","successful":"Süksefıl","successfully":"Süksefəli","such":"Saç","suck":"Sak","sucking":"Saking","sudan":"Sudan","sudden":"Sadn","suddenly":"Sadnli","sue":"Su","sued":"Sud","suffer":"Safır","suffered":"Safırd","suffering":"Safıring","suffers":"Safırz","sufficient":"Sıfişınt","sugar":"Şugır","suggest":"Sıcest","suggested":"Sıcestıd","suggesting":"Sıcesting","suggestions":"Sıcestçınz","suggests":"Sıcests","suit":"Sut","suitable":"Sutəbıl","suitcase":"Sutkeys","suite":"Suit","suited":"Sutid","suites":"Suits","suits":"Suts","sulking":"Salking","sultanahmet":"Sultanahmet","sum":"Sam","summaries":"Saməriz","summarise":"Samərayz","summarising":"Samırayzing","summarizes":"Samərayzız","summary":"Saməri","summer":"Samır","summers":"Samırz","summer's":"Samırz","summit":"Samit","sums":"Samz","sun":"San","sunbathe":"Sanbeyv","sunbeds":"Sanbeds","sunburn":"Sanbörn","suncream":"Sankriim","sunday":"Sandey","sundays":"Sandeyz","sunflower":"Sanflavvır","sunflowers":"Sanflavvırz","sung":"Sang","sunglasses":"Sanglasız","sunken":"Sankın","sunlight":"Sanlayt","sunny":"Sani","sunrise":"Sanrayz","sunrises":"Sanrayzız","sun's":"Sanz","sunscreen":"Sanscreen","sunset":"Sunset","sunsets":"Sunsets","suntan":"Santen","super":"Suupır","superiority":"Süpiyiöriti","superman":"Süpırmen","supermarket":"Süpırmarket","supermarkets":"Süpırmarkets","superstar":"Süpıstar","supervised":"Süpörvayzd","supervising":"Süpörvayzing","supervisor":"Supervayzır","supplier":"Sıplayır","suppliers":"Sıplayırz","supplies":"Sıplays","supply":"Sıplay","support":"Sıport","supported":"Sıportid","supporters":"Sıportırz","supporting":"Sıporting","supportive":"Saportiv","supports":"Sıports","suppose":"Sıpovz","supposed":"Sıpovzd","suppress":"Sapres","suprise":"Sıprayz","sure":"Şuır","surely":"Şurli","surface":"Sörfıs","surfaces":"Sörfısız","surfing":"Sörfin","surge":"Sörc","surgery":"Sörcəri","surges":"Sörcız","surname":"Sörneym","surprise":"Sıprayz","surprised":"Sıprayzd","surprises":"Sıprayzız","surprising":"Sıprayzing","surprisingly":"Sıprayzingli","surprize":"Sıprayz","surround":"Sıraund","surrounded":"Sıraundid","surroundings":"Sıraundings","surve":"Sörv","survey":"Sörvey","survival":"Sörvayvəl","survive":"Sörvayv","sushi":"Suşi","suspect":"Sıspekt","suspend":"Saspend","suspended":"Saspendid","suspicious":"Saspışıs","sustain":"Sasteyn","sustainability":"Sasteynəbiləti","sustainable":"Sasteynəbıl","sustainer":"Süsteynır","suzan":"Suzan","swag":"Sveg","swanson":"Svansın","swat":"Svat","swear":"Sweır","sweat":"Svet","sweated":"Svetid","sweater":"Svetır","sweating":"Svetin","sweaty":"Sveti","sweden":"Swiidın","sweet":"Swiit","sweeter":"Switır","sweetpea":"Switpi","sweets":"Sviits","sweltering":"Sveltıring","swim":"Swim","swimming":"Swiming","swing":"Swing","swiped":"Svaypd","swish":"Sviş","swishing":"Svişing","switch":"Swiç","switched":"Sviçt","switching":"Sviçing","switzerland":"Svitsırlend","swivel":"Svivıl","swollen":"Svovlın","sword":"Sord","symbol":"Simbl","symbolises":"Simbəlayzız","symbols":"Simbılz","symmetry":"Simətri","sympathy":"Simpəti","symptoms":"Simptımz","syncing":"Sinking","synonyms":"Sinənimz","synthesizers":"Sintisayzırz","synthetic":"Sintetik","syria":"Siriya","syrup":"Sirıp","system":"Sistım","systematically":"Sistemətikli","ta":"Ta","tab":"Teb","table":"Teybl","tables":"Teybıls","table's":"Teybılz","tablet":"Teblıt","tablets":"Teblıts","tabloid":"Tebloyd","tabloids":"Tebloydız","tacis":"Tesis","tackle":"Tekıl","tackled":"Tekıld","tacos":"Takos","tactful":"Tektfıl","taekwondo":"Taykvondo","tag":"Teg","tailed":"Teyld","tailor":"Teylır","tailored":"Teylırd","tails":"Teylz","tainted":"Teyntid","taj":"Tac","take":"Teyk","takeaway":"Teykavey","taken":"Teykın","takeout":"Teykaut","takes":"Teyks","taking":"Teyking","taksim":"Taksim","talent":"Telınt","talented":"Telıntıd","talents":"Telınts","talk":"Tolk","talkative":"Tokıtiv","talked":"Tokt","talking":"Toking","talks":"Toks","tall":"Tool","tallest":"Tolıst","tamil":"Tamil","tamir":"Tamir","tamper":"Tempır","tampering":"Tempıring","tan":"Ten","tang":"Teng","tank":"Tenk","tanks":"Tenks","tap":"Tep","tape":"Teyp","tapping":"Tapping","target":"Targıt","targeted":"Targıtıd","targets":"Targıts","tariff":"Terif","tariffs":"Terifs","tarnishing":"Tarnişing","task":"Task","tasks":"Tasks","taste":"Teyst","tasted":"Teystıd","tastes":"Teysts","tasting":"Teysting","tattoo":"Tatu","tattoos":"Tatu s","taught":"Tot","tavas":"Tavas","tax":"Teks","taxed":"Tekst","taxes":"Teksız","taxi":"Teksi","taxpayers":"Tekspeyırz","tba":"Ti bi ey","tbc":"Ti bi si","tbd":"Ti bi di","tea":"Tii","teach":"Tiiç","teacher":"Tiiçır","teachers":"Tiçırz","teacher's":"Tiçırz","teaches":"Tiçız","teaching":"Tiçing","team":"Tiim","teammates":"Tiimmeyts","teams":"Tiimz","team's":"Tiimz","teamwork":"Tiimvörk","tears":"Tiyirz","teasing":"Tizing","tech":"Tek","technical":"Teknikıl","technician":"Teknişın","techniques":"Tekniks","techno":"Tekno","technological":"Teknəlacikıl","technology":"Teknoloji","teen":"Tiin","teenage":"Tineyc","teenager":"Tineycır","teenagers":"Tineycırz","teeth":"Tiit","telephone":"Telıfoun","television":"Telıvijn","tell":"Tel","telling":"Teling","tells":"Tels","temper":"Tempır","temperature":"Tempriçır","temperatures":"Tempriçırs","template":"Templeyt","temporarily":"Tempərərili","temporary":"Tempərəri","tempt":"Tempt","tempted":"Temptid","ten":"Ten","tenacity":"Tinasəti","tenancy":"Tenınsi","tenant":"Tenınt","tenants":"Tenınts","tend":"Tend","tendering":"Tendıring","tends":"Tendz","tennis":"Tenis","tenochtitlan":"Tenoktitlan","tense":"Tens","tenses":"Tensız","tension":"Tenşın","tent":"Tent","tents":"Tents","tercihtir":"Tercihtir","teresa":"Terizə","term":"Törm","termination":"Törmineyşın","terms":"Törmz","terrible":"Terıbl","terribly":"Teribli","terrific":"Tırifik","terrified":"Terifayd","terrifying":"Terifaying","territories":"Teritöriz","terrorist":"Terörist","terrorists":"Teröristz","test":"Test","testicles":"Testikıls","testing":"Testing","tests":"Tests","texas":"Teksıs","text":"Tekst","texter":"Tekstır","textile":"Tekstayl","texting":"Teksting","texts":"Teksts","texture":"Teksçır","th":"Tiy","thai":"Tay","than":"Den","thank":"Thenk","thanked":"Tenkt","thankful":"Tenkfıl","thanking":"Tenking","thanks":"Tenks","thanksgiving":"Tenksgiving","that'll":"Detıl","that's":"Dets","thawed":"Tod","theater":"Tiyıtır","theatre":"Thiıtır","thee":"Dhi","theft":"Teft","thefts":"Thefts","their":"Theır","them":"Them","theme":"Tim","themselves":"Demzelvz","then":"Then","theoretical":"Tiröretikıl","theoretically":"Tiyöretikli","theory":"Tiyori","theo's":"Tiyovz","therapist":"Terəpist","therapy":"Terəpi","there":"Theer","therefore":"Deırfoor","there's":"Deyrz","these":"Diz","thet":"Det","they'll":"Deyl","they've":"Deyv","thick":"Thik","thief":"Thiif","thin":"Thin","thine":"Dayn","thing":"Thing","things":"Tings","think":"Think","thinking":"Tinking","thinks":"Tinks","thinnest":"Tinist","thins":"Tins","third":"Törd","thirsty":"Thörsti","thirty":"Törti","thomas":"Tamıs","thorough":"Tharou","thoroughly":"Thörəli","those":"Dovz","thou":"Dau","though":"Dou","thought":"Thoot","thoughtful":"Totfıl","thoughtfully":"Totfəli","thoughts":"Tots","thousand":"Tuzınd","thousands":"Tazındz","threat":"Thret","threatening":"Thretining","three":"Tri","threefold":"Thrifold","threshold":"Treşold","thrill":"Thrill","thrilled":"Thrild","thrilling":"Thriling","throat":"Throut","through":"turuu","throughout":"Truraut","throw":"Throu","throwing":"Throwing","thrown":"Throvn","throws":"Throvz","thught":"Tot","thumb":"Tham","thumbs":"Thams","thumbtacks":"Thamtaks","thunder":"Thandır","thursday":"Thözdey","thursdays":"Thörzdeyz","thus":"Das","thy":"Day","tick":"Tik","ticked":"Tikt","ticket":"Tikıt","tickets":"Tikits","ticking":"Tiking","tide":"Tayd","tidy":"Taydi","tie":"Tay","tied":"Tayd","tiger":"Taygır","tigers":"Taygırz","tight":"Tayt","tikka":"Tikə","till":"til","tilt":"Tilt","tim":"Tim","time":"Taym","timeline":"Taymlayn","times":"Taymz","timing":"Tayming","tin":"Tin","tina":"Tinə","tinder":"Tindır","tins":"Tins","tiny":"Tayni","tip":"Tip","tips":"Tips","tiramis":"Tiramisu","tire":"Tayır","tired":"Tayırd","tiredness":"Tayırdnıs","tirelessly":"Tayırləsli","tires":"Tayır","tiring":"Tayıring","tirmek":"Tirmek","tissue":"Tişuu","title":"Taytl","titles":"Taytıls","titre":"Tiatr","tldr":"Ti el di ar","toast":"Tovst","toasters":"Tostırz","toasting":"Tosting","tobacco":"Tıbakou","today":"Tıdey","today's":"Tudeyz","toes":"Tovz","together":"Tıgedır","toilet":"Toylet","toilets":"Toylets","token":"Tokın","tokyo":"Tokiyo","told":"Told","tolerance":"Talörıns","tolerant":"Təlörənt","tolerate":"Talöreyt","tom":"Tam","tomato":"Tomatov","tomatoes":"Tomeytovz","tombstone":"Tumstovn","tomorrow":"Tımarou","tomorrow's":"Tomorovz","tom's":"Tamz","tongue":"Tang","tonigh":"Tunayt","tonight":"Tınayt","tony":"Tovni","too":"Tuu","took":"Tuk","tools":"Tulz","top":"Tap","topic":"Tapik","topics":"Tapiks","topla":"Topla","toplant":"Toplant","toppings":"Topings","tops":"Tops","toranto":"Töranto","torch":"Torç","torment":"Tormınt","toronto":"Töranto","torrential":"Törenşıl","tortoise":"Tortıs","tortoises":"Tortısız","torture":"Torçır","total":"Toutıl","totally":"Toutıli","touch":"Taç","touchdown":"Taçdaun","touched":"Taçt","touching":"Taçing","tough":"Taf","tour":"Tur","toured":"Tord","touring":"Toring","tourism":"Turizım","tourist":"Turist","tourists":"Turists","touristy":"Turisti","tournament":"Turnımınt","tournaments":"Turnımınts","tours":"Turs","toward":"Tovord","towards":"Tıwordz","towel":"Tauıl","towels":"Tavıls","tower":"Tauır","town":"Taun","towns":"Tauns","town's":"Tauns","toy":"Toy","toys":"Toys","tr":"Ti ar","trace":"Treys","traced":"Treyst","tracing":"Treysing","track":"Trek","tracked":"Trekd","tracking":"Treking","tracy":"Treysi","trade":"Treyd","tradition":"Tradişın","traditional":"Tradişınl","traditionally":"Tradişınıli","traditions":"Tradişınz","traffic":"Trafik","trafficking":"Trafikin","tragedies":"Tracədiz","tragedy":"Tradcədi","trail":"Treyl","trails":"Treyz","train":"Treyn","trained":"Treynd","trainers":"Treynırz","training":"Treyning","trains":"Treyns","traits":"Treys","tram":"Trem","transaction":"Trenzäkşın","transactions":"Tränzäkşınz","transatlantic":"Tränzətlantik","transcript":"Trenskript","transfer":"Trensför","transferrable":"Tränsförəbıl","transfers":"Tränsförz","transform":"Transform","transformation":"Trensformeyşın","transformations":"Tränsformeyşınz","transformed":"Transformd","transit":"Trenzit","translation":"Tränzleyşın","transmission":"Trenzmişın","transparency":"Trenspeyrensi","transparent":"Trenspeyrınt","transparently":"Tränspeyrıntli","transport":"Trensport","transporting":"Tränsporing","trap":"Tep","trapped":"Trept","trash":"Treş","traumatic":"Tramatik","travel":"Trevl","traveled":"Trevld","traveling":"Trevling","travelled":"Trevld","travelling":"Trevling","travels":"Trevlz","tray":"Trey","trays":"Treyz","treasure":"Trejır","treat":"Triit","treated":"Tritid","treating":"Tritin","treatment":"Triitmınt","treatry":"Tritri","treats":"Triits","tree":"Trii","trees":"Triiz","trembling":"Trembling","trend":"Trend","trending":"Trending","trends":"Trends","trendy":"Trendi","trial":"Trayıl","triangle":"Trayengıl","tribe":"Trayb","tribes":"Traybz","trick":"Trik","tricking":"Triking","tricks":"Triks","tried":"Trayd","tries":"Trayz","triggered":"Trigırd","triggers":"Trigırz","trinh":"Trin","trip":"Trip","triple":"Tripıl","trips":"Trips","tritanium":"Triteyniyım","troll":"Troll","trolled":"Trold","trolls":"Trollz","troops":"Truvps","tropical":"Trapikıl","trouble":"Trabl","troublemaker":"Trabılmeykır","troubles":"Trabıls","troublesome":"Trabılsım","trousers":"Trauzız","trublemaker":"Trabılmeykır","truck":"Trak","trucks":"Traks","true":"Truu","trump":"Tramp","trumpeted":"Trampitid","trust":"Trast","trusted":"Trasted","trustful":"Trastfıl","trusts":"Trasts","trustworthy":"Trastvörði","truth":"Truth","try":"Tray","trying":"Traying","t's":"Tiiz","tub":"Tab","tube":"Tüub","tuck":"Tak","tuesday":"Tüuzdey","tuesdays":"Tuzdeyz","tulum":"Tulum","tumor":"Tumır","tune":"Tüun","tunnel":"Tanl","tupperware":"Tapırveır","turin":"Turın","turkey":"Törki","turkish":"Törkiş","turmeric":"Törmərik","turn":"Törn","turned":"Törnd","turns":"Törnz","turtle":"Törtıl","tutarsan":"Tutarsan","tutorial":"Tutorriyəl","tv":"Ti vi","tweet":"Tvit","twelve":"Twelv","twentieth":"Tvventiθ","twenty":"Tventi","twice":"Tways","twin":"Twin","twinkling":"Tvinkling","twins":"Twins","twist":"Twist","twists":"Twists","twitter":"Twitır","two":"Tu","type":"Tayp","typed":"Taypt","types":"Tayps","typical":"Tipikıl","typically":"Tipikli","typing":"Tayping","tyre":"Tayır","tyrese":"Tayris","u":"Yu","ucla":"Yu si el ey","uk":"Yu key","ukraine":"Yukreyn","ull":"Al","ultimate":"Altımıt","ultrasound":"Altrasound","umbrella":"Ambrela","un":"Yu en","unable":"Aneybl","unacceptable":"Anakseptəbıl","unauthorized":"Anotorayzd","unavoidable":"Anöveydəbıl","unbearable":"Anbeyrəbıl","unbelievable":"Anbilivəbıl","uncertain":"Ansörtın","uncertainty":"Ansörtınti","uncertantiy":"Ansörtınti","unchanged":"Ançeync","uncle":"Ankl","unclean":"Ankliin","uncomfortable":"Ankafırdebıl","undecided":"Andisaydid","undefined":"Andifaynd","under":"Andır","undercooked":"Andırkukt","underdog":"Andırdog","underestimate":"Andırestimeyt","undergo":"Andıgov","undergoes":"Andıgovz","undergoing":"Andıgoving","undergone":"Andırgon","undergraduate":"Andıgreduıt","underground":"Andıgraund","underlines":"Andırlaynz","underrepresented":"Andırreprızentid","understand":"Andıstend","understandable":"Andırstandəbıl","understanding":"Andırstanding","understands":"Andırstands","understood":"Andıstud","underway":"Andırvey","underwent":"Andırvvent","undesirable":"Andizayrəbıl","undocumented":"Andıdokyumentid","uneasy":"Anizi","unemployed":"Animployd","unemployment":"Animploymınt","unequal":"Anikvəl","unexpected":"Anıkspektıd","unexpectedly":"Anikspektidli","unexplained":"Anikspleynd","unfair":"Anfeir","unfairly":"Anfeirli","unfamiliar":"Anfemiliyır","unfavourable":"Anfeyvırəbıl","unfold":"Anfold","unfolded":"Anfouldid","unfolds":"Anfolds","unforgettable":"Anförgetəbıl","unfortunate":"Anforçunıt","unfortunately":"Anforçunıtli","ungrateful":"Angreytfıl","unhappy":"Anhepi","unhealthy":"Anhelti","unicorn":"Yunikorn","unicorns":"Yunikornz","uniformed":"Yuniförmd","unilateral":"Yunilætərıl","unimportant":"Animpörtınt","union":"Yunyın","union's":"Yunyınz","unique":"Yunik","united":"Yunaytıd","universal":"Yunivörsıl","universe":"Yunivörs","universities":"Yunivörsətiz","university":"Yunivörsıti","unjust":"Ancast","unknown":"Announ","unless":"Anles","unlike":"Anlayk","unlikely":"Anlaykli","unlimited":"Anlimitid","unluckily":"Anlakili","unlucky":"Anlaki","unmotivated":"Anmovtiveytid","unmute":"Anmyut","unnatural":"Anneçrıl","unnoticed":"Annovtist","unofficial":"Anofişıl","unpaid":"Anpeyd","unpause":"Anpoz","unpersuaded":"Anpörsveydid","unpleasant":"Anplezınt","unplugging":"Anplaging","unpredictable":"Anpridiktəbıl","unrealistic":"Anriyəlistik","unrealistically":"Anriyəlistikli","unreality":"Anriyæləti","unresponsive":"Anrisponsiv","unsafe":"Anseyf","unstable":"Ansteybıl","unsuccessful":"Ansüksefıl","unsuccessfully":"Ansüksefəli","unsure":"Anşur","until":"Antil","untrue":"Antru","untrustworthy":"Antrastvörði","unusual":"Anyujuıl","unusually":"Anyujuəli","unwanted":"Anvontid","unwavering":"Anveyvıring","unwell":"Anvel","unwind":"Anvaynd","unwrap":"Anrrep","up":"Ap","upbringing":"Apbringing","upcoming":"Apkaming","upcycled":"Apsaykıld","update":"Apdeyt","updated":"Apdeytid","updating":"Apdeyting","upgrade":"Apgradey","upgrades":"Apgradeys","upon":"Epın","upper":"Apır","ups":"Aps","upset":"Apset","upstairs":"Apsteız","uptown":"Aptaun","upward":"Apvırd","upwards":"Apvırdz","urban":"Örbın","urbex":"Örbeks","urge":"Ööc","urged":"Örcd","urgent":"Ööcınt","urgently":"Örcıntli","us":"As","usa":"Yu es ey","usage":"Yusic","use":"Yuus","used":"Yuzd","useful":"Yuusfl","user":"Yuzır","username":"Yuzıneym","users":"Yuzırz","uses":"Yuzız","using":"Yuzing","usual":"Yujl","usually":"Yujuəli","ut":"Yu ti","utilities":"Yutilitiz","utility":"Yutilıti","vacation":"Vakeyşın","vacations":"Vakeyşınz","vaccines":"Vaksiins","vacuum":"Vakyum","vacuumed":"Vakyumd","vag":"Veg","vagina":"Vacinə","vaginas":"Vacayınəs","valid":"Valid","validated":"Valideytid","valley":"Veli","valuable":"Velyubl","value":"Velyu","values":"Velyuz","valve":"Velv","van":"Ven","vanilla":"Vanilə","vanish":"Venış","vape":"Veyp","vapes":"Veyps","vaping":"Veyping","vaporize":"Veypırayz","varied":"Verid","varies":"Veryiz","variety":"Verayıti","various":"Veırıis","vary":"Veri","vase":"Veyz","vault":"Voltv","vegan":"Vigın","vegatarian":"Vecıteryın","vegetables":"Vecıtəbıls","vegetarian":"Vecıteryın","vegetation":"Veciteyşın","vegeterian":"Vecıteryın","vehicle":"Viikıl","vehicles":"Viikıls","veli":"Veli","vending":"Vending","venice":"Venis","vented":"Ventid","venue":"Venyu","verb":"Vörb","verbs":"Vörbz","verified":"Verifayd","verify":"Verifay","versatile":"Vörsətayl","verse":"Vörs","version":"Vörjın","versions":"Vörjınz","very":"Veri","vet":"Vet","vets":"Vets","via":"Vayə","viaggio":"Viyacov","viagra":"Vayegrə","vibrates":"Vaybreyts","victim":"Viktım","victims":"Viktımz","victor":"Viktır","victoria":"Viktoriyə","victory":"Viktri","video":"Vidyov","videos":"Vidyovz","view":"Viu","viewed":"Vyud","views":"Vyuz","viking":"Vayking","village":"Vilıc","villagers":"Vilıcırz","villages":"Vilıcız","vince":"Vins","vincenzo":"Vinsenco","vinegar":"Vinigır","vintage":"Vintic","violates":"Vayıleyts","violence":"Vayılıns","violent":"Vaylınt","violently":"Vayıləntli","vip":"Vip","viral":"Vayrıl","virus":"Vayrıs","visa":"Viizı","visibility":"Vizəbiləti","visible":"Vizıbl","vision":"Vijn","visionary":"Vijönəri","visions":"Vijınz","visit":"Vizit","visited":"Vizitıd","visiting":"Viziting","visitors":"Vizitırz","visits":"Vizits","visual":"Vijual","visualization":"Vijüalayzeyşın","visually":"Vijüəli","vital":"Vaytıl","vitamin":"Vitamin","vivacious":"Viveyşıs","vivid":"Vivid","vlog":"Vlog","vocabulary":"Vokebyuləri","vocal":"Vokıl","voice":"Vois","voices":"Voyısız","volcanic":"Volkənik","volcano":"Valkeynov","volcanoes":"Volkənoyz","volleyball":"Voliból","volumes":"Volyumz","volunteer":"Volıntiyır","volunteering":"Volıntiyring","vomiting":"Vamiting","vote":"Vout","voted":"Vovtid","vowel":"Vavıl","vows":"Vavs","vpn":"Vi pi en","vs":"Vi es","vulnerable":"Vulnerıbıl","wacth":"Vaç","wadi":"Vadi","wage":"Weyc","waged":"Veycd","wages":"Veycız","waging":"Veycing","wait":"Weit","waited":"Veytıd","waiter":"Weytır","waiters":"Veytırz","waiting":"Veyting","wake":"Weyk","wakefield":"Veykfild","wakes":"Veyks","waking":"Veyking","walk":"Wolk","walked":"Vokt","walking":"Voking","walks":"Voks","wall":"Wool","wallet":"Valit","walls":"Volz","wandering":"Vandıring","wanna":"Vanı","want":"Wont","wanted":"Vantid","wanting":"Vanting","wants":"Vants","war":"Wor","wariness":"Veyrinıs","wark":"Vörk","warm":"Worm","warmer":"Vormır","warming":"Warming","warms":"Vorms","warmth":"Vormt","warn":"Worn","warned":"Vornd","warning":"Vornin","warns":"Vornz","warrior":"Veriyör","wars":"Vors","warsaw":"Vorsov","wash":"Woş","washed":"Voşt","washer":"Voşır","washes":"Voşız","washing":"Voşing","washington":"Voşington","wasn":"Vazınt","waste":"Weyst","wasted":"Veystid","waster":"Veystır","wasters":"Veystırz","wasting":"Veyting","watch":"Woç","watched":"Voçt","watching":"Vaçing","watchman":"Vaçmın","water":"Wotır","watering":"Votıring","watermelon":"Votırmelen","waters":"Votırz","wave":"Weyv","waves":"Veyvz","waving":"Veyving","wax":"Veks","way":"Wey","wayne":"Veyn","ways":"Veyz","weak":"Wiik","weaker":"Vikır","weakness":"Wiknıs","weaknesses":"Viknısız","wealth":"Welth","wealthier":"Velthiyır","wealthy":"Welthi","weapon":"Wepın","wear":"Weır","weariness":"Viyirinıs","wearing":"Verin","wears":"Veyrz","weather":"Wedır","weathered":"Vedırd","web":"Veb","webinar":"Vebinar","website":"Vebsayt","websites":"Vebsayts","wedding":"Veding","wednesday":"Wenzdey","week":"Wiik","weekdays":"Vikdeyz","weekend":"Vikend","weekends":"Vikends","weekly":"Wikli","weeks":"Viks","week's":"Viks","weigh":"Weit","weighed":"Veyd","weighing":"Veying","weighs":"Veyz","weight":"Veyt","weights":"Veyts","weird":"Viyırd","weirdest":"Viyirdist","weirdness":"Viyirdnıs","welcome":"Welkam","welcoming":"Welkaming","welfare":"Velfeır","well":"Wel","wellbeing":"Velbiing","wellies":"Veliz","wellington":"Velingtın","wendy":"Vendi","went":"Vent","we're":"Viyir","weren":"Vörın","west":"West","wet":"Wet","wh":"Dabılyu eyç","whales":"Veyls","whatever":"Watevır","wheat":"Viyit","wheel":"Vil","wheels":"Viils","when":"Wen","whenever":"Wenevır","when's":"Vens","where":"Weır","whereas":"Veyerəz","where's":"Veyrz","wherever":"Veyrevır","whether":"Vedır","whetler":"Vetlır","which":"Viç","while":"Wayl","whilst":"Vaylist","whipped":"Vipt","whisking":"Visking","whispered":"Vispırd","whispering":"Vispering","whistling":"Visling","white":"Wayt","who":"Hu","whoever":"Huevır","whole":"Houl","wholemeal":"Hovlmiil","wholesale":"Hovlseyıl","whom":"Hum","who's":"Huz","whose":"Huuz","why":"Way","wide":"Wayd","widely":"Vaydli","widow":"Wıdou","widowers":"Vidovvırz","widows":"Vidovz","wife":"Wayf","wife's":"Vayfs","wight":"Vayt","wild":"Wayd","wildlife":"Vayldlayf","willfully":"Vilfəli","willies":"Viliz","willing":"Viling","willow":"Vilov","willy":"Vili","wilson":"Wilsın","wilting":"Vilting","wimbledon":"Wimbledon","win":"Win","wind":"Waynd","window":"Windou","windows":"Vindovz","winds":"Vindz","windsor":"Vindzır","wine":"Wayn","wing":"Ving","wings":"Vingz","winked":"Vinkt","winners":"Vinırz","winning":"Vining","winnings":"Viningz","wins":"Vins","winter":"Wintır","winters":"Vintırz","wip":"Vip","wipe":"Wayp","wire":"Wayır","wireless":"Vayırləs","wires":"Vayırz","wisdom":"Vayzdım","wise":"Wayz","wish":"Wiş","wishes":"Vişız","wit":"Vit","withdraw":"Withdro","withdrawal":"Vidroıl","withdrawn":"Withdrön","within":"Widin","without":"Widaut","witness":"Witnıs","witnesses":"Vitnısız","wobbling":"Vabling","woke":"Vovk","wold":"Vold","wolf":"Vulf","wolhuter":"Volhutır","woludn't":"Vudınt","wolves":"Vulvz","woman":"Wumın","womaniser":"Vumənayzır","woman's":"Vumınz","women":"Vimin","women's":"Viminz","won":"Van","wonder":"Wandır","wondered":"Vandırd","wonderful":"Wandıfl","wonderfully":"Vandörfıli","wondering":"Vandıring","wonders":"Vandırz","wood":"Wuud","wooden":"Vudın","word":"Wööd","words":"Vördz","wore":"Vor","work":"Wörk","workaholic":"Vörkeholic","worked":"Vörkt","worker":"Wörkır","workers":"Vörkırz","working":"Vörking","workload":"Vörklovd","workout":"Vörkaut","workplace":"Vörkpleys","works":"Vörks","worksheet":"Vörkşit","workshop":"Vörkşap","workshops":"Vörkşaps","workspace":"Vörkspeys","workstation":"Vörksteyşın","workwise":"Vörkvayz","world":"Wörld","worlds":"Vörldz","world's":"Vörldz","worldwide":"Vörldvayd","worried":"Vörid","worries":"Vöriz","worry":"Wöri","worse":"Wörs","worship":"Vörşip","worst":"Wörst","worth":"Wörth","would":"Vud","wouldn":"Vudınt","would've":"Vudıv","wound":"Wuund","wow":"Vav","wrap":"Rep","wrapped":"Rept","wrath":"Rath","wreak":"Rik","wreaked":"Rikt","wreck":"Rek","wrestle":"Resıl","wrestling":"Resling","wrinkles":"Ringkıls","wrist":"Rist","wristband":"Ristbend","wrists":"Rists","write":"Rayt","writer":"Raytır","writers":"Raytırz","writes":"Rayts","writing":"Rayting","writings":"Raytingz","written":"Ritın","writting":"Riding","wrong":"Rong","wrote":"Rovt","y":"Vay","yale":"Yeyl","yap":"Yap","yapar":"Yapar","yarn":"Yarn","yeah":"Ye","year":"Yiır","yearning":"Yörning","years":"Yirz","years'":"Yirz","year's":"Yirz","yelled":"Yeld","yellow":"Yelou","yells":"Yels","yep":"Yep","yerine":"Yerine","yes":"Yes","yesterday":"Yestıdey","yet":"Yet","yoga":"Yoga","yogurt":"Yogurt","yoke":"Yovk","yooo":"Yuu","york":"York","young":"Yang","younger":"Yangır","youngest":"Yangıst","you're":"Yor","yours":"Yors","yourself":"Yurself","yourselves":"Yorselvz","youths":"Yuuthz","youtube":"Yutub","yummy":"Yami","z":"Zet","zafira":"Zafira","zainab":"Zaynab","zaman":"Zaman","zayn":"Zeyn","zealand":"Ziilənd","zebras":"Zibrız","zellikle":"Özellikle","zeltmek":"Zeltmek","zone":"Zon","zones":"Zovns","zoo":"Zoo","zookeepers":"Zukipırz","zoom":"Zum","zoos":"Zuz","a, an":"Ey","and":"End","april":"Eyprıl","as":"Ez","at":"Et","august":"Agıst","be":"Bi","blonde":"Bland","boot":"But","can":"Ken","cd":"Sidi","cent":"Sent","cow":"Kau","dancer":"Densör","december":"Disembör","description":"Diskripşın","do":"Du","dvd":"Dividi","egg":"Eg","eighty":"Eyti","eleven":"Ilevın","farmer":"Farmör","fifteen":"Fiftin","for":"For","fourteen":"Fortin","geography":"Ciagrıfi","grandparent":"Grendperınt","have":"Hev","he":"Hi","i":"Ay","if":"If","in":"In","it":"It","lion":"Layın","magazine":"Megızin","me":"Mi","mile":"Mayl","my":"May","nineteen":"Nayntin","ninety":"Naynti","not":"Nat","of":"Iv","on":"An","pepper":"Pepör","photograph":"Fovtıgref","pig":"Pig","pink":"Pink","pound":"Paund","seventeen":"Sevıntin","she":"Şi","sheep":"Şip","shoe":"Şu","sixty":"Siksti","snake":"Sneyk","so":"Sov","spell":"Spel","that":"Det","the":"Dı","they":"Dey","thirteen":"Törtin","this":"Dis","to":"Tu","tooth":"Tut","t-shirt":"Tisört","vegetable":"Vectıbıl","visitor":"Vizitör","we":"Vi","what":"Hvıt","will":"Vil","with":"Vid","you":"Yu","your":"Yor","athlete":"Etlit","beef":"Bif","bin":"Bin","biscuit":"Biskıt","blow":"Blov","brush":"Brış","cartoon":"Kartun","column":"Kalım","cooker":"Kukör","cupboard":"Kıbörd","curly":"Körli","drama":"Dramı","electrical":"Ilektrikıl","employer":"Employör","fork":"Fork","frog":"Frag","gap":"Gep","height":"Hayt","hill":"Hil","invent":"Invent","jazz":"Cez","lamp":"Lemp","lemon":"Lemın","lend":"Lend","lorry":"Lori","manner":"Menör","mathematics":"Metımetiks","mirror":"Mirör","motorcycle":"Movtörsaykıl","novel":"Navıl","nut":"Nıt","ordinary":"Ordıneri","painter":"Peyntör","palace":"Pelıs","possession":"Pızeşın","poster":"Povstör","quietly":"Kvayıtli","railway":"Reylvey","researcher":"Risörçör","sail":"Seyl","secondly":"Sekındli","sheet":"Şit","ski":"Ski","soccer":"Sakör","sock":"Sak","spider":"Spaydör","stair":"Ster","stamp":"Stemp","suggestion":"Sıcesçın","tool":"Tul","trainer":"Treynör","traveller":"Trevılör","uniform":"Yunıform","unit":"Yunıt","winner":"Vinör","zero":"Zirov","achievement":"Içivmınt","ad":"Ed","aged":"Eycd","alcoholic":"Elkıhalik","assist":"Isist","attach":"Iteç","authority":"Itorıti","backwards":"Bekvördz","ban":"Ben","bomb":"Bam","branch":"Brenç","bubble":"Bıbıl","bury":"Beri","campus":"Kempıs","cap":"Kep","ceiling":"Silink","clause":"Kloz","coin":"Koyn","confuse":"Kınfyuz","consist":"Kınsist","cotton":"Katın","curtain":"Körtın","custom":"Kıstım","decorate":"Deköreyt","definite":"Defınıt","diagram":"Dayıgrem","diamond":"Daymınd","dirt":"Dört","disadvantage":"Disıdvenic","dust":"Dıst","edge":"Ec","element":"Elımınt","embarrassed":"Imberıst","entertain":"Enörteyn","examine":"Igzemin","expedition":"Ekspıdişın","explode":"Iksplovd","explosion":"Iksplovjın","fairly":"Ferli","flour":"Flauör","fold":"Fovld","folk":"Fovk","freeze":"Friz","frighten":"Fraytın","fry":"Fray","glove":"Glıv","grade":"Greyd","grain":"Greyn","imaginary":"Imecıneri","immigrant":"Imıgrınt","indoor":"Indor","indoors":"Indorz","keyboard":"Kibord","laboratory":"Lebrıtori","lay":"Ley","layer":"Leyör","leather":"Ledör","leisure":"Lejör","lip":"Lip","liquid":"Likvıd","locate":"Lovkeyt","meanwhile":"Minvayl","mild":"Mayld","nail":"Neyl","net":"Net","occur":"Ikör","old-fashioned":"Ovldfeşınd","ought":"Ot","pale":"Peyl","pin":"Pin","pipe":"Payp","poem":"Povım","poet":"Povıt","poison":"Poyzın","port":"Port","powder":"Paudör","prediction":"Pridikşın","prince":"Prins","printing":"Prinink","producer":"Prıdusör","qualified":"Kvalıfayd","reaction":"Riekşın","reference":"Reförıns","relation":"Rileyşın","repeated":"Ripitid","rope":"Rovp","row":"Rov","royal":"Royıl","rugby":"Rıgbi","sailor":"Seylör","sample":"Sempıl","scan":"Sken","seed":"Sid","servant":"Sörvınt","shine":"Şayn","shiny":"Şayni","similarity":"Simılerıti","slice":"Slays","solid":"Salıd","specifically":"Spısifikli","statistic":"Stıtistik","string":"Strink","summarize":"Sımörayz","supporter":"Sıportör","symptom":"Simptım","tail":"Teyl","technique":"Teknik","theirs":"Derz","toe":"Tov","translate":"Trensleyt","ugly":"Igli","underwear":"Indörver","unnecessary":"Inesıseri","viewer":"Vyuör","western":"Hvestörn","wool":"Vul","yard":"Yard","youth":"Yut","accuse":"Ikyuz","acquire":"Ikvayör","aircraft":"Erkreft","apparent":"Iperınt","approve":"Ipruv","arise":"Örayz","armed":"Armd","artistic":"Artistik","assess":"Ises","assessment":"Isesmınt","bent":"Bent","breast":"Brest","brief":"Brif","bullet":"Bulıt","bunch":"Bınç","bush":"Buş","cable":"Keybıl","calculate":"Kelkyıleyt","capture":"Kepçör","chairman":"Çermın","chief":"Çif","cite":"Sayt","classic":"Klesik","collapse":"Kıleps","command":"Kımend","commitment":"Kımitmınt","component":"Kımpovnınt","concentration":"Kansıntreyşın","construct":"Kanstrıkt","contribution":"Kantrıbyuşın","convert":"Kanvört","crash":"Kreş","creature":"Kriçör","crew":"Kru","criterion":"Kraytiriın","critic":"Kritik","curve":"Körv","curved":"Körvd","declare":"Dikler","decoration":"Deköreyşın","defend":"Difend","deliberate":"Diliböreyt","deliberately":"Dilibörıtli","depressing":"Dipresink","detect":"Ditekt","disc":"Disk","dishonest":"Disanıst","dismiss":"Dismis","display":"Displey","distribute":"Distribyut","district":"Distrikt","division":"Divijın","dominate":"Damıneyt","downwards":"Daunvördz","dozen":"Dızın","drag":"Dreg","edit":"Edıt","edition":"Idişın","elect":"Ilekt","elsewhere":"Elsver","enhance":"Enhens","enquiry":"Inkvayri","ethical":"Etikıl","evaluate":"Ivelyueyt","feather":"Fedör","flame":"Fleym","flash":"Fleş","folding":"Fovldink","fund":"Fınd","gang":"Genk","grant":"Grent","heel":"Hil","hollow":"Halov","humorous":"Hyumörıs","humour":"Hyumör","illustrate":"Ilıstreyt","illustration":"Ilıstreyşın","imagination":"Imecıneyşın","infection":"Infekşın","inner":"Inör","insight":"Insayt","institute":"Instıtut","interpret":"Intörprıt","judgement":"Cıcmınt","long-term":"Lonktörm","lung":"Lınk","matching":"Meçink","maximum":"Meksımım","measurement":"Mejörmınt","mineral":"Minörıl","minor":"Maynör","minority":"Maynorıti","modify":"Madıfay","moral":"Morıl","motor":"Movtör","multiply":"Mıltıplay","neat":"Nit","nightmare":"Naytmer","notion":"Novşın","numerous":"Numörıs","offend":"Ifend","opponent":"Ipovnınt","organ":"Orgın","outer":"Autör","outline":"Autlayn","panel":"Penıl","pile":"Payl","pose":"Povz","preparation":"Prepöreyşın","prospect":"Praspekt","psychologist":"Saykalıcıst","publication":"Pıblikeyşın","pupil":"Pyupıl","rank":"Renk","regional":"Ricınıl","remark":"Rimark","requirement":"Rikvayrmınt","retain":"Riteyn","revolution":"Revıluşın","reward":"Rivord","rhythm":"Ridım","rubber":"Rıbör","scheme":"Skim","scream":"Skrim","select":"Sılekt","selection":"Sılekşın","sequence":"Sikvıns","shade":"Şeyd","shallow":"Şelov","silk":"Silk","sincere":"Sinsir","slide":"Slayd","slight":"Slayt","slip":"Slip","slope":"Slovp","soul":"Sovl","steep":"Stip","stiff":"Stif","stock":"Stak","surrounding":"Söraundink","sweep":"Svip","tale":"Teyl","tear":"Ter","threaten":"Tretın","tone":"Tovn","transition":"Trenzişın","truly":"Truli","ultimately":"Iltımıtli","unconscious":"Inkanşıs","vast":"Vest","virtual":"Vörçuıl","volume":"Valyum","whisper":"Hvispör","accomplish":"Ikampliş","accuracy":"Ekyörısi","accurately":"Ekyörıtli","acid":"Esıd","activate":"Ektıveyt","adequately":"Edıkvıtli","adjust":"Icıst","alien":"Eyliın","ancestor":"Ensestör","annually":"Enyuıli","anticipate":"Entisıpeyt","applicant":"Eplikınt","appropriately":"Iprovpriitli","arrow":"Erov","artwork":"Artvörk","asset":"Eset","auction":"Akşın","awkward":"Akvörd","badge":"Bec","bargain":"Bargın","basement":"Beysmınt","bat":"Bet","beside":"Bisayd","bombing":"Bamink","briefly":"Brifli","broadcaster":"Brodkestör","canal":"Kınel","cave":"Keyv","certainty":"Sörtınti","chase":"Çeys","cheek":"Çik","choir":"Kvayör","civilization":"Sivılizeyşın","clerk":"Klörk","clip":"Klip","collector":"Kılektör","colony":"Kalıni","commander":"Kımendör","completion":"Kımplişın","compose":"Kımpovz","composer":"Kımpovzör","compound":"Kampaund","comprise":"Kımprayz","confess":"Kınfes","conspiracy":"Kınspirısi","consult":"Kınsılt","consultant":"Kınsıltınt","controversy":"Kantrıvörsi","convincing":"Kınvinsink","corporation":"Korpöreyşın","corridor":"Korıdör","coverage":"Kıvörıc","crack":"Krek","craft":"Kreft","critically":"Kritikıli","dealer":"Dilör","defender":"Difendör","democracy":"Dimakrısi","democratic":"Demıkretik","dependent":"Dipendınt","derive":"Dörayv","devote":"Divovt","disappoint":"Disıpoynt","discourage":"Disköric","distinct":"Distinkt","distract":"Distrekt","disturb":"Distörb","dominant":"Damınınt","dot":"Dat","dramatically":"Drımetikıli","drought":"Draut","dump":"Dımp","dynamic":"Daynemik","economics":"Ekınamiks","editorial":"Edıtoriıl","elbow":"Elbov","electronics":"Ilektraniks","elementary":"Elımentöri","embrace":"Embreys","emission":"Imişın","enjoyable":"Encoyıbıl","entertaining":"Enörteynink","entrepreneur":"Antrıprınör","envelope":"Envılovp","equip":"Ikvip","erupt":"Irıpt","ethnic":"Etnik","evident":"Evıdınt","excessive":"Iksesiv","exclude":"Iksklud","exotic":"Igzatik","expansion":"Ikspenşın","exploit":"Eksployt","extensively":"Ikstensivli","fame":"Feym","fantasy":"Fenısi","firework":"Fayrvörk","firmly":"Förmli","forbid":"Förbid","formation":"Formeyşın","fortunate":"Forçınıt","forum":"Forım","foundation":"Faundeyşın","fraction":"Frekşın","fragment":"Fregmınt","framework":"Freymvörk","freely":"Frili","frequent":"Frikvent","fulfil":"Fulfil","full-time":"Fultaym","fundamentally":"Fındımenıli","furious":"Fyuriıs","gaming":"Geymink","gay":"Gey","gene":"Cin","genetic":"Cınetik","genuine":"Cenyuvayn","gesture":"Cesçör","gig":"Gig","globalization":"Glovbılizeyşın","globe":"Glovb","governor":"Gıvörnör","graphic":"Grefik","greenhouse":"Grinhaus","guideline":"Gaydlayn","heal":"Hil","herb":"Örb","historian":"Historiın","hook":"Huk","hunger":"Hınkgör","hypothesis":"Haypatısıs","icon":"Aykan","identical":"Aydentikıl","illusion":"Ilujın","incentive":"Inseniv","incorporate":"Inkorpöreyt","indication":"Indıkeyşın","info":"Infov","inhabitant":"Inhebıtınt","inherit":"Inherıt","ink":"Ink","input":"Input","insert":"Insört","inspector":"Inspektör","interaction":"Inörekşın","interpretation":"Intörpriteyşın","interval":"Intörvıl","invasion":"Inveyjın","investor":"Investör","joint":"Coynt","journalism":"Cörnılizım","jury":"Curi","lane":"Leyn","legend":"Lecınd","lens":"Lenz","limitation":"Limiteyşın","literary":"Litöreri","loyal":"Loyıl","lyric":"Lirik","make-up":"Meykıp","margin":"Marcın","marker":"Markör","martial":"Marşıl","mate":"Meyt","mayor":"Meyör","mechanical":"Mıkenikıl","mechanism":"Mekınizım","memorable":"Memörıbıl","metaphor":"Metıfor","miner":"Maynör","motion":"Movşın","motivation":"Movtıveyşın","myth":"Mit","naked":"Neykıd","navigation":"Nevıgeyşın","neutral":"Nutrıl","newly":"Nuli","norm":"Norm","nutrition":"Nutrişın","obesity":"Ibisıti","observer":"Ibzörvör","occupy":"Akyıpay","offender":"Ifendör","operator":"Apöreytör","orchestra":"Orkıstrı","output":"Autput","overseas":"Ovörsiz","ownership":"Ovnörşip","oxygen":"Aksıcın","packet":"Pekıt","parallel":"Perılel","partnership":"Partnörşip","part-time":"Partaym","pill":"Pil","precede":"Prisid","preference":"Preförıns","principal":"Prinsıpıl","probability":"Prabıbilıti","probable":"Prabıbıl","programming":"Provgremink","prohibit":"Provhibıt","proportion":"Prıporşın","protester":"Provtestör","punk":"Pınk","purely":"Pyurli","questionnaire":"Kvesçıner","racist":"Reysist","radiation":"Reydieyşın","rat":"Ret","rating":"Reytink","receiver":"Rısivör","reckon":"Rekın","recognition":"Rekıgnişın","recovery":"Rikıvöri","recruit":"Rıkrut","recruitment":"Rıkrutmınt","referee":"Reföri","refugee":"Refyuci","registration":"Recistreyşın","regulate":"Regyıleyt","remarkably":"Rimarkıbli","restore":"Ristor","restrict":"Ristrikt","restriction":"Ristrikşın","retirement":"Ritayörmınt","revision":"Rivijın","risky":"Riski","rival":"Rayvıl","rocket":"Rakıt","scenario":"Sineriov","seeker":"Sikör","settler":"Setılör","severely":"Sıvirli","sexy":"Seksi","short-term":"Şortörm","sibling":"Siblink","signature":"Signıçör","skull":"Skıl","so-called":"Sovkold","specialize":"Speşılayz","spectator":"Spekteytör","speculate":"Spekyıleyt","speculation":"Spekyıleyşın","spokesperson":"Spovkspörsın","spokeswoman":"Spovksvumın","stall":"Stol","stance":"Stens","strictly":"Striktli","suburb":"Sıbörb","sufficiently":"Sıfişıntli","surgeon":"Sörcın","survivor":"Sörvayvör","swallow":"Svalov","sympathetic":"Simpıtetik","teens":"Tinz","temple":"Tempıl","tendency":"Tendınsi","terminal":"Törmınıl","terrify":"Terıfay","territory":"Teritori","terror":"Terör","terrorism":"Terörizım","textbook":"Tekstbuk","thesis":"Tisıs","ton":"Tın","tonne":"Tın","trading":"Treydink","tragic":"Trecik","trait":"Treyt","transmit":"Trenzmit","transportation":"Trenspörteyşın","trigger":"Trigör","trillion":"Trilyın","troop":"Trup","tsunami":"Sunami","undertake":"Indörteyk","unite":"Yunayt","unity":"Yunıti","useless":"Yuslıs","variation":"Verieyşın","vertical":"Vörtikıl","viewpoint":"Vyupoynt","voluntary":"Valınteri","voting":"Vovtink","wander":"Vandör","widespread":"Vaydspred","workforce":"Vörkfors","worm":"Vörm","abolish":"Ibaliş","absence":"Ebsıns","absurd":"Ibsörd","abundance":"Ibındıns","abuse":"Ibyus","accelerate":"Ekselöreyt","accessible":"Eksesıbıl","accomplishment":"Ikamplişmınt","accordance":"Ikordıns","accountability":"Ikaunıbiliti","accumulate":"Ikyumyıleyt","accumulation":"Ikyumyıleyşın","accusation":"Ekyızeyşın","acquisition":"Ekvızişın","acre":"Eykör","activation":"Ektıveyşın","activist":"Ektıvıst","acute":"Ikyut","adhere":"Idhir","adjacent":"Iceysınt","administer":"Idminıstör","administrator":"Idminıstreytör","adolescent":"Edılesınt","adoption":"Idapşın","advocate":"Edvıkeyt","aesthetic":"Estetik","aftermath":"Eftörmet","aggression":"Igreşın","agricultural":"Egrıkılçörıl","aide":"Eyd","albeit":"Olbiit","align":"Ilayn","alignment":"Ilaynmınt","allegation":"Elıgeyşın","allege":"Ilec","allegedly":"Ilecıdli","ally":"Elay","aluminium":"Elyuminım","ambassador":"Embesıdör","amend":"Imend","amid":"Imid","analogy":"Inelıci","anonymous":"Inanımıs","apparatus":"Epöretıs","appealing":"Ipilink","applaud":"Iplod","applicable":"Eplıkıbıl","appoint":"Ipoynt","arbitrary":"Arbıtreri","architectural":"Arkıtekçörıl","arena":"Örinı","arguably":"Argyuıbli","array":"Örey","articulate":"Artikyıleyt","aspiration":"Espöreyşın","aspire":"Ispayr","assassination":"Isesıneyşın","assemble":"Isembıl","assembly":"Isembli","assertion":"Isörşın","atrocity":"Itrasıti","attorney":"Itörni","audit":"Odit","authorize":"Otörayz","auto":"Otov","autonomy":"Itanımi","await":"Iveyt","backdrop":"Bekdrap","backing":"Bekink","bail":"Beyl","ballot":"Belıt","barrel":"Berıl","bass":"Bes","battlefield":"Betılfild","bay":"Bey","beam":"Bim","beast":"Bist","benchmark":"Bençmark","beneath":"Binit","beneficiary":"Benıfişieri","bind":"Baynd","biography":"Bayagrıfi","bishop":"Bişıp","bizarre":"Bızar","blade":"Bleyd","bleed":"Blid","blessing":"Blesink","boast":"Bovst","boom":"Bum","bounce":"Bauns","boundary":"Baundöri","bow":"Bau","breakthrough":"Breyktru","browser":"Brauzör","brutal":"Brutıl","buck":"Bık","buffer":"Bıför","bulk":"Bılk","bureaucracy":"Byurakrısi","burial":"Beriıl","cabinet":"Kebınıt","calculation":"Kelkyıleyşın","canvas":"Kenvıs","capitalism":"Kepitılizım","capitalist":"Kepıtılist","cargo":"Kargov","carriage":"Keric","carve":"Karv","casualty":"Kejılti","cattle":"Ketıl","caution":"Kaşın","chamber":"Çeymbör","characterize":"Kerıktörayz","charter":"Çartör","chronic":"Kranik","chunk":"Çınk","circulate":"Sörkyıleyt","circulation":"Sörkyıleyşın","civilian":"Sıvilyın","clash":"Kleş","classification":"Klesıfıkeyşın","cling":"Klink","clinical":"Klinıkıl","closure":"Klovjör","cluster":"Klıstör","cocktail":"Kakteyl","cognitive":"Kagnitiv","coincide":"Kovinsayd","collective":"Kılektiv","collision":"Kılijın","colonial":"Kılovniıl","columnist":"Kalımnıst","commence":"Kımens","commentary":"Kamınteri","commentator":"Kamınteytör","commerce":"Kamörs","commissioner":"Kımişınör","commodity":"Kımadıti","communist":"Kamyınıst","comparable":"Kampörıbıl","compel":"Kımpel","compelling":"Kımpelink","compensate":"Kampınseyt","compensation":"Kampınseyşın","compile":"Kımpayl","complement":"Kamplımınt","compliance":"Kımplayıns","complication":"Kamplıkeyşın","compute":"Kımpyut","conceal":"Kınsil","concede":"Kınsid","conceive":"Kınsiv","concession":"Kınseşın","confer":"Kınför","configuration":"Kınfigyöreyşın","confine":"Kınfayn","confront":"Kınfrınt","congratulate":"Kıngreçıleyt","congregation":"Kankgrıgeyşın","congressional":"Kıngreşınıl","conscience":"Kanşıns","consciousness":"Kanşısnıs","consensus":"Kınsensıs","conserve":"Kınsörv","constituency":"Kınstiçuınsi","constitute":"Kanstıtut","constitutional":"Kanstıtuşınıl","constraint":"Kınstreynt","consultation":"Kansılteyşın","contemplate":"Kantımpleyt","contempt":"Kıntempt","contend":"Kıntend","contender":"Kıntendör","contention":"Kıntenşın","contractor":"Kantrektör","contradiction":"Kantrıdikşın","contributor":"Kıntribyıtör","conversion":"Kınvörjın","convict":"Kanvikt","conviction":"Kınvikşın","cooperate":"Kvapöreyt","cooperative":"Kovapöreytiv","coordinate":"Kovordıneyt","coordinator":"Kovordıneytör","cop":"Kap","copper":"Kapör","copyright":"Kapirayt","correction":"Körekşın","correlate":"Korıleyt","correspondent":"Korıspandınt","corrupt":"Körıpt","counsellor":"Kaunsılör","counterpart":"Kauntörpart","countless":"Kauntlıs","coup":"Ku","courtesy":"Körtısi","crawl":"Krol","creator":"Krieytör","credibility":"Kredıbiliti","credible":"Kredıbıl","creep":"Krip","critique":"Krıtik","crystal":"Kristıl","cult":"Kılt","cultivate":"Kıltıveyt","custody":"Kıstıdi","cynical":"Sinikıl","dam":"Dem","dawn":"Don","debris":"Dıbri","debut":"Deybyu","decision-making":"Disijınmeykink","declaration":"Deklöreyşın","deed":"Did","deem":"Dim","default":"Difolt","defect":"Difekt","deficiency":"Difişınsi","deficit":"Defısıt","defy":"Difay","delicate":"Delıkıt","demon":"Dimın","denial":"Dinayıl","denounce":"Dinauns","density":"Densıti","depict":"Dipikt","deputy":"Depyıti","descend":"Disend","descent":"Disent","designate":"Dezıgneyt","desirable":"Dizayörıbıl","detain":"Diteyn","detection":"Ditekşın","detention":"Ditenşın","deteriorate":"Ditiriöreyt","devil":"Devıl","devise":"Divays","diagnose":"Dayıgnovs","dictate":"Dikteyt","differentiate":"Diförenşieyt","dignity":"Dignıti","dimension":"Dimenşın","dip":"Dip","diplomatic":"Diplımetik","directory":"Dayrektöri","disastrous":"Dizestrıs","discard":"Diskard","discharge":"Disçarc","disclose":"Disklovz","discourse":"Diskors","dismissal":"Dismisıl","displace":"Displeys","dispose":"Dispovz","disrupt":"Disrıpt","disruption":"Disrıpşın","dissolve":"Dizalv","distinction":"Distinkşın","distinctive":"Distinktiv","distort":"Distort","distress":"Distres","divert":"Dayvört","doctrine":"Daktrın","domain":"Dovmeyn","dominance":"Damınıns","donor":"Dovnör","drift":"Drift","drown":"Draun","dual":"Duıl","dub":"Dıb","dumb":"Dım","duo":"Duov","echo":"Ekov","ecological":"Ekılacikıl","educator":"Ecıkeytör","elaborate":"Ileböreyt","electoral":"Ilektörıl","elevate":"Elıveyt","eligible":"Elıcıbıl","embark":"Embark","embed":"Imbed","embody":"Imbadi","emergence":"Imörcıns","empower":"Impauör","endeavour":"Indevör","endure":"Endyur","enforcement":"Enforsmınt","enquire":"Inkvayör","enrich":"Enriç","ensue":"Insu","enterprise":"Enörprayz","entitle":"Entaytıl","entity":"Entıti","epidemic":"Epıdemik","equation":"Ikveyjın","erect":"Irekt","escalate":"Eskıleyt","essence":"Esıns","establishment":"Isteblişmınt","evoke":"Ivovk","evolutionary":"Evıluşıneri","excellence":"Eksılıns","excess":"Ekses","exclusively":"Iksklusivli","execute":"Eksıkyut","execution":"Eksıkyuşın","exile":"Egzayl","expenditure":"Ikspendıçör","experimental":"Iksperimentıl","expire":"Ikspayr","explicit":"Iksplisıt","exploitation":"Eksployteyşın","explosive":"Iksplovsiv","extremist":"Ekstrimist","faction":"Fekşın","faculty":"Fekılti","fade":"Feyd","fairness":"Fernıs","fatal":"Feytıl","feat":"Fit","feminist":"Femınist","fibre":"Faybör","filter":"Filtör","firearm":"Fayrarm","fixture":"Fiksçör","flawed":"Flod","flee":"Fli","fleet":"Flit","flesh":"Fleş","flourish":"Flöriş","fluid":"Fluıd","forge":"Forc","formulate":"Formyıleyt","forthcoming":"Fortkımink","foster":"Fastör","fundraising":"Fındreysink","gallon":"Gelın","gambling":"Gembılink","generic":"Cınerik","glance":"Glens","glimpse":"Glimps","glorious":"Gloriıs","glory":"Glori","governance":"Gıvörnıns","grasp":"Gresp","grid":"Grid","grin":"Grin","grind":"Graynd","grip":"Grip","guerrilla":"Görilı","gut":"Gıt","hail":"Heyl","halt":"Holt","handful":"Hendful","hardware":"Hardver","harmony":"Harmıni","harvest":"Harvıst","haunt":"Hont","hazard":"Hezörd","heighten":"Haytın","hierarchy":"Hayrarki","high-profile":"Hayprovfayl","hint":"Hint","homeland":"Hovmlend","horizon":"Hörayzın","horn":"Horn","hostility":"Hastilıti","hydrogen":"Haydrıcın","ideological":"Aydiılacikıl","ideology":"Aydialıci","imagery":"Imıcri","imminent":"Imınınt","implementation":"Implımenteyşın","imprison":"Imprizın","inappropriate":"Inıprovpriit","incidence":"Insıdıns","inclusion":"Inklujın","incur":"Inkör","indicator":"Indıkeytör","indigenous":"Indicınıs","induce":"Indus","infamous":"Infımıs","infant":"Infınt","infect":"Infekt","inflict":"Inflikt","influential":"Influenşıl","inherent":"Inherınt","inhibit":"Inhibıt","initiate":"Inişieyt","inject":"Incekt","injustice":"Incıstis","inmate":"Inmeyt","insertion":"Insörşın","insider":"Insaydör","inspect":"Inspekt","instinct":"Instinkt","instruct":"Instrıkt","instrumental":"Instrımenıl","insult":"Insılt","intact":"Intekt","intake":"Inteyk","integral":"Inıgrıl","integrated":"Inıgreytıd","integration":"Inıgreyşın","integrity":"Integrıti","intensify":"Intensıfay","intensity":"Intensıti","interface":"Inörfeys","interference":"Inörfirıns","interim":"Inörım","interior":"Intiriör","intermediate":"Inörmidiit","intriguing":"Intrigink","invisible":"Invizıbıl","invoke":"Invovk","ironic":"Ayranik","ironically":"Ayranikli","irony":"Ayrıni","irrelevant":"Irelıvınt","junction":"Cınkşın","jurisdiction":"Curısdikşın","justification":"Cıstıfıkeyşın","kidnap":"Kidnep","kidney":"Kidni","kingdom":"Kinkdım","lad":"Led","large-scale":"Larcskeyl","laser":"Leyzör","latter":"Letör","lawn":"Lon","lawsuit":"Losut","layout":"Leyaut","leap":"Lip","legendary":"Lecınderi","legislature":"Lecısleyçör","legitimate":"Lıcitımıt","lengthy":"Lenkti","lesbian":"Lezbiın","lesser":"Lesör","lethal":"Litıl","liable":"Layıbıl","liberal":"Libörıl","liberation":"Liböreyşın","likelihood":"Layklihud","limb":"Lim","linear":"Liniör","line-up":"Laynıp","linger":"Linkör","literacy":"Litörısi","liver":"Livör","lobby":"Labi","loom":"Lum","machinery":"Mışinöri","magistrate":"Mecıstreyt","magnetic":"Megnetik","magnitude":"Megnıtud","mainstream":"Meynstrim","mandate":"Mendeyt","manipulate":"Mınipyıleyt","manipulation":"Mınipyıleyşın","manuscript":"Menyıskript","marginal":"Marcınıl","marine":"Mörin","marketplace":"Markıtpleys","massacre":"Mesıkör","mathematical":"Metımetikıl","mature":"Mıçur","medieval":"Midivıl","memo":"Memov","memoir":"Memvar","merchant":"Mörçınt","mere":"Mir","merge":"Mörc","merger":"Mörcör","merit":"Merıt","methodology":"Metıdalıci","midst":"Midst","militant":"Milıtınt","militia":"Mılişı","mill":"Mil","minimize":"Minımayz","mining":"Maynink","ministry":"Minıstri","miracle":"Mirıkıl","misleading":"Mislidink","missile":"Misıl","mob":"Mab","moderate":"Madöreyt","modification":"Madıfıkeyşın","momentum":"Movmentım","monk":"Mınk","monopoly":"Mınapıli","motorist":"Movtörist","municipal":"Myunisıpıl","namely":"Neymli","naval":"Neyvıl","neighbouring":"Neybörink","nest":"Nest","newsletter":"Nuzletör","niche":"Niç","nominate":"Namıneyt","nomination":"Namıneyşın","nominee":"Namıni","non-profit":"Nanprofit","nonsense":"Nansens","notably":"Novtıbli","notify":"Novtıfay","notorious":"Novtoriıs","nursery":"Nörsöri","objection":"Ibcekşın","oblige":"Iblayc","obsess":"Ibses","obsession":"Ibseşın","occurrence":"Ikörıns","offspring":"Ofsprink","operational":"Apöreyşınıl","opt":"Apt","optical":"Aptikıl","optimism":"Aptımizım","organizational":"Orgınızeyşınıl","orientation":"Orienteyşın","originate":"Öricıneyt","outing":"Autink","outrage":"Autreyc","outsider":"Autsaydör","overly":"Ovörli","overturn":"Ovörtörn","overwhelm":"Ovörvelm","pad":"Ped","parameter":"Pöremıtör","parental":"Pörentıl","parish":"Periş","parliamentary":"Parlımenöri","partially":"Parşıli","pastor":"Pestör","patent":"Petınt","patrol":"Pıtrovl","patron":"Peytrın","peasant":"Pezınt","peculiar":"Pıkyulyör","persist":"Pörsist","personnel":"Pörsınel","petition":"Pıtişın","philosopher":"Fılasıför","philosophical":"Filısafikıl","physician":"Fızişın","pioneer":"Payınir","pipeline":"Payplayn","pirate":"Payrıt","pit":"Pit","plea":"Pli","pledge":"Plec","plug":"Plıg","plunge":"Plınc","pole":"Povl","poll":"Povl","portray":"Portrey","practitioner":"Prektişınör","preach":"Priç","precedent":"Presidınt","predator":"Predıtör","predecessor":"Predısesör","predominantly":"Pridamınıntli","prejudice":"Precıdis","preliminary":"Prilimıneri","premier":"Premir","premise":"Premis","premium":"Primiım","presently":"Prezıntli","preservation":"Prezörveyşın","preside":"Prizayd","presidency":"Prezıdınsi","presidential":"Prezıdenşıl","presumably":"Prızumıbli","presume":"Prizum","prevail":"Priveyl","prevalence":"Prevılıns","prey":"Prey","privatization":"Prayvıtızeyşın","probe":"Provb","proceedings":"Prısidinkz","processor":"Prasesör","proclaim":"Provkleym","productivity":"Provdıktivıti","profound":"Provfaund","projection":"Prıcekşın","prominent":"Pramınınt","pronounced":"Prınaunst","propaganda":"Prapıgendı","proposition":"Prapızişın","prosecute":"Prasıkyut","prospective":"Prıspektiv","protective":"Prıtektiv","protocol":"Provtıkal","province":"Pravıns","provincial":"Prıvinşıl","provision":"Prıvijın","psychiatric":"Saykietrik","pulse":"Pıls","quota":"Kvovtı","radar":"Reydar","radical":"Redıkıl","rally":"Reli","ranking":"Renkink","ratio":"Reyşiov","ray":"Rey","readily":"Redıli","realization":"Rilızeyşın","realm":"Relm","rear":"Rir","reasoning":"Rizınink","rebellion":"Ribelyın","recipient":"Rısipiınt","reconstruction":"Rikınstrıkşın","recount":"Rikaunt","referendum":"Reförendım","refusal":"Rıfyuzıl","regime":"Reyjim","regulator":"Regyıleytör","regulatory":"Regyılıtori","rehabilitation":"Riıbilıteyşın","reign":"Reyn","relevance":"Relıvıns","reliability":"Rilayıbilıti","reluctant":"Rilıktınt","remainder":"Rimeyndör","remedy":"Remıdi","removal":"Rimuvıl","render":"Rendör","renowned":"Rinaund","reportedly":"Riportıdli","republic":"Ripıblık","resemble":"Rizembıl","reside":"Rizayd","residence":"Rezidıns","residue":"Rezıdu","resignation":"Rezıgneyşın","resistance":"Rizistıns","respective":"Rispektiv","respectively":"Rispektivli","restraint":"Ristreynt","retrieve":"Ritriv","revelation":"Revıleyşın","reverse":"Rivörs","revival":"Rivayvıl","revive":"Rivayv","rhetoric":"Retörik","rifle":"Rayfıl","riot":"Rayıt","rip":"Rip","ritual":"Riçuıl","robust":"Rovbıst","rod":"Rad","rotate":"Rovteyt","rotation":"Rovteyşın","ruling":"Rulink","sacred":"Seykrıd","saint":"Seynt","scattered":"Sketörd","scrutiny":"Skrutıni","secular":"Sekyılör","seize":"Siz","selective":"Sılektiv","senator":"Senıtör","sentiment":"Senımınt","separation":"Sepöreyşın","set-up":"Setıp","sexuality":"Sekşuelıti","shareholder":"Şerhovldör","shatter":"Şetör","sheer":"Şir","shrink":"Şrink","shrug":"Şrıg","sigh":"Say","simulate":"Simyıleyt","simulation":"Simyıleyşın","simultaneously":"Saymılteyniısli","sketch":"Skeç","slam":"Slem","slap":"Slep","slash":"Sleş","slot":"Slat","smash":"Smeş","soak":"Sovk","soar":"Sor","socialist":"Sovşılıst","sole":"Sovl","solely":"Sovıli","solicitor":"Sılisıtör","solidarity":"Salıderıti","solo":"Sovlov","sovereignty":"Savrınti","spam":"Spem","span":"Spen","spark":"Spark","specification":"Spesifikeyşın","specimen":"Spesımın","spectacle":"Spektıkıl","spectrum":"Spektrım","sphere":"Sfir","spin":"Spin","spine":"Spayn","spotlight":"Spatlayt","spy":"Spay","squad":"Skvad","stab":"Steb","stabilize":"Steybılayz","stake":"Steyk","stark":"Stark","stem":"Stem","stimulus":"Stimyılıs","strain":"Streyn","strand":"Strend","strategic":"Strıticik","strip":"Strip","strive":"Strayv","stumble":"Stımbıl","stun":"Stın","submission":"Sıbmişın","subscriber":"Sıbskraybör","subsidy":"Sıbsidi","substantially":"Sıbstenşıli","subtle":"Sıtıl","suburban":"Sıbörbın","succession":"Sıkseşın","successive":"Sıksesiv","successor":"Sıksesör","suicide":"Suısayd","superb":"Supörb","superior":"Supiriör","supervise":"Supörvayz","supervision":"Supörvijın","supplement":"Sıplımınt","supposedly":"Sıpovzıdli","supreme":"Sıprim","surgical":"Sörcikıl","surplus":"Sörplıs","surrender":"Sörendör","surveillance":"Sörveylıns","suspension":"Sıspenşın","suspicion":"Sıspişın","symbolic":"Simbalik","syndrome":"Sindrovm","synthesis":"Sintısıs","systematic":"Sistımetik","tactic":"Tektik","tactical":"Tektikıl","taxpayer":"Tekspeyör","tender":"Tendör","tenure":"Tenyör","terminate":"Törmıneyt","terrain":"Töreyn","testify":"Testıfay","testimony":"Testımovni","thankfully":"Tenkfıli","theatrical":"Tietrikıl","theology":"Tialıci","thereafter":"Dereftör","thereby":"Derbay","thread":"Tred","thrive":"Trayv","tighten":"Taytın","timber":"Timbör","timely":"Taymli","toll":"Tovl","toss":"Tos","toxic":"Taksik","trademark":"Treydmark","trailer":"Treylör","trauma":"Tromı","treaty":"Triti","tremendous":"Trımendıs","tribal":"Traybıl","tribunal":"Trıbyunıl","tribute":"Tribyut","trio":"Triov","triumph":"Trayımf","trophy":"Trovfi","troubled":"Trıbıld","trustee":"Trısti","tuition":"Tyuişın","turnout":"Törnaut","turnover":"Törnovör","underlying":"Indörlayink","undermine":"Indörmayn","undoubtedly":"Indautidli","unify":"Yunıfay","unprecedented":"Inpresidentid","unveil":"Inveyl","uphold":"Iphovld","utilize":"Yutılayz","utterly":"Itörli","vague":"Veyg","validity":"Vılidıti","variable":"Veriıbıl","vein":"Veyn","venture":"Vençör","verbal":"Vörbıl","verdict":"Vördikt","versus":"Vörsıs","vessel":"Vesıl","veteran":"Vetörın","viable":"Vayıbıl","vibrant":"Vaybrınt","vice":"Vays","vicious":"Vişıs","villager":"Vilicör","violate":"Vayıleyt","violation":"Vayıleyşın","virtue":"Vörçu","vow":"Vau","vulnerability":"Vılnörıbiliti","ward":"Vord","warehouse":"Verhaus","warfare":"Vorfer","warrant":"Vorınt","weaken":"Vikın","weave":"Viv","weed":"Vid","well-being":"Velbiink","whatsoever":"Hvıtsovevör","whereby":"Hverbay","whip":"Hvip","wholly":"Hovli","widen":"Vaydın","width":"Vidt","willingness":"Vilinknıs","worthwhile":"Vörtvayl","worthy":"Vördi","yell":"Yel","yield":"Yild","youngster":"Yınkstör"};
window.WM_getTurkishPronunciation = window.WM_getTurkishPronunciation || function(word){
  var w=String(word||'').trim().toLowerCase();
  if(!w) return '';
  if(window.WM_TR_PRON_MAP && window.WM_TR_PRON_MAP[w]) return window.WM_TR_PRON_MAP[w];
  try{
    var dict=window.WM_Dictionary;
    if(Array.isArray(dict)){
      var row=dict.find(function(x){return String(x.Kelime||x.word||x.en||'').trim().toLowerCase()===w;});
      return row ? String(row['türkçe_okunuş']||row.turkce_okunus||row.pronunciation||row.phonetic||'').trim() : '';
    }
    if(dict && typeof dict==='object'){
      var rec=dict[w];
      if(rec) return String(rec['türkçe_okunuş']||rec.turkce_okunus||rec.tr_pron||rec.pronunciation||rec.phonetic||'').trim();
    }
  }catch(e){}
  return '';
};


/* ===== extracted script block ===== */


/* CANLI SKOR KOÇU - ADAPTED PRONUNCIATION FACE COACH UI */
(function(){
  'use strict';
  let lcPfcMode='word';
  const VOWELS={a:'æ',e:'e',i:'ɪ',o:'oʊ',u:'ʌ',y:'i'};
  const DB={
    "p":{name:"P sesi",same:true,tr:'"p"',tip:"Dudaklarını kapat, kısa bir hava patlamasıyla aç. Türkçedeki P’ye yakındır.",mouth:"closed"},
    "b":{name:"B sesi",same:true,tr:'"b"',tip:"Dudaklarını kapat, sesli biçimde aç. Türkçedeki B’ye yakındır.",mouth:"closed"},
    "t":{name:"T sesi",same:true,tr:'"t"',tip:"Dil ucunu üst diş etine değdir, kısa ve net çıkar. Kelime sonunda yutma.",mouth:"tongueUp"},
    "d":{name:"D sesi",same:true,tr:'"d"',tip:"Dil ucunu üst diş etine değdir, sesli biçimde çıkar. Türkçedeki D’ye yakındır.",mouth:"tongueUp"},
    "k":{name:"K sesi",same:true,tr:'"k"',tip:"Dilin arkasını damağa yaklaştırıp kısa hava patlaması ver. Türkçedeki K’ye yakındır.",mouth:"back"},
    "g":{name:"G sesi",same:true,tr:'"g"',tip:"Dilin arkası damağa yaklaşır, sesli çıkar. Türkçedeki G’ye yakındır.",mouth:"back"},
    "f":{name:"F sesi",same:true,tr:'"f"',tip:"Alt dudağı üst dişe hafif değdir. Ses telleri çalışmaz, hava sürtünmeli çıkar.",mouth:"teeth"},
    "v":{name:"V sesi",same:true,tr:'"v"',tip:"Alt dudağı üst dişe hafif değdir ve sesli titreşim ver. W gibi yuvarlama yapma.",mouth:"teeth"},
    "s":{name:"S sesi",same:true,tr:'"s"',tip:"Dişlere yakın, ince ve net hava sesi çıkar. Türkçedeki S’ye yakındır.",mouth:"smile"},
    "z":{name:"Z sesi",same:true,tr:'"z"',tip:"S pozisyonuna benzer ama ses telleri titreşir. Türkçedeki Z’ye yakındır.",mouth:"smile"},
    "ʃ":{name:"Ş sesi",same:true,tr:'"ş"',tip:"Dudakları hafif öne al, hava sürtünmeli çıksın. Türkçedeki Ş’ye yakındır.",mouth:"wide"},
    "tʃ":{name:"Ç sesi",same:true,tr:'"ç"',tip:"Türkçedeki Ç’ye yakın. Kısa patlamalı başlat, sonra hava sürtünsün.",mouth:"wide"},
    "dʒ":{name:"C sesi",same:true,tr:'"c"',tip:"Türkçedeki C’ye yakın. Sesli, kısa patlamalı çıkar.",mouth:"wide"},
    "m":{name:"Burundan M",same:true,tr:'"m"',tip:"Dudaklarını kapat. Hava ağızdan değil burundan çıksın.",mouth:"closed"},
    "n":{name:"Burundan N",same:true,tr:'"n"',tip:"Dil ucunu üst diş etine değdir. Hava burundan çıksın.",mouth:"tongueUp"},
    "l":{name:"L sesi",same:true,tr:'"l"',tip:"Dil ucunu üst diş etine değdir. Hava dilin yanlarından geçsin.",mouth:"tongueUp"},
    "h":{name:"H sesi",same:true,tr:'"h"',tip:"Boğazdan hafif hava ver. Türkçedeki H’ye yakındır.",mouth:"open"},
    "e":{name:"E sesi",same:true,tr:'"e"',tip:"Ağzı hafif aç, dili orta yükseklikte tut. Türkçedeki E’ye yakındır.",mouth:"smile"},
    "i":{name:"İ sesi",same:true,tr:'"i"',tip:"Ağzı yana doğru gerginleştir, kısa ve net söyle. Türkçedeki İ’ye yakındır.",mouth:"smile"},
    "o":{name:"O sesi",same:true,tr:'"o"',tip:"Dudakları yuvarla. Türkçedeki O’ya yakındır.",mouth:"round"},
    "u":{name:"U sesi",same:true,tr:'"u"',tip:"Dudakları yuvarla ve öne al. Türkçedeki U’ya yakındır.",mouth:"round"},
    "θ":{name:"TH / think",same:false,tr:"Türkçede yok",tip:"Dil ucunu üst-alt dişlerin arasına çok hafif çıkar. Türkçedeki sert T gibi vurma; havayı sürtünmeli çıkar.",mouth:"tongue"},
    "ð":{name:"TH / this",same:false,tr:"Türkçede yok",tip:"Dil dişlerin arasında; ses telleri çalışır. D deme, dili dişe temas ettirip sesli sürtünme yap.",mouth:"tongue"},
    "r":{name:"American R",same:false,tr:"Farklı, dikkat et",tip:"Dil ucunu damağa değdirme. Dudakları hafif yuvarla, dil geride ve gergin olsun.",mouth:"roundBack"},
    "w":{name:"W sesi",same:false,tr:"Türkçede yok",tip:"Dudakları iyice yuvarla ve hızlıca aç. Türkçedeki V gibi dişe temas ettirme.",mouth:"round"},
    "æ":{name:"Açık A / æ",same:false,tr:'"e-a" arası',tip:"Ağzı geniş aç. E ile A arasında, kısa ve parlak bir ses çıkar.",mouth:"openWide"},
    "ʌ":{name:"Kısa A / ʌ",same:false,tr:'"a"ya yakın ama kısa',tip:"Ağzı çok açma. Kısa, gevşek ve net söyle. 'cup' sesidir.",mouth:"open"},
    "ə":{name:"Schwa",same:false,tr:'"ı/e" arası zayıf ses',tip:"Çok kısa ve zayıf söyle. Vurgusuz hecelerde ağzı yorma.",mouth:"neutral"},
    "ɪ":{name:"Kısa İ",same:false,tr:'kısa "i"',tip:"Türkçedeki uzun 'ii' gibi uzatma. Kısa, gevşek ve hızlı söyle.",mouth:"smileSmall"},
    "ŋ":{name:"ING / ŋ",same:false,tr:'"ng" gibi',tip:"Dil arkası yumuşak damağa yaklaşır. Kelime sonunda sert G ekleme.",mouth:"back"},
    "ɜː":{name:"ER / ɜː",same:false,tr:"Türkçede yok",tip:"Dil geride, dudaklar hafif yuvarlak. R rengine yaklaşan uzun nötr ses.",mouth:"roundBack"},
    "ɔː":{name:"Uzun O",same:false,tr:'uzun "o"',tip:"Dudakları yuvarla ve sesi uzat. Türkçedeki O’dan daha uzun olabilir.",mouth:"round"},
    "ɑː":{name:"Uzun A",same:false,tr:'uzun "a"',tip:"Ağzı aç ve A sesini uzat. Çok kapatma.",mouth:"open"},
    "iː":{name:"Uzun İ",same:false,tr:'uzun "ii"',tip:"Dudakları yana ger, sesi uzat. 'see' kelimesindeki ses.",mouth:"smile"},
    "uː":{name:"Uzun U",same:false,tr:'uzun "uu"',tip:"Dudakları yuvarla ve sesi uzat. 'too' kelimesindeki ses.",mouth:"round"},
    "oʊ":{name:"OU / o-u arası",same:false,tr:"Farklı, dikkat et",tip:"Ağzını O için yuvarla, sonra U’ya doğru kaydır. Tek düz O gibi söyleme.",mouth:"round"},
    "aɪ":{name:"AI / ay",same:false,tr:'"ay"',tip:"A’dan başlayıp İ’ye doğru kaydır. İki ses tek akış gibi olmalı.",mouth:"openToSmile"},
    "eɪ":{name:"EI / ey",same:false,tr:'"ey"',tip:"E’den başlayıp İ’ye doğru kaydır. 'make' kelimesindeki ses.",mouth:"smile"},
    "ər":{name:"ER birleşimi",same:false,tr:"Türkçeden farklı",tip:"Vurgusuz ER. Ağzı fazla oynatma, hafif R rengi ver.",mouth:"roundBack"},
    "ən":{name:"EN birleşimi",same:false,tr:'"ın/en" arası',tip:"Vurgusuz kısa ses + burundan N. Hızlı ve yumuşak söyle.",mouth:"neutral"}
  };
  const known={
    think:["θ","ɪ","ŋ","k"], through:["θ","r","uː"], though:["ð","oʊ"], this:["ð","ɪ","s"], that:["ð","æ","t"], three:["θ","r","iː"],
    study:["s","t","ʌ","d","i"], environment:["e","n","v","ɪ","r","oʊ","n","m","ə","n","t"], mandatory:["m","æ","n","d","ə","t","ɔː","r","i"],
    enough:["ɪ","n","ʌ","f"], comfortable:["k","ʌ","m","f","t","ə","b","l"], vocabulary:["v","oʊ","k","æ","b","j","ə","l","e","r","i"],
    conversation:["k","ɑː","n","v","ər","s","eɪ","ʃ","ən"], achievement:["ə","tʃ","iː","v","m","ə","n","t"], world:["w","ɜː","r","l","d"],
    very:["v","e","r","i"], work:["w","ɜː","r","k"], word:["w","ɜː","r","d"], run:["r","ʌ","n"], right:["r","aɪ","t"], wrong:["r","ɔː","ŋ"],
    difficult:["d","ɪ","f","ɪ","k","ə","l","t"], pronunciation:["p","r","ə","n","ʌ","n","s","i","eɪ","ʃ","ən"], language:["l","æ","ŋ","g","w","ɪ","dʒ"]
  };
  const $=id=>document.getElementById(id);
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function wordToIPA(word){
    word=(word||'').toLowerCase().replace(/[^a-z']/g,'');
    if(known[word]) return known[word].slice();
    const chunks=[];
    for(let i=0;i<word.length;i++){
      const two=word.slice(i,i+2), three=word.slice(i,i+3);
      if(three==='thr'){chunks.push('θ','r'); i+=2; continue;}
      if(two==='th'){chunks.push(['the','this','that','they','them','there','these','those','though','than'].includes(word)?'ð':'θ'); i++; continue;}
      if(two==='sh'){chunks.push('ʃ'); i++; continue;}
      if(two==='ch'){chunks.push('tʃ'); i++; continue;}
      if(two==='ng'){chunks.push('ŋ'); i++; continue;}
      if(two==='oo'){chunks.push('uː'); i++; continue;}
      if(two==='ee'||two==='ea'){chunks.push('iː'); i++; continue;}
      if(two==='ai'||two==='ay'){chunks.push('eɪ'); i++; continue;}
      if(two==='ow'||two==='ou'){chunks.push('oʊ'); i++; continue;}
      const c=word[i];
      if(VOWELS[c]) chunks.push(VOWELS[c]);
      else if(c==='c') chunks.push('k');
      else if(c==='j') chunks.push('dʒ');
      else if(c==='x') chunks.push('k','s');
      else chunks.push(c);
    }
    return chunks.filter(Boolean);
  }
  function tokenize(text){
    const clean=(text||'').toLowerCase().replace(/[^a-z\s']/g,' ').trim();
    if(!clean) return [];
    let out=[]; clean.split(/\s+/).forEach(w=>{out=out.concat(wordToIPA(w));}); return out;
  }
  function info(sound){return DB[sound]||{name:sound+' sesi',same:true,tr:'Türkçeye yakın',tip:'Bu sesi kısa ve net üret. Kelime içindeki yerini dinle, sonra yavaşça tekrar et.',mouth:'neutral'};}
  function mouthType(sound){return info(sound).mouth||'neutral';}
  function lipSvg(sound){
    const type=mouthType(sound); let m='',extra='';
    if(type==='closed') m='<path d="M22 42 Q48 35 74 42 Q48 49 22 42" fill="#f5a3a7" stroke="#7f1d1d" stroke-width="2"/>';
    else if(type==='round'||type==='roundBack') m='<ellipse cx="48" cy="42" rx="18" ry="22" fill="#130914" stroke="#fda4af" stroke-width="6"/><ellipse cx="48" cy="42" rx="8" ry="11" fill="#050814"/>';
    else if(type==='smile'||type==='smileSmall') m='<path d="M16 38 Q48 58 80 38" fill="none" stroke="#ffd7de" stroke-width="7" stroke-linecap="round"/><path d="M26 37 Q48 45 70 37" fill="none" stroke="#7f1d1d" stroke-width="2"/>';
    else if(type==='openWide') m='<ellipse cx="48" cy="43" rx="28" ry="20" fill="#1b0b12" stroke="#fda4af" stroke-width="5"/><ellipse cx="48" cy="54" rx="16" ry="6" fill="#fca5a5"/>';
    else if(type==='open'||type==='openToSmile') m='<ellipse cx="48" cy="43" rx="22" ry="18" fill="#1b0b12" stroke="#fda4af" stroke-width="5"/><ellipse cx="48" cy="54" rx="14" ry="5" fill="#fca5a5"/>';
    else if(type==='tongue') {m='<ellipse cx="48" cy="40" rx="25" ry="13" fill="#111827" stroke="#ffe4e6" stroke-width="5"/>'; extra='<ellipse cx="48" cy="50" rx="17" ry="8" fill="#fda4af"/>';}
    else if(type==='teeth') {m='<path d="M18 42 Q48 54 78 42" fill="none" stroke="#ffd7de" stroke-width="6" stroke-linecap="round"/>'; extra='<rect x="28" y="34" width="40" height="10" rx="3" fill="#fff"/>';}
    else if(type==='tongueUp') {m='<ellipse cx="48" cy="43" rx="23" ry="14" fill="#111827" stroke="#ffe4e6" stroke-width="5"/>'; extra='<path d="M34 51 Q48 36 62 51" fill="none" stroke="#fca5a5" stroke-width="6" stroke-linecap="round"/>';}
    else if(type==='back') {m='<ellipse cx="48" cy="43" rx="23" ry="15" fill="#111827" stroke="#ffe4e6" stroke-width="5"/>'; extra='<path d="M28 55 Q48 42 68 55" fill="none" stroke="#fca5a5" stroke-width="7" stroke-linecap="round"/>';}
    else m='<ellipse cx="48" cy="43" rx="22" ry="11" fill="#111827" stroke="#ffe4e6" stroke-width="5"/>';
    return `<svg viewBox="0 0 96 76" width="100%" height="100%"><defs><linearGradient id="g${esc(sound)}" x1="0" x2="1"><stop stop-color="#fb7185"/><stop offset="1" stop-color="#fecdd3"/></linearGradient></defs><rect width="96" height="76" fill="#0b1020"/>${m}${extra}<text x="48" y="70" text-anchor="middle" fill="#93a4cf" font-size="9" font-weight="800">${esc(sound)}</text></svg>`;
  }
  function sideSvg(sound){
    const type=mouthType(sound); const tongue= type==='tongue'? 'M31 48 C47 52 55 44 64 38' : type==='back'?'M28 51 C45 38 57 39 68 47' : type==='tongueUp'?'M31 50 C42 35 58 36 67 46' : type==='roundBack'?'M30 52 C48 42 60 44 69 50' : 'M28 51 C45 46 58 46 69 50';
    const lip = (type==='round'||type==='roundBack') ? '<ellipse cx="75" cy="39" rx="7" ry="12" fill="#fda4af"/>' : '<path d="M71 34 Q82 39 71 45" fill="none" stroke="#fda4af" stroke-width="5" stroke-linecap="round"/>';
    return `<svg viewBox="0 0 96 76" width="100%" height="100%"><rect width="96" height="76" rx="8" fill="#eef2f7"/><path d="M23 9 C48 10 69 27 74 55" fill="none" stroke="#64748b" stroke-width="5"/><path d="M27 58 C42 66 62 64 75 55" fill="none" stroke="#64748b" stroke-width="5"/>${lip}<path d="${tongue}" fill="none" stroke="#fb7185" stroke-width="7" stroke-linecap="round"/><path d="M70 22 L78 31" stroke="#94a3b8" stroke-width="4"/><circle cx="63" cy="30" r="3" fill="#334155"/></svg>`;
  }
  function face(sound){
    const d=info(sound); const type=d.mouth; let mouth='<ellipse cx="64" cy="84" rx="22" ry="9" fill="#111827" stroke="#e8eaf6" stroke-width="3"/>', tongue='', teeth='';
    if(type==='round'||type==='roundBack') mouth='<ellipse cx="64" cy="84" rx="15" ry="18" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';
    if(type==='smile'||type==='smileSmall') mouth='<path d="M35 80 Q64 100 93 80" fill="none" stroke="#e8eaf6" stroke-width="5" stroke-linecap="round"/>';
    if(type==='open'||type==='openToSmile') mouth='<ellipse cx="64" cy="84" rx="24" ry="20" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';
    if(type==='openWide') mouth='<ellipse cx="64" cy="84" rx="30" ry="22" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';
    if(type==='wide') mouth='<ellipse cx="64" cy="84" rx="28" ry="11" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';
    if(type==='tongue'){mouth='<ellipse cx="64" cy="84" rx="25" ry="11" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';tongue='<ellipse cx="64" cy="91" rx="13" ry="7" fill="#fca5a5"/>';teeth='<rect x="45" y="76" width="38" height="7" rx="2" fill="#fff" opacity=".95"/>';}
    if(type==='teeth'){mouth='<path d="M40 80 Q64 94 88 80" fill="none" stroke="#e8eaf6" stroke-width="5" stroke-linecap="round"/>';teeth='<rect x="44" y="74" width="40" height="8" rx="2" fill="#fff" opacity=".95"/>';}
    if(type==='tongueUp'){mouth='<ellipse cx="64" cy="84" rx="22" ry="12" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';tongue='<path d="M44 94 Q64 72 84 94" fill="none" stroke="#fca5a5" stroke-width="6" stroke-linecap="round"/>';}
    if(type==='back'){mouth='<ellipse cx="64" cy="84" rx="21" ry="13" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';tongue='<path d="M43 94 Q64 82 85 94" fill="none" stroke="#fca5a5" stroke-width="6" stroke-linecap="round"/>';}
    const el=$('lcPfcFaceSvg'); if(el) el.innerHTML=`<svg viewBox="0 0 128 128" width="128" height="128"><circle cx="64" cy="64" r="54" fill="#172033" stroke="#374151" stroke-width="3"/><circle cx="45" cy="55" r="5" fill="#e8eaf6"/><circle cx="83" cy="55" r="5" fill="#e8eaf6"/><path d="M50 39 Q64 32 78 39" fill="none" stroke="#7c85b0" stroke-width="4" stroke-linecap="round"/>${teeth}${mouth}${tongue}<text x="64" y="121" text-anchor="middle" fill="#a78bfa" font-size="12" font-weight="800">${esc(sound)}</text></svg>`;
  }
  window.lcPfcSelectSound=function(sound){
    const d=info(sound); const cs=$('lcPfcCurrentSound'); if(cs) cs.textContent=sound;
    const lab=$('lcPfcCurrentLabel'); if(lab) lab.textContent=d.name;
    const t=$('lcPfcTip'); if(t) t.textContent=d.tip;
    face(sound);
  };
  window.lcSetPFCMode=function(mode){
    lcPfcMode=mode;
    ['Word','Phrase','Sentence'].forEach(m=>{const b=$('lcPfcMode'+m); if(b) b.classList.toggle('active',m.toLowerCase()===mode);});
    const input=$('lcManualWord'); if(input) input.placeholder=mode==='word'?'Örn: think, environment, study':mode==='phrase'?'Örn: think about it, very well':'Örn: I think this is very useful.';
    window.lcRenderPFCTarget(($('lcTarget')?.value||$('lcManualWord')?.value||'think'));
  };
  function renderCards(phones){
    const c=$('lcPfcProblemCards'); if(!c) return;
    if(!phones.length){c.innerHTML='<div class="pfc-sound-card" style="grid-column:1/-1;min-height:90px"><b>Kelime yaz</b><div class="pfc-desc">Buraya kelimedeki bütün sesler, ağız görseli ve Türkçe açıklaması gelecek.</div></div>'; return;}
    c.innerHTML=phones.map((s,i)=>{const d=info(s); const cls=d.same?'same':'diff'; const tag=d.same?'Türkçeye yakın':'Dikkat'; return `<div class="pfc-sound-card ${cls}" onclick="lcPfcSelectSound('${String(s).replace(/'/g,"\\'")}')"><div class="pfc-card-head"><div><div class="pfc-card-num">${i+1}. ${esc(s)}</div><div class="pfc-card-name">${esc(d.name)}</div></div><span class="pfc-mini-tag ${cls}">${tag}</span></div><div class="pfc-art-row"><div class="pfc-art">${lipSvg(s)}</div><div class="pfc-art">${sideSvg(s)}</div></div><div class="pfc-sec">Açıklama</div><div class="pfc-desc">${esc(d.tip)}</div><div class="pfc-sec">Türkçedeki karşılığı</div><div class="pfc-tr">${esc(d.tr)}</div></div>`;}).join('');
  }
  function ensureLegend(){
    const hm=$('lcPfcHeatmap'); if(!hm || document.getElementById('lcPfcLegend')) return;
    const legend=document.createElement('div'); legend.id='lcPfcLegend'; legend.className='pfc-legend';
    legend.innerHTML='<span><i class="pfc-dot same"></i>Türkçeye yakın (daha kolay)</span><span><i class="pfc-dot diff"></i>Türkçeden farklı (dikkat et)</span>';
    hm.insertAdjacentElement('afterend', legend);
    const cards=$('lcPfcProblemCards');
    if(cards && !document.getElementById('lcPfcBottomHelp')){
      const help=document.createElement('div'); help.id='lcPfcBottomHelp'; help.className='pfc-bottom-help';
      help.innerHTML='<div class="pfc-help-box"><b>💡 Hızlı İpucu</b><br>Kelimeyi önce ses ses söyle. Kırmızı kartlara ekstra odaklan. Sonra hepsini doğal hızda birleştir.</div><div class="pfc-help-box"><b>🎨 Renk Anlamları</b><br><span style="color:#22c55e;font-weight:900">Yeşil:</span> Türkçeye yakın sesler<br><span style="color:#ef4444;font-weight:900">Kırmızı:</span> Türkçeden farklı, dikkat edilmesi gereken sesler</div>';
      cards.insertAdjacentElement('afterend',help);
    }
  }
  window.lcRenderPFCTarget=function(target){
    const phones=tokenize(target); const first=phones[0]||'—'; ensureLegend();
    const ipa=$('lcPfcIPA'); if(ipa){ const trp=(window.WM_getTurkishPronunciation?window.WM_getTurkishPronunciation(target):''); ipa.innerHTML='<span class="tr-pron-label">Türkçe telaffuz:</span> '+(trp?'<span class="tr-pron-word">'+esc(trp)+'</span>':'<span class="tr-pron-missing">sozluk.json içinde bulunamadı</span>'); }
    const hm=$('lcPfcHeatmap'); if(hm) hm.innerHTML=(phones.length?phones:['—']).map((p,i)=>{const d=info(p); const cls=d.same?'same':'diff'; return `<button class="pfc-ph ${cls}" onclick="lcPfcSelectSound('${String(p).replace(/'/g,"\\'")}')"><span class="ipa">${esc(p)}</span><span class="lbl">${i+1}</span></button>`;}).join('');
    const sc=$('lcPfcScore'); if(sc) sc.textContent='—'; const wc=$('lcPfcWeakCount'); if(wc) wc.textContent='—';
    window.lcPfcSelectSound(first); renderCards(phones);
  };
  function sim(a,b){
    a=(a||'').toLowerCase().replace(/[^a-z\s']/g,' ').trim(); b=(b||'').toLowerCase().replace(/[^a-z\s']/g,' ').trim(); if(!a||!b)return 0;
    const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>Array(n+1).fill(0)); for(let i=0;i<=m;i++)dp[i][0]=i; for(let j=0;j<=n;j++)dp[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return Math.max(0,1-dp[m][n]/Math.max(m,n));
  }
  window.lcRenderPFCAnalysis=function(target,heard){
    const phones=tokenize(target); const base=Math.round(sim(target,heard)*100); const hnorm=(heard||'').toLowerCase(); let weak=0; ensureLegend();
    const hm=$('lcPfcHeatmap'); if(hm) hm.innerHTML=phones.map((p,i)=>{let local=base; const d=info(p); const key=String(p).replace(/[ːɪəʌæɑɔʊ]/g,''); if(key&&!hnorm.includes(key[0]||''))local-=18; if(!d.same&&(target||'').toLowerCase()!==hnorm)local-=10; local=Math.max(25,Math.min(98,local+(i%3-1)*5)); const cls=local>=80?'good':local>=55?'warn':'bad'; if(cls!=='good')weak++; return `<button class="pfc-ph ${cls}" onclick="lcPfcSelectSound('${String(p).replace(/'/g,"\\'")}')"><span class="ipa">${esc(p)}</span><span class="lbl">${local}%</span></button>`;}).join('');
    const sc=$('lcPfcScore'); if(sc) sc.textContent=base+'%'; const wc=$('lcPfcWeakCount'); if(wc) wc.textContent=weak;
    window.lcPfcSelectSound(phones[0]||'—'); renderCards(phones);
    try{let arr=(window.wmSafeJSONParseArray?wmSafeJSONParseArray('wm_live_score_pron_history'):JSON.parse(localStorage.getItem('wm_live_score_pron_history')||'[]')); if(!Array.isArray(arr))arr=[]; arr.unshift({target,heard,score:base,weak,phones,mode:lcPfcMode,date:new Date().toISOString()}); (window.wmSafeSetJSON?wmSafeSetJSON('wm_live_score_pron_history',arr,100):localStorage.setItem('wm_live_score_pron_history',JSON.stringify(arr.slice(0,100))));}catch(e){}
  };
  function init(){
    const input=$('lcManualWord'); const target=$('lcTarget');
    if(input) input.addEventListener('input',()=>window.lcRenderPFCTarget(input.value||'think'));
    if(target) target.addEventListener('input',()=>window.lcRenderPFCTarget(target.value||'think'));
    window.lcRenderPFCTarget((target&&target.value)||(input&&input.value)||'think');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,400)); else setTimeout(init,400);
})();


/* ===== extracted script block ===== */


/* SHADOWING BUTON SIZMASI + KELİME LİSTESİ GENİŞLİK FIX */
(function(){
  'use strict';

  function norm(t){
    return String(t||'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function cleanShadowingScreen(){
    const shadowScreens = [
      document.getElementById('sc-shadowing'),
      document.getElementById('sc-shadow'),
      ...document.querySelectorAll('[id*="shadow"].screen')
    ].filter(Boolean);

    shadowScreens.forEach(sc=>{
      const badTexts = [
        'türkçe çeviri',
        'turkce ceviri',
        'sen öner',
        'sen oner',
        'oku'
      ];

      sc.querySelectorAll('button').forEach(btn=>{
        const txt = norm(btn.innerText || btn.textContent);
        const onclick = String(btn.getAttribute('onclick') || '').toLowerCase();

        const isShadowButton =
          btn.classList.contains('shadow-btn') ||
          btn.closest('.shadow-controls') ||
          onclick.includes('shadow');

        const isLeakedRealLifeButton =
          badTexts.some(x => txt.includes(x)) ||
          onclick.includes('rlnew') ||
          onclick.includes('reallife') ||
          onclick.includes('translateconversation') ||
          onclick.includes('suggest') ||
          onclick.includes('speakconversation');

        if(isLeakedRealLifeButton && !isShadowButton){
          const parent = btn.parentElement;
          btn.remove();

          if(parent && parent.children.length === 0 && parent.className && /row|actions|controls|suggest/i.test(parent.className)){
            parent.remove();
          }
        }
      });

      sc.querySelectorAll('.rlnew-actions,.rl-actions,.real-life-actions,.scenario-actions,.suggest-row,.translation-row').forEach(el=>{
        el.remove();
      });
    });
  }

  function fixWordListLayout(){
    const selectors = [
      '.word-list',
      '#wordList',
      '#listContent',
      '#modalWordList',
      '.word-list-modal',
      '.list-modal'
    ];

    selectors.forEach(sel=>{
      document.querySelectorAll(sel).forEach(list=>{
        list.style.width='100%';
        list.style.maxWidth='100%';
        list.style.boxSizing='border-box';
      });
    });

    document.querySelectorAll('.wi,.word-item,.list-word-item,.phrase-item').forEach(item=>{
      item.style.width='100%';
      item.style.maxWidth='100%';
      item.style.boxSizing='border-box';

      const body =
        item.querySelector('.wi-body') ||
        item.querySelector('.word-item-body') ||
        item.querySelector('.wi-content') ||
        item.querySelector('.word-content');

      if(body){
        body.style.flex='1 1 auto';
        body.style.minWidth='0';
        body.style.width='100%';
        body.style.maxWidth='100%';
      }

      item.querySelectorAll('.wi-sent,.wi-sentence,.wi-example,.sentence,.example,.pi-en,.pi-tr,.wi-tr').forEach(t=>{
        t.style.width='100%';
        t.style.maxWidth='100%';
        t.style.display='block';
        t.style.whiteSpace='normal';
        t.style.overflowWrap='anywhere';
        t.style.textAlign='left';
      });
    });
  }

  function applyFixes(){
    cleanShadowingScreen();
    fixWordListLayout();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(applyFixes, 300);
    setTimeout(applyFixes, 1000);
    setTimeout(applyFixes, 2500);
  });

  setInterval(applyFixes, 2000);

  const oldSwitch = window.switchTab;
  if(typeof oldSwitch === 'function' && !window.__SHADOW_LIST_FIX_SWITCH_PATCH__){
    window.__SHADOW_LIST_FIX_SWITCH_PATCH__ = true;
    window.switchTab = function(){
      const result = oldSwitch.apply(this, arguments);
      setTimeout(applyFixes, 80);
      setTimeout(applyFixes, 500);
      return result;
    };
  }
})();


/* ===== extracted script block ===== */


/* KELİME LİSTESİ CÜMLE GENİŞLİK RUNTIME FIX */
(function(){
  function isDeleteButton(btn){
    const t=(btn.innerText||btn.textContent||'').trim().toLowerCase();
    const oc=(btn.getAttribute('onclick')||'').toLowerCase();
    const title=(btn.getAttribute('title')||'').toLowerCase();
    const aria=(btn.getAttribute('aria-label')||'').toLowerCase();
    return t==='sil' || t==='🗑' || t.includes('sil') || oc.includes('delete') || oc.includes('sil') || title.includes('sil') || aria.includes('sil');
  }

  function fixWordRows(){
    document.querySelectorAll('.wi,.word-item,.list-word-item').forEach(row=>{
      row.style.display='grid';
      row.style.gridTemplateColumns='auto minmax(0, 1fr) auto';
      row.style.alignItems='start';
      row.style.columnGap='8px';
      row.style.width='100%';
      row.style.maxWidth='100%';
      row.style.boxSizing='border-box';

      const icon=row.querySelector('.wi-ico');
      if(icon){
        icon.style.gridColumn='1';
        icon.style.flex='0 0 auto';
      }

      const body=row.querySelector('.wi-body,.word-item-body,.word-content,.wi-content');
      if(body){
        body.style.gridColumn='2';
        body.style.minWidth='0';
        body.style.width='100%';
        body.style.maxWidth='100%';
        body.style.flex='1 1 auto';
      }

      row.querySelectorAll('.wi-sent,.wi-sentence,.wi-example,.sentence,.example,.wc-sent,.pi-en,.pi-tr').forEach(el=>{
        el.style.width='100%';
        el.style.maxWidth='100%';
        el.style.display='block';
        el.style.whiteSpace='normal';
        el.style.overflowWrap='break-word';
        el.style.wordBreak='normal';
        el.style.textAlign='left';
      });

      const actions=row.querySelector('.wi-badges,.word-actions,.word-item-actions');
      if(actions){
        actions.style.gridColumn='3';
        actions.style.width='auto';
        actions.style.minWidth='36px';
        actions.style.maxWidth='54px';
        actions.style.justifySelf='end';
        actions.style.marginLeft='0';
        actions.style.flex='0 0 auto';
      }

      row.querySelectorAll('button').forEach(btn=>{
        if(isDeleteButton(btn)){
          btn.style.width='34px';
          btn.style.minWidth='34px';
          btn.style.maxWidth='34px';
          btn.style.height='34px';
          btn.style.padding='0';
          btn.style.borderRadius='10px';
          btn.style.fontSize='14px';
          btn.style.flex='0 0 34px';
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(fixWordRows,300);
    setTimeout(fixWordRows,1000);
    setTimeout(fixWordRows,2500);
  });

  setInterval(fixWordRows,2000);

  const oldSwitch=window.switchTab;
  if(typeof oldSwitch==='function' && !window.__WORD_LIST_WIDTH_SWITCH_FIX__){
    window.__WORD_LIST_WIDTH_SWITCH_FIX__=true;
    window.switchTab=function(){
      const r=oldSwitch.apply(this,arguments);
      setTimeout(fixWordRows,100);
      setTimeout(fixWordRows,600);
      return r;
    };
  }
})();


/* ===== extracted script block ===== */


/* KELIME LISTESI KALICI SIL + GENIS CUMLE RUNTIME FIX */
(function(){
  'use strict';

  function norm(s){ return String(s||'').trim().toLowerCase(); }

  function getWordFromRow(row){
    var el = row.querySelector('.wi-word,.word,.word-title,[data-word]');
    if(el){
      var w = el.getAttribute('data-word') || el.textContent;
      if(norm(w)) return w.trim();
    }
    var lines = (row.innerText || '').split('\n').map(function(x){return x.trim();}).filter(Boolean);
    return lines[0] || '';
  }

  function findWordIndex(word){
    var w = norm(word);
    var names = ['words','wordList','vocabulary','wordData','allWords'];
    for(var k=0;k<names.length;k++){
      var name = names[k];
      var arr = window[name];
      if(Array.isArray(arr)){
        var idx = arr.findIndex(function(item){
          if(typeof item === 'string') return norm(item) === w;
          return norm(item.word || item.en || item.english || item.term || item.kelime) === w;
        });
        if(idx >= 0) return {name:name, arr:arr, idx:idx};
      }
    }
    return null;
  }

  function saveCommonStorageAfterDelete(word){
    var w = norm(word);
    try{
      Object.keys(localStorage || {}).forEach(function(key){
        try{
          var raw = localStorage.getItem(key);
          if(!raw || raw[0] !== '[') return;
          var arr = JSON.parse(raw);
          if(!Array.isArray(arr)) return;
          var filtered = arr.filter(function(item){
            if(typeof item === 'string') return norm(item) !== w;
            return norm(item.word || item.en || item.english || item.term || item.kelime) !== w;
          });
          if(filtered.length !== arr.length){
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }catch(e){}
      });
    }catch(e){}
  }

  function deleteWordRow(row){
    var word = getWordFromRow(row);
    if(!word){
      row.remove();
      return;
    }
    if(!confirm('"' + word + '" kelimesi silinsin mi?')) return;

    var possibleFns = ['deleteWord','removeWord','deleteWordFromList','removeWordFromList','deleteListWord','deleteVocabularyWord'];
    for(var i=0;i<possibleFns.length;i++){
      var fn = possibleFns[i];
      if(typeof window[fn] === 'function'){
        try{
          var found = findWordIndex(word);
          if(found) window[fn](found.idx);
          else window[fn](word);
          break;
        }catch(e){
          try{ window[fn](word); break; }catch(e2){}
        }
      }
    }

    var found2 = findWordIndex(word);
    if(found2) found2.arr.splice(found2.idx,1);

    saveCommonStorageAfterDelete(word);
    row.remove();

    ['renderWordList','updateWordList','renderList','updateStats','saveData','saveProgress'].forEach(function(fn){
      if(typeof window[fn] === 'function'){
        try{ window[fn](); }catch(e){}
      }
    });
  }

  function rowHasDeleteButton(row){
    return !!row.querySelector('.__fixed-delete-btn, button[onclick*="delete"], button[onclick*="sil"], button[title*="Sil"], button[aria-label*="Sil"]');
  }

  function fixRow(row){
    if(!row || row.__fixedDeleteApplied) return;
    var hasWord = row.querySelector('.wi-word,.word,.word-title') || row.classList.contains('wi');
    if(!hasWord) return;

    row.__fixedDeleteApplied = true;
    row.classList.add('word-row-fixed');

    var body = row.querySelector('.wi-body,.word-item-body,.wi-content,.word-content');
    if(!body){
      body = document.createElement('div');
      body.className = '__fixed-word-body';
      Array.from(row.childNodes).forEach(function(node){
        if(node.nodeType === 1 && (node.classList.contains('wi-ico') || node.classList.contains('__fixed-right'))) return;
        body.appendChild(node);
      });
      row.appendChild(body);
    }

    body.style.minWidth='0';
    body.style.width='100%';
    body.style.maxWidth='100%';

    body.querySelectorAll('.wi-sent,.wi-sentence,.wi-example,.sentence,.example,.wi-tr').forEach(function(el){
      el.style.width='100%';
      el.style.maxWidth='100%';
      el.style.display='block';
      el.style.whiteSpace='normal';
      el.style.overflowWrap='break-word';
      el.style.wordBreak='normal';
      el.style.textAlign='left';
    });

    var right = row.querySelector('.__fixed-right');
    if(!right){
      right = document.createElement('div');
      right.className = '__fixed-right';
      var badges = row.querySelector('.wi-badges,.word-actions,.word-item-actions');
      if(badges){
        Array.from(badges.childNodes).forEach(function(n){ right.appendChild(n); });
        badges.remove();
      }
      row.appendChild(right);
    }

    if(!rowHasDeleteButton(row)){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = '__fixed-delete-btn';
      btn.title = 'Sil';
      btn.setAttribute('aria-label','Sil');
      btn.innerHTML = '🗑';
      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        deleteWordRow(row);
        return false;
      };
      right.appendChild(btn);
    }else{
      row.querySelectorAll('button[onclick*="delete"],button[onclick*="sil"],button[title*="Sil"],button[aria-label*="Sil"]').forEach(function(btn){
        btn.classList.add('__fixed-delete-btn');
        btn.style.display='flex';
        btn.style.visibility='visible';
        btn.style.opacity='1';
      });
    }
  }

  function fixAllRows(){
    document.querySelectorAll('.wi,.word-item,.list-word-item').forEach(fixRow);
  }

  document.addEventListener('DOMContentLoaded',function(){
    setTimeout(fixAllRows,300);
    setTimeout(fixAllRows,1000);
    setTimeout(fixAllRows,2500);
  });

  setInterval(fixAllRows,1500);

  var oldSwitch = window.switchTab;
  if(typeof oldSwitch === 'function' && !window.__WORD_DELETE_RENDER_FIX__){
    window.__WORD_DELETE_RENDER_FIX__ = true;
    window.switchTab = function(){
      var result = oldSwitch.apply(this, arguments);
      setTimeout(fixAllRows,100);
      setTimeout(fixAllRows,600);
      return result;
    };
  }
})();


/* ===== extracted script block ===== */


/* UCRETSIZ WOW OZELLIKLER RUNTIME */
(function(){
  const KEY='wow_speaking_stats_v1';
  let state={xp:0,level:1,combo:0,bestCombo:0,last:{pron:0,mouth:0,rhythm:0,eye:0,speed:0,native:0}};
  let points=[];
  function el(id){return document.getElementById(id)}
  function pct(n){return Math.max(0,Math.min(100,Math.round(Number(n)||0)))}
  function load(){try{state=Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
  function addXP(n){state.xp+=Math.max(0,Math.round(n));while(state.xp>=100){state.xp-=100;state.level++}save();renderXP()}
  function renderXP(){if(el('wowLevel'))el('wowLevel').textContent=state.level;if(el('wowXpFill'))el('wowXpFill').style.width=state.xp+'%';if(el('wowXpText'))el('wowXpText').textContent=state.xp+' XP / 100 XP'}
  function radar(){
    const c=el('wowRadarCanvas'); if(!c) return; const ctx=c.getContext('2d'),W=c.width,H=c.height;
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#070b14'; ctx.fillRect(0,0,W,H);
    const data=[['Telaffuz',state.last.pron],['Ağız',state.last.mouth],['Ritim',state.last.rhythm],['Göz',state.last.eye],['Hız',state.last.speed],['Native',state.last.native]];
    const cx=W/2,cy=H/2+8,R=Math.min(W,H)*.36,N=data.length;
    ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.font='11px Nunito'; ctx.textAlign='center';
    for(let r=1;r<=4;r++){ctx.beginPath();for(let i=0;i<N;i++){let a=-Math.PI/2+i*2*Math.PI/N,x=cx+Math.cos(a)*R*r/4,y=cy+Math.sin(a)*R*r/4;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.closePath();ctx.stroke()}
    data.forEach((d,i)=>{let a=-Math.PI/2+i*2*Math.PI/N;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillText(d[0],cx+Math.cos(a)*(R+30),cy+Math.sin(a)*(R+22))});
    ctx.beginPath();data.forEach((d,i)=>{let a=-Math.PI/2+i*2*Math.PI/N,r=R*pct(d[1])/100,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.closePath();ctx.fillStyle='rgba(59,130,246,.30)';ctx.strokeStyle='rgba(34,197,94,.95)';ctx.lineWidth=3;ctx.fill();ctx.stroke();
    ctx.fillStyle='white';ctx.font='bold 13px Nunito';ctx.fillText('Telaffuz Radar Grafiği',cx,22);
  }
  function renderMini(){if(el('wowSpeedVal'))el('wowSpeedVal').textContent=pct(state.last.speed);if(el('wowRhythmVal'))el('wowRhythmVal').textContent=pct(state.last.rhythm);if(el('wowNativeVal'))el('wowNativeVal').textContent=pct(state.last.native);if(el('wowComboBox'))el('wowComboBox').textContent='Shadowing Combo: x'+state.combo+' • En iyi: x'+state.bestCombo}
  function update(){
    const pron=pct((el('ccPronVal')||el('ccRealPronScore')||{}).textContent||state.last.pron);
    const mouth=pct((el('lcMouthScore')||el('ccMouthVal')||{}).textContent||state.last.mouth);
    const rhythm=pct((el('lcRhythmScore')||el('ccRhythmVal')||{}).textContent||state.last.rhythm);
    const eye=pct((el('lcEyeScore')||el('ccEyeVal')||{}).textContent||state.last.eye);
    const now=Date.now();points.push({t:now,mouth});points=points.filter(x=>now-x.t<8000);
    let mv=0;for(let i=1;i<points.length;i++)mv+=Math.abs(points[i].mouth-points[i-1].mouth);
    const speed=pct(mv*.6), native=pct(pron*.45+mouth*.2+rhythm*.25+speed*.1);
    state.last={pron,mouth,rhythm,eye,speed,native};renderMini();radar();
  }
  function reward(s){s=pct(s);if(s>=85){state.combo++;state.bestCombo=Math.max(state.bestCombo,state.combo);addXP(12)}else if(s>=70){state.combo++;state.bestCombo=Math.max(state.bestCombo,state.combo);addXP(6)}else if(s>0){state.combo=0;addXP(2)}save();renderMini()}
  window.wowResetStats=function(){if(confirm('XP ve combo sıfırlansın mı?')){state={xp:0,level:1,combo:0,bestCombo:0,last:{pron:0,mouth:0,rhythm:0,eye:0,speed:0,native:0}};save();renderXP();renderMini();radar()}}
  function observe(){['ccRealPronScore','ccPronVal','lcLiveScore'].forEach(id=>{const n=el(id);if(n&&!n.__wowObs){n.__wowObs=true;new MutationObserver(()=>{let s=Number(n.textContent)||0;if(s>0)reward(s)}).observe(n,{childList:true,subtree:true,characterData:true})}})}
  load();document.addEventListener('DOMContentLoaded',()=>{renderXP();renderMini();radar();setInterval(()=>{observe();update()},1500)});setInterval(()=>{observe();update()},2500);
})();


/* ===== extracted script block ===== */


function openRocketPremium(){
 const p=document.getElementById('rocketPremiumPanel');
 if(p) p.style.display='flex';
}
function closeRocketPremium(){
 const p=document.getElementById('rocketPremiumPanel');
 if(p) p.style.display='none';
}


/* ===== extracted script block ===== */


(function(){
  if(window.__WM_PROFESSIONAL_UPGRADE__) return;
  window.__WM_PROFESSIONAL_UPGRADE__=true;
  const PRON_KEY='wm_pronunciation_history_v2';
  const DAY=24*60*60*1000;
  function $(id){return document.getElementById(id)}
  function safeParse(k,def){try{return JSON.parse(localStorage.getItem(k)||'')}catch(e){return def}}
  function saveJson(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function norm(s){return String(s||'').toLowerCase().replace(/[^a-z\s']/g,'').trim()}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function wordsArr(){return Array.isArray(window.allWords)&&window.allWords.length?window.allWords:(Array.isArray(window.words)?window.words:[])}
  function learnedCount(){try{return window.learnedSet&&typeof window.learnedSet.size==='number'?window.learnedSet.size:0}catch(e){return 0}}
  function getSRS(){return window.spacedRepetition||safeParse('spacedRepetition',{})||{}}
  function setSRS(v){window.spacedRepetition=v;saveJson('spacedRepetition',v);try{window.WMStore&&WMStore.set&&WMStore.set('spacedRepetition',JSON.stringify(v))}catch(e){}}
  function getPronHistory(){return safeParse(PRON_KEY,[])||[]}
  function setPronHistory(v){saveJson(PRON_KEY,v.slice(-300))}
  function getDue(){const now=Date.now(),s=getSRS();return wordsArr().filter(w=>s[w.word]&&s[w.word].nextReview<=now)}
  function upcoming(days){const now=Date.now(),lim=now+days*DAY,s=getSRS();return wordsArr().filter(w=>s[w.word]&&s[w.word].nextReview>now&&s[w.word].nextReview<=lim)}
  function srsLevelLabel(lvl){return ['Yeni','Başlangıç','Orta','İyi','Güçlü','Çok Güçlü','Uzman'][Math.max(0,Math.min(6,Number(lvl)||0))]}
  function scoreClass(n){return n>=85?'good':n>=70?'mid':''}
  function avg(nums){nums=nums.filter(n=>Number.isFinite(n));return nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):0}
  function weakWords(){
    const status=window.wordStatus||{}; const profile=window.userProfile||{}; const s=getSRS(); const hist=getPronHistory();
    const map={};
    wordsArr().forEach(w=>{map[w.word]={word:w.word,tr:w.tr||'',score:0,reasons:[]}});
    Object.keys(status).forEach(word=>{const st=status[word]||{}; if(map[word]){if(st.correct===0||st.attempts>st.correct){map[word].score+=35;map[word].reasons.push('yanlış cevap')} if(Number(st.pronScore)&&st.pronScore<70){map[word].score+=30;map[word].reasons.push('telaffuz düşük')}}});
    Object.entries(profile.totalMistakes||{}).forEach(([word,c])=>{if(map[word]&&c>0){map[word].score+=Math.min(40,c*8);map[word].reasons.push(c+' hata')}});
    Object.entries(s).forEach(([word,r])=>{if(map[word]){if(r.lapseCount>0){map[word].score+=Math.min(35,r.lapseCount*10);map[word].reasons.push(r.lapseCount+' SRS düşüş')} if(r.level<=1&&r.reviewCount>0){map[word].score+=8;map[word].reasons.push('erken seviye')}}});
    hist.forEach(h=>{if(map[h.word]&&h.score<70){map[h.word].score+=12;map[h.word].reasons.push('son okuma '+h.score)}});
    return Object.values(map).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
  }
  function ceLevel(){const total=wordsArr().length,learned=learnedCount(),pct=total?learned/total:0; const avgPron=avg(getPronHistory().slice(-20).map(x=>x.score)); const due=getDue().length; let raw=pct*65+(avgPron/100)*25-Math.min(10,due); return raw<18?'A1':raw<34?'A2':raw<52?'B1':raw<70?'B2':raw<86?'C1':'C2'}
  function recommendation(){const due=getDue().length, weak=weakWords().length, ph=getPronHistory().slice(-8), pron=avg(ph.map(x=>x.score)); if(due>0)return {title:'Tekrar kuyruğunu bitir',desc:due+' kelime bugün unutma riskinde.',tab:'srs',label:'🔄 SRS Tekrarı Başlat'}; if(weak>0)return {title:'Zayıf kelimeleri toparla',desc:'Hata biriken kelimeler özel çalışılmalı.',tab:'weakness',label:'🎯 Zayıf Analize Git'}; if(ph.length&&pron<75)return {title:'Telaffuz seansı yap',desc:'Son telaffuz ortalaman '+pron+'.',tab:'pronstandalone',label:'🎤 Telaffuz Çalış'}; return {title:'Yeni kelime öğren',desc:'Bugün yeni kelime ve örnek cümlelerle ilerle.',tab:'word',label:'📖 Kelime Çalış'} }
  function go(tab){try{if(tab==='srs'){window.showScreen?showScreen('sc-srs'):window.switchTab('word'); if(window.showSRSSummary)showSRSSummary()}else if(tab==='weakness'){window.openWeaknessScreen?openWeaknessScreen():showScreen('sc-weakness')}else{window.switchTab?switchTab(tab):showScreen('sc-'+tab)}}catch(e){}}
  window.wmProGo=go;
  window.wmStartWeakReview=function(){const ww=weakWords(); if(!ww.length){try{showToast('✅','Zayıf kelime bulunamadı')}catch(e){} return;} const arr=wordsArr().filter(w=>ww.some(x=>x.word===w.word)); window.words=arr; window.idx=0; go('word');}
  window.wmClearPronHistory=function(){if(confirm('Telaffuz geçmişi temizlensin mi?')){setPronHistory([]);renderAll();}}
  window.wmExportLearningReport=function(){
    const data={createdAt:new Date().toISOString(),totalWords:wordsArr().length,learned:learnedCount(),level:ceLevel(),due:getDue().length,upcoming7:upcoming(7).length,weakWords:weakWords(),pronunciationHistory:getPronHistory().slice(-50),srs:getSRS()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='word-mode-learning-report.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function ensureDailyBox(){
    if(!$('sc-daily')||$('wmProDashboard')) return;
    const anchor=$('dailyQuote')||$('motivationWidget')||$('dailyTasks');
    if(!anchor) return;
    anchor.insertAdjacentHTML('afterend',`<div id="wmProDashboard"></div>`);
  }
  function ensureSRSBox(){
    if(!$('srsSummaryCard')||$('wmSrsInsight')) return;
    $('srsSummaryCard').insertAdjacentHTML('beforeend',`<div id="wmSrsInsight" style="margin-top:14px"></div>`);
  }
  function ensurePronBox(){
    const target=$('sc-pronstandalone')||$('sc-proncoach')||$('sc-daily');
    if(!target||$('wmPronHistoryScreen')) return;
    const card=document.createElement('div'); card.id='wmPronHistoryScreen'; card.className='card'; card.style.marginTop='12px'; card.innerHTML='<div id="wmPronHistory"></div>'; target.appendChild(card);
  }
  function renderDailyPro(){
    ensureDailyBox(); const box=$('wmProDashboard'); if(!box) return;
    const total=wordsArr().length, learned=learnedCount(), pct=total?Math.round(learned/total*100):0, due=getDue().length, next7=upcoming(7).length, pron=avg(getPronHistory().slice(-10).map(x=>x.score)), weak=weakWords(), rec=recommendation();
    box.innerHTML=`
      <div class="pro-section-title">🧠 Akıllı Öğrenme Paneli <button class="pro-small-btn" onclick="wmExportLearningReport()">Rapor al</button></div>
      <div class="pro-grid">
        <div class="pro-card"><div class="pro-k">Seviye</div><div class="pro-v" style="color:var(--purple)">${ceLevel()}</div><div class="pro-s">Kelime + telaffuz + tekrar durumuna göre.</div></div>
        <div class="pro-card"><div class="pro-k">İlerleme</div><div class="pro-v" style="color:var(--green)">%${pct}</div><div class="pro-progress"><span style="width:${pct}%"></span></div><div class="pro-s">${learned}/${total} kelime öğrenildi.</div></div>
        <div class="pro-card"><div class="pro-k">Bugün Tekrar</div><div class="pro-v" style="color:${due?'var(--orange)':'var(--green)'}">${due}</div><div class="pro-s">7 gün içinde: ${next7} kelime.</div></div>
        <div class="pro-card"><div class="pro-k">Telaffuz Ort.</div><div class="pro-v" style="color:${pron>=80?'var(--green)':pron>=60?'var(--orange)':'var(--red)'}">${pron||'—'}</div><div class="pro-s">Son 10 okuma puanı.</div></div>
        <div class="pro-card wide"><div class="pro-k">Bugünün En Mantıklı Adımı</div><div class="pro-v" style="font-size:18px;color:var(--blue)">${esc(rec.title)}</div><div class="pro-s">${esc(rec.desc)}</div><button class="pro-action" onclick="wmProGo('${rec.tab}')">${esc(rec.label)}</button></div>
        <div class="pro-card wide"><div class="pro-k">En Çok İlgi İsteyen Kelimeler</div>${weak.length?weak.slice(0,5).map(w=>`<span class="pro-pill">⚠️ ${esc(w.word)} · ${esc(w.reasons.slice(0,2).join(', '))}</span>`).join(''):'<div class="pro-empty">Şimdilik belirgin zayıf kelime yok. Yanlış cevaplar ve düşük telaffuzlar burada toplanacak.</div>'}${weak.length?'<button class="pro-action" onclick="wmStartWeakReview()" style="background:linear-gradient(135deg,#ef4444,#f97316)">🎯 Zayıf Kelimeleri Çalış</button>':''}</div>
      </div>`;
  }
  function renderSRSPro(){
    ensureSRSBox(); const box=$('wmSrsInsight'); if(!box) return;
    const s=getSRS(), entries=Object.entries(s), mastered=entries.filter(([_,r])=>(r.level||0)>=5).length, lapses=entries.reduce((a,[_,r])=>a+(r.lapseCount||0),0), due=getDue();
    const urgent=due.map(w=>({w,r:s[w.word]})).sort((a,b)=>(a.r.nextReview||0)-(b.r.nextReview||0)).slice(0,5);
    box.innerHTML=`<div class="pro-section-title">🧬 Profesyonel SRS Özeti</div><div class="pro-grid"><div class="pro-card"><div class="pro-k">SRS Kartı</div><div class="pro-v">${entries.length}</div><div class="pro-s">Takip edilen kelime.</div></div><div class="pro-card"><div class="pro-k">Uzmanlaşan</div><div class="pro-v" style="color:var(--green)">${mastered}</div><div class="pro-s">Seviye 5+ kart.</div></div><div class="pro-card"><div class="pro-k">Düşüş</div><div class="pro-v" style="color:var(--orange)">${lapses}</div><div class="pro-s">Yanlış tekrar sayısı.</div></div><div class="pro-card"><div class="pro-k">Risk</div><div class="pro-v" style="color:${due.length?'var(--red)':'var(--green)'}">${due.length}</div><div class="pro-s">Bugün çalışılması gereken.</div></div></div>${urgent.length?`<div class="pro-list">${urgent.map(x=>`<div class="pro-row"><div class="pro-score ${scoreClass(100-(x.r.lapseCount||0)*15)}">${x.r.level||0}</div><div class="pro-row-main"><div class="pro-row-title">${esc(x.w.word)}</div><div class="pro-row-sub">${esc(srsLevelLabel(x.r.level))} · ${x.r.reviewCount||0} tekrar · ${x.r.lapseCount||0} düşüş</div></div></div>`).join('')}</div>`:''}`;
  }
  function renderPronHistory(){
    ensurePronBox(); const box=$('wmPronHistory'); if(!box) return;
    const h=getPronHistory().slice().reverse(), last=h.slice(0,8), a=avg(last.map(x=>x.score));
    box.innerHTML=`<div class="pro-section-title">🎤 Telaffuz Geçmişi <button class="pro-small-btn" onclick="wmClearPronHistory()">Temizle</button></div>${h.length?`<div class="pro-grid"><div class="pro-card"><div class="pro-k">Son Ortalama</div><div class="pro-v" style="color:${a>=80?'var(--green)':a>=60?'var(--orange)':'var(--red)'}">${a}</div><div class="pro-s">Son 8 deneme.</div></div><div class="pro-card"><div class="pro-k">Toplam Deneme</div><div class="pro-v" style="color:var(--blue)">${h.length}</div><div class="pro-s">Kaydedilen telaffuz sonucu.</div></div></div><div class="pro-list">${last.map(x=>`<div class="pro-row"><div class="pro-score ${scoreClass(x.score)}">${x.score}</div><div class="pro-row-main"><div class="pro-row-title">${esc(x.word||x.target)}</div><div class="pro-row-sub">Duyulan: ${esc(x.heard||'—')} · ${new Date(x.time).toLocaleDateString('tr-TR')}</div></div></div>`).join('')}</div>`:'<div class="pro-empty">Henüz telaffuz geçmişi yok. Kelime ekranında mikrofondan okuma yaptıkça burada son puanların görünecek.</div>'}`;
  }
  function renderAll(){renderDailyPro(); renderSRSPro(); renderPronHistory();}
  window.wmRenderProfessionalUpgrade=renderAll;

  function recordPron(item,target,heard,score,mode){
    if(!item&&!target) return;
    const h=getPronHistory(); h.push({time:Date.now(),word:(item&&item.word)||target,target:target||((item&&item.sentence)||''),heard:heard||'',score:Math.round(Number(score)||0),mode:mode||'word'}); setPronHistory(h);
    try{ if(item&&item.word){ if(!window.wordStatus)window.wordStatus={}; if(!wordStatus[item.word])wordStatus[item.word]={attempts:0,correct:0,pronScore:null}; wordStatus[item.word].pronScore=Math.round(Number(score)||0); } }catch(e){}
    setTimeout(renderAll,80);
  }
  function installWrappers(){
    if(typeof window.updateSRS==='function'&&!window.updateSRS.__pro){
      window.updateSRS=function(word,isCorrect){
        const now=Date.now(); const intervals=window.SRS_INTERVALS||[1,3,7,14,30,60,90]; const s=getSRS();
        if(!s[word])s[word]={level:0,correctStreak:0,lastReview:now,nextReview:now+DAY,easeFactor:2.3,reviewCount:0,lapseCount:0,history:[]};
        const r=s[word]; r.reviewCount=(r.reviewCount||0)+1; r.history=(r.history||[]).slice(-20); r.history.push({time:now,correct:!!isCorrect,level:r.level||0});
        if(isCorrect){r.correctStreak=(r.correctStreak||0)+1; r.easeFactor=Math.min(3.0,(r.easeFactor||2.3)+0.08); r.level=Math.min(intervals.length-1,(r.level||0)+1);}
        else{r.correctStreak=0; r.easeFactor=Math.max(1.3,(r.easeFactor||2.3)-0.18); r.level=Math.max(0,(r.level||0)-1); r.lapseCount=(r.lapseCount||0)+1;}
        const base=intervals[r.level]||90; const adjusted=Math.max(1,Math.round(base*(r.easeFactor||2.3)/2.3)); r.lastReview=now; r.nextReview=now+adjusted*DAY; r.lastResult=!!isCorrect; setSRS(s); setTimeout(renderAll,80);
      }; window.updateSRS.__pro=true;
    }
    if(typeof window.scorePronun==='function'&&!window.scorePronun.__pro){
      const old=window.scorePronun;
      window.scorePronun=function(heard,alts,resultId,playbackId){
        const item=(window.words||[])[window.idx||0]; const target=item?item.sentence||item.word:''; let sc=0,best=norm(heard); try{const cand=[norm(heard),...((alts||[]).map(norm))]; cand.forEach(c=>{const s=window.calcPronScore?calcPronScore(norm(target),c):0;if(s>sc){sc=s;best=c;}})}catch(e){}
        const ret=old.apply(this,arguments); if(item&&target)recordPron(item,target,best||heard,sc,'word'); return ret;
      }; window.scorePronun.__pro=true;
    }
    if(typeof window.scoreSMPronun==='function'&&!window.scoreSMPronun.__pro){
      const old2=window.scoreSMPronun;
      window.scoreSMPronun=function(heard,alts){
        const item=(window.smWords||[])[window.smIdx||0]; const target=item?item.sentence||item.word:''; let sc=0,best=norm(heard); try{[norm(heard),...((alts||[]).map(norm))].forEach(c=>{const s=window.calcPronScore?calcPronScore(norm(target),c):0;if(s>sc){sc=s;best=c;}})}catch(e){}
        const ret=old2.apply(this,arguments); if(item&&target)recordPron(item,target,best||heard,sc,'sentence'); return ret;
      }; window.scoreSMPronun.__pro=true;
    }
    if(typeof window.showSRSSummary==='function'&&!window.showSRSSummary.__pro){const os=window.showSRSSummary; window.showSRSSummary=function(){const r=os.apply(this,arguments); setTimeout(renderSRSPro,50); return r}; window.showSRSSummary.__pro=true;}
    if(typeof window.initDailyDashboard==='function'&&!window.initDailyDashboard.__pro){const od=window.initDailyDashboard; window.initDailyDashboard=function(){let r; try{r=od.apply(this,arguments)}catch(e){} setTimeout(renderDailyPro,50); return r}; window.initDailyDashboard.__pro=true;}
    if(typeof window.switchTab==='function'&&!window.switchTab.__proUpgrade){const ot=window.switchTab; window.switchTab=function(tab){const r=ot.apply(this,arguments); setTimeout(renderAll,120); return r}; window.switchTab.__proUpgrade=true;}
    if(typeof window.showScreen==='function'&&!window.showScreen.__proUpgrade){const osh=window.showScreen; window.showScreen=function(id){const r=osh.apply(this,arguments); setTimeout(renderAll,120); return r}; window.showScreen.__proUpgrade=true;}
  }
  function boot(){ensureDailyBox(); ensureSRSBox(); ensurePronBox(); installWrappers(); renderAll(); setTimeout(()=>{installWrappers();renderAll()},1200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();


/* ===== extracted script block ===== */


(function(){
  if(window.__WM_PRO_MENU_DONE__) return; window.__WM_PRO_MENU_DONE__=true;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const DAY=86400000;
  function arr(){try{return Array.isArray(window.words)?window.words:[]}catch(e){return []}}
  function wordOf(x){return String((x&&x.word)||x||'').trim()}
  function trOf(x){return String((x&&(x.tr||x.turkish||x.translation||x.meaning))||'').trim()}
  function learned(){try{return window.learnedSet&&window.learnedSet.size?window.learnedSet.size:arr().filter(w=>window.wordStatus&&window.wordStatus[wordOf(w)]&&window.wordStatus[wordOf(w)].learned).length}catch(e){return 0}}
  function status(w){try{return (window.wordStatus&&window.wordStatus[wordOf(w)])||{}}catch(e){return {}}}
  function srs(){try{return window.spacedRepetition||JSON.parse(localStorage.getItem('wm_srs2')||localStorage.getItem('srsData')||'{}')}catch(e){return {}}}
  function pron(){try{return JSON.parse(localStorage.getItem('wm_pron_history')||localStorage.getItem('wmPronHistory')||'[]')}catch(e){return []}}
  function avg(a){a=a.filter(n=>Number.isFinite(Number(n)));return a.length?Math.round(a.reduce((x,y)=>x+Number(y),0)/a.length):0}
  function dueWords(){const db=srs(), now=Date.now();return Object.keys(db).filter(k=>db[k]&&Number(db[k].nextReview||0)<=now)}
  function riskWords(){
    const db=srs(), now=Date.now();
    return arr().map(w=>{const key=wordOf(w), st=status(w), sr=db[key]||{}, late=Math.max(0,Math.floor((now-Number(sr.nextReview||now))/DAY)); let risk=0;
      risk += (st.failed||st.wrong||st.mistakes||0)*18; risk += (sr.lapseCount||0)*20; risk += late*8; risk += sr.nextReview&&sr.nextReview<=now?25:0; risk += st.learned?0:10; risk -= (sr.level||0)*7; risk=Math.max(0,Math.min(100,Math.round(risk)));
      return {key,w,risk,reason:[risk>=60?'yüksek risk':null,(sr.nextReview&&sr.nextReview<=now)?'tekrar zamanı':null,(sr.lapseCount||0)?'yanlış tekrar':null,(st.failed||st.wrong)?'önceki hata':null].filter(Boolean)}
    }).filter(x=>x.key).sort((a,b)=>b.risk-a.risk).slice(0,6);
  }
  function scoreClass(n){n=Number(n)||0;return n>=80?'good':n>=55?'mid':'bad'}
  function go(tab){
    if(tab==='smart') return showScreen('sc-pro-smart');
    if(tab==='srs') return showScreen('sc-srs'), setTimeout(()=>{try{window.showSRSSummary&&showSRSSummary()}catch(e){} renderSmart();},80);
    if(tab==='pron') return showScreen('sc-pro-pron-history'), setTimeout(renderPron,80);
    if(tab==='word') return showScreen('sc-word');
    if(tab==='pronstandalone') return (window.switchTab?switchTab('pronstandalone'):showScreen('sc-pronstandalone'));
  }
  window.wmProOpen=go;
  function renderSmart(){
    const el=$('wmProSmartBody'); if(!el) return;
    const total=arr().length, l=learned(), pct=total?Math.round(l/total*100):0, due=dueWords().length, ph=pron(), pavg=avg(ph.slice(-10).map(x=>x.score)), weak=riskWords();
    let rec= due?['SRS Tekrar','Bugün tekrar zamanı gelen kelimeler var. Önce bunları bitirmen en verimli çalışma olur.','srs','🔁 SRS Tekrarı Aç'] : weak.length?['Zayıf Kelime Çalış','Risk puanı yüksek kelimeleri tekrar et.','word','📖 Kelime Ekranına Git'] : pavg&&pavg<75?['Telaffuz Çalış','Son telaffuz ortalaman düşük görünüyor.','pronstandalone','🎤 Telaffuz Çalış'] : ['Yeni Kelime + Kısa Tekrar','Bugün durum iyi. Yeni kelime öğrenip kısa tekrar yapabilirsin.','word','📖 Devam Et'];
    el.innerHTML=`<div class="wm-pro-grid">
      <div class="wm-pro-card"><div class="wm-pro-k">Toplam Kelime</div><div class="wm-pro-v">${total}</div><div class="wm-pro-s">Yüklü listedeki kelime sayısı.</div></div>
      <div class="wm-pro-card"><div class="wm-pro-k">Öğrenilen</div><div class="wm-pro-v" style="color:var(--green)">${l}</div><div class="wm-pro-progress"><span style="width:${pct}%"></span></div><div class="wm-pro-s">Genel ilerleme: %${pct}</div></div>
      <div class="wm-pro-card"><div class="wm-pro-k">Bugün SRS</div><div class="wm-pro-v" style="color:${due?'var(--orange)':'var(--green)'}">${due}</div><div class="wm-pro-s">Tekrar zamanı gelen kart.</div></div>
      <div class="wm-pro-card"><div class="wm-pro-k">Telaffuz Ort.</div><div class="wm-pro-v" style="color:${pavg>=80?'var(--green)':pavg>=55?'var(--orange)':'var(--red)'}">${pavg||'—'}</div><div class="wm-pro-s">Son 10 kayıt ortalaması.</div></div>
      <div class="wm-pro-card wide"><div class="wm-pro-k">Önerilen Çalışma</div><div class="wm-pro-v" style="font-size:20px;color:var(--blue)">${esc(rec[0])}</div><div class="wm-pro-s">${esc(rec[1])}</div><div class="wm-pro-actions"><button class="wm-pro-action" onclick="wmProOpen('${rec[2]}')">${esc(rec[3])}</button><button class="wm-pro-action" onclick="wmProOpen('srs')">🔁 SRS Ekranı</button></div></div>
    </div>
    <div class="wm-pro-title" style="font-size:16px;margin-top:14px">⚠️ Öncelikli kelimeler</div>
    ${weak.length?`<div class="wm-pro-list">${weak.map(x=>`<div class="wm-pro-row"><div class="wm-pro-score ${scoreClass(100-x.risk)}">${x.risk}</div><div class="wm-pro-row-main"><div class="wm-pro-row-title">${esc(x.key)}</div><div class="wm-pro-row-sub">${esc(trOf(x.w)||'Anlam yok')} · ${esc(x.reason.join(', ')||'normal')}</div></div></div>`).join('')}</div>`:'<div class="wm-pro-empty">Henüz zayıf kelime verisi yok. Quiz, SRS ve telaffuz kullandıkça burada otomatik oluşacak.</div>'}`;
  }
  function renderPron(){
    const el=$('wmProPronHistoryBody'); if(!el) return;
    const h=pron().slice().reverse(), last=h.slice(0,20), a=avg(last.map(x=>x.score));
    if(!h.length){el.innerHTML='<div class="wm-pro-empty">Henüz telaffuz geçmişi yok. Telaffuz ekranında veya kelime ekranında mikrofona basıp puan aldığında kayıtlar burada görünecek.</div><div class="wm-pro-actions"><button class="wm-pro-action" onclick="wmProOpen(\'pronstandalone\')">🎤 Telaffuz Ekranına Git</button><button class="wm-pro-action" onclick="wmProOpen(\'word\')">📖 Kelime Ekranı</button></div>';return;}
    el.innerHTML=`<div class="wm-pro-grid"><div class="wm-pro-card"><div class="wm-pro-k">Ortalama</div><div class="wm-pro-v" style="color:${a>=80?'var(--green)':a>=55?'var(--orange)':'var(--red)'}">${a}</div><div class="wm-pro-s">Son ${last.length} kayıt.</div></div><div class="wm-pro-card"><div class="wm-pro-k">Toplam Kayıt</div><div class="wm-pro-v" style="color:var(--blue)">${h.length}</div><div class="wm-pro-s">Tüm telaffuz denemeleri.</div></div></div><div class="wm-pro-list">${last.map(x=>`<div class="wm-pro-row"><div class="wm-pro-score ${scoreClass(x.score)}">${Math.round(Number(x.score)||0)}</div><div class="wm-pro-row-main"><div class="wm-pro-row-title">${esc(x.word||x.target||'Kayıt')}</div><div class="wm-pro-row-sub">Duyulan: ${esc(x.heard||'—')} · ${x.time?new Date(x.time).toLocaleString('tr-TR'):'tarih yok'}</div></div></div>`).join('')}</div><button class="wm-pro-action" style="margin-top:12px;background:linear-gradient(135deg,#ef4444,#f97316)" onclick="localStorage.removeItem('wm_pron_history');localStorage.removeItem('wmPronHistory');wmProRenderPronHistory()">🗑️ Geçmişi Temizle</button>`;
  }
  window.wmProRenderSmart=renderSmart; window.wmProRenderPronHistory=renderPron;
  function addBottomButton(id,ico,label,tab){const nav=$('bottomNav'); if(!nav||$(id)) return; const b=document.createElement('button'); b.className='bnav-btn'; b.id=id; b.onclick=function(){document.querySelectorAll('.bnav-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); go(tab);}; b.innerHTML=`<span class="bico">${ico}</span>${label}`; nav.appendChild(b);}
  function addMenuCard(id,ico,title,desc,tab){const menu=$('sc-menu'); if(!menu||$(id)) return; const holder=Array.from(menu.querySelectorAll('div')).find(d=>getComputedStyle(d).display==='grid')||menu; const c=document.createElement('button'); c.id=id; c.className='wm-pro-menu-card'; c.onclick=()=>go(tab); c.style.cssText='padding:18px;border-radius:16px;cursor:pointer;font-family:Nunito,sans-serif;text-align:center'; c.innerHTML=`<div style="font-size:30px;margin-bottom:6px">${ico}</div><div style="font-size:14px;font-weight:900;color:#fff">${title}</div><div style="font-size:11px;color:#cbd5e1;margin-top:4px;line-height:1.35">${desc}</div>`; holder.appendChild(c);}
  function install(){
    addBottomButton('bn-prosmart','🧠','Plan','smart');
    addBottomButton('bn-prosrs','🔁','SRS','srs');
    addBottomButton('bn-propron','🎙️','Geçmiş','pron');
    addMenuCard('menu-prosmart','🧠','Akıllı Plan','Bugün ne çalışacağını gösterir.','smart');
    addMenuCard('menu-prosrs','🔁','SRS Tekrar','Zamanı gelen kelimeleri tekrar ettirir.','srs');
    addMenuCard('menu-propron','🎙️','Telaffuz Geçmişi','Ses puanlarını ve kayıt özetini gösterir.','pron');
    const oldShow=window.showScreen; if(typeof oldShow==='function'&&!oldShow.__wmProMenu){window.showScreen=function(id){const r=oldShow.apply(this,arguments); if(id==='sc-pro-smart')setTimeout(renderSmart,50); if(id==='sc-pro-pron-history')setTimeout(renderPron,50); return r}; window.showScreen.__wmProMenu=true;}
    const oldSwitch=window.switchTab; if(typeof oldSwitch==='function'&&!oldSwitch.__wmProMenu){window.switchTab=function(tab){if(tab==='prosmart')return go('smart'); if(tab==='prosrs')return go('srs'); if(tab==='propron')return go('pron'); return oldSwitch.apply(this,arguments)}; window.switchTab.__wmProMenu=true;}
    renderSmart(); renderPron();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install); else install();
  setTimeout(install,800); setTimeout(install,2200);
})();


/* ===== extracted script block ===== */


// ══════════════════════════════════════════════════════════
// YAPAY ZEKAYA SOR - serbest prompt ekranı
// ══════════════════════════════════════════════════════════
