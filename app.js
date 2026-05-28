// app.js — FunFire main application logic

document.addEventListener('DOMContentLoaded', () => {
  /* ── DOM refs ─────────────────────────────────────── */
  const welcomeCard    = document.getElementById('welcome-card');
  const btnFireTester  = document.getElementById('btn-fire-tester');
  const cameraPanel    = document.getElementById('camera-panel');
  const video          = document.getElementById('video');
  const analysisCanvas = document.getElementById('analysis-canvas');
  const statusBadge    = document.getElementById('status-badge');
  const statusText     = document.getElementById('status-text');
  const statusDot      = statusBadge.querySelector('.dot');
  const confidenceFill = document.getElementById('confidence-fill');
  const confPct        = document.getElementById('conf-pct');
  const fireAlertOverlay = document.getElementById('fire-alert-overlay');
  const btnStop        = document.getElementById('btn-stop');
  const btnMute        = document.getElementById('btn-mute');
  const toast          = document.getElementById('toast');
  const sensitivitySlider  = document.getElementById('sensitivity-slider');
  const sensValueDisplay   = document.getElementById('sens-value-display');

  const statStatus     = document.getElementById('stat-status');
  const statConfidence = document.getElementById('stat-confidence');
  const statFrames     = document.getElementById('stat-frames');

  /* ── State ────────────────────────────────────────── */
  let stream       = null;
  let detector     = null;
  let alarm        = null;
  let rafId        = null;
  let frameCount   = 0;
  let muted        = false;
  let fireDetected = false;
  let toastTimer   = null;

  /* ── Particle background ──────────────────────────── */
  initParticles();

  /* ── Button: Start camera ─────────────────────────── */
  btnFireTester.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      video.srcObject = stream;
      await video.play();

      // Switch panels
      welcomeCard.classList.add('hidden');
      cameraPanel.classList.add('visible');

      // Init detector & alarm
      detector = FireDetector(analysisCanvas, video);
      alarm    = createFireAlarm();
      alarm.unlock(); // ← unlock audio during this user gesture so play() works later

      // Apply current slider value
      detector.setSensitivity(parseInt(sensitivitySlider.value));

      // Start detection loop
      startDetection();


    } catch (err) {
      showToast('⚠️ Camera access denied or unavailable', 4000, '#555');
      console.error('Camera error:', err);
    }
  });

  /* ── Detection loop ───────────────────────────────── */
  function startDetection() {
    function loop() {
      if (!stream) return;

      frameCount++;
      statFrames.textContent = frameCount;

      const result = detector.analyzeFrame();
      updateUI(result);

      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  /* ── UI update ────────────────────────────────────── */
  function updateUI(result) {
    const { detected, confidence } = result;

    // Confidence bar
    const pct = Math.min(confidence, 100);
    confidenceFill.style.width = pct + '%';
    confPct.textContent        = pct + '%';
    statConfidence.textContent = pct + '%';

    if (detected && !fireDetected) {
      // Fire just detected
      fireDetected = true;

      statusBadge.classList.add('fire');
      statusText.textContent = '🔥 FIRE DETECTED';
      fireAlertOverlay.classList.add('active');
      document.body.style.setProperty('--glow', 'rgba(255,77,28,0.8)');

      statStatus.textContent = 'FIRE';
      statStatus.className   = 'stat-value fire';

      if (!muted) alarm.start();
      showToast('🔥 Fire Detected! Alarm triggered!', 0);

    } else if (!detected && fireDetected) {
      // Fire cleared
      fireDetected = false;

      statusBadge.classList.remove('fire');
      statusText.textContent = 'MONITORING';
      fireAlertOverlay.classList.remove('active');

      statStatus.textContent = 'SAFE';
      statStatus.className   = 'stat-value safe';

      alarm.stop();
      hideToast();
    }
  }

  /* ── Sensitivity slider ─────────────────────────── */
  sensitivitySlider.addEventListener('input', () => {
    const level = parseInt(sensitivitySlider.value);
    sensValueDisplay.textContent = level + ' / 5';
    if (detector) detector.setSensitivity(level);
  });

  /* ── Mute toggle ─────────────────────────────────── */
  btnMute.addEventListener('click', () => {
    muted = !muted;
    btnMute.textContent = muted ? '🔇 Unmute' : '🔊 Mute';

    if (muted && alarm?.playing) {
      alarm.stop();
    } else if (!muted && fireDetected && alarm) {
      alarm.start();
    }
  });

  /* ── Stop camera ─────────────────────────────────── */
  btnStop.addEventListener('click', stopCamera);

  function stopCamera() {
    cancelAnimationFrame(rafId);
    alarm?.stop();

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }

    video.srcObject = null;
    cameraPanel.classList.remove('visible');
    welcomeCard.classList.remove('hidden');

    // Reset state
    fireDetected = false;
    frameCount   = 0;
    muted        = false;
    btnMute.textContent = '🔊 Mute';
    sensitivitySlider.value      = '3';
    sensValueDisplay.textContent = '3 / 5';
    statusBadge.classList.remove('fire');
    statusText.textContent = 'MONITORING';
    fireAlertOverlay.classList.remove('active');
    statStatus.textContent = '—';
    statStatus.className   = 'stat-value';
    statConfidence.textContent = '0%';
    statFrames.textContent = '0';
    confidenceFill.style.width = '0%';
    hideToast();
  }

  /* ── Toast ───────────────────────────────────────── */
  function showToast(msg, duration = 3000, bg = null) {
    clearTimeout(toastTimer);
    toast.querySelector('span').textContent = msg;
    if (bg) toast.style.background = bg;
    else    toast.style.background = 'linear-gradient(135deg, #ff4d1c, #ff8c00)';
    toast.classList.add('show');
    if (duration > 0) toastTimer = setTimeout(hideToast, duration);
  }

  function hideToast() {
    toast.classList.remove('show');
    clearTimeout(toastTimer);
  }

  /* ── Particle background ──────────────────────────── */
  function initParticles() {
    const canvas = document.getElementById('bg-canvas');
    const ctx    = canvas.getContext('2d');

    let W, H, particles;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function makeParticle() {
      return {
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    Math.random() * 1.5 + 0.5,
        vx:   (Math.random() - 0.5) * 0.3,
        vy:   -Math.random() * 0.4 - 0.1,
        a:    Math.random(),
        hue:  Math.floor(Math.random() * 30 + 15), // orange-ish
      };
    }

    function init() {
      resize();
      particles = Array.from({ length: 80 }, makeParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.a * 0.25})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        p.a -= 0.0015;

        if (p.a <= 0 || p.y < -10) {
          Object.assign(p, makeParticle(), { y: H + 5, a: Math.random() * 0.6 });
        }
      });
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    init();
    draw();
  }
});
