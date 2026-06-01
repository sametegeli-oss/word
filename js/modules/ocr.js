/* ════════════════════════════════════════════════════════════════
   WordMode — modül: ocr.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

async function openCameraOCR(){
  showScreen('sc-camera-ocr'); // ✅ Ekranı aç
  const video=document.getElementById('cameraPreview');
  const img=document.getElementById('capturedImage');
  const result=document.getElementById('ocrResult');
  video.style.display='block';
  img.style.display='none';
  result.style.display='none';
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:facingMode,width:{ideal:1920},height:{ideal:1080}}
    });
    video.srcObject=cameraStream;
  }catch(e){
    console.error('Kamera hatası:', e);
    showToast('❌ Kamera hatası','İzin reddedildi');
    
    // Detaylı hata mesajı
    const errorMsg = e.name === 'NotAllowedError' 
      ? '🔒 Kamera izni reddedildi!\n\n1️⃣ Tarayıcı ayarlarından kamera iznini açın\n2️⃣ Sayfayı yenileyin\n3️⃣ Tekrar deneyin\n\n💡 Chrome: Site ayarları → Kamera → İzin ver'
      : e.name === 'NotFoundError'
      ? '📷 Kamera bulunamadı!\n\nCihazınızda kamera var mı kontrol edin.'
      : '❌ Kamera erişim hatası!\n\n' + e.message;
    
    alert(errorMsg);
    showScreen('sc-library'); // Geri dön
  }
}

function closeCameraOCR(){
  if(cameraStream){
    cameraStream.getTracks().forEach(track=>track.stop());
    cameraStream=null;
  }
  showScreen('sc-library');
}

async function switchCamera(){
  facingMode=facingMode==='user'?'environment':'user';
  if(cameraStream)cameraStream.getTracks().forEach(track=>track.stop());
  openCameraOCR();
}

async function capturePhoto(){
  const video=document.getElementById('cameraPreview');
  const canvas=document.getElementById('captureCanvas');
  const ctx=canvas.getContext('2d');
  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;
  ctx.drawImage(video,0,0);
  capturedImageData=canvas.toDataURL('image/jpeg',0.8);
  const img=document.getElementById('capturedImage');
  img.src=capturedImageData;
  img.style.display='block';
  video.style.display='none';
  if(cameraStream){
    cameraStream.getTracks().forEach(track=>track.stop());
    cameraStream=null;
  }
  await performOCR(capturedImageData);
}

async function performOCR(imageData){
  const resultDiv=document.getElementById('ocrResult');
  const textArea=document.getElementById('ocrText');
  resultDiv.style.display='block';
  textArea.value='🔄 Metin tanınıyor...\n\n10-30 saniye sürebilir.';
  try{
    if(typeof Tesseract==='undefined')throw new Error('Tesseract.js yüklenmedi');
    const {data:{text}}=await Tesseract.recognize(imageData,'eng',{
      logger:m=>{
        if(m.status==='recognizing text'){
          textArea.value=`🔄 Metin tanınıyor... ${Math.round(m.progress*100)}%`;
        }
      }
    });
    if(text.trim()){
      textArea.value=text;
      showToast('✅ Metin tanındı',text.split('\n')[0].substring(0,30)+'...');
    }else{
      textArea.value='❌ Metin bulunamadı\n\nFotoğraf daha net çekilebilir.';
    }
  }catch(e){
    textArea.value='❌ OCR hatası: '+e.message+'\n\nSayfayı yenileyip tekrar deneyin.';
  }
}

function resetOCR(){
  document.getElementById('ocrResult').style.display='none';
  openCameraOCR();
}

// ══════════════════════════════════════════════════════════
// ÖZEL PARTNER OLUŞTURMA
// ══════════════════════════════════════════════════════════
