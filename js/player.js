(function () {
  /* ---------------- جلسة الطالب ---------------- */
  const raw = sessionStorage.getItem('pls_student');
  if (!raw) {
    window.location.replace('index.html');
    return;
  }
  const student = JSON.parse(raw);

  document.getElementById('viewerName').textContent = student.name || 'طالب';
  document.getElementById('sessionTitleText').textContent =
    (window.LIVE_CONFIG && window.LIVE_CONFIG.sessionTitle) || 'المحاضرة المباشرة';

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('pls_student');
    window.location.href = 'index.html';
  });

  /* ---------------- استخراج ID الفيديو من أي شكل لينك يوتيوب ---------------- */
  function extractVideoId(rawUrl) {
    if (!rawUrl) return null;
    const idPattern = /^[a-zA-Z0-9_-]{11}$/;
    const trimmed = rawUrl.trim();

    if (idPattern.test(trimmed)) return trimmed;

    try {
      const url = new URL(trimmed);
      const host = url.hostname.replace('www.', '').replace('m.', '');

      if (host === 'youtu.be') {
        const seg = url.pathname.split('/').filter(Boolean)[0];
        if (seg && idPattern.test(seg)) return seg;
      }

      if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'live', 'shorts', 'v'].includes(parts[0]) && parts[1]) {
          if (idPattern.test(parts[1])) return parts[1];
        }
        const v = url.searchParams.get('v');
        if (v && idPattern.test(v)) return v;
      }
    } catch (e) {
      const m = trimmed.match(/[a-zA-Z0-9_-]{11}/);
      if (m) return m[0];
    }
    return null;
  }

  const videoId = extractVideoId(window.LIVE_CONFIG && window.LIVE_CONFIG.youtubeUrl);
  const veil = document.getElementById('loadingVeil');
  const posterOverlay = document.getElementById('posterOverlay');
  const bigPlayBtn = document.getElementById('bigPlayBtn');

  if (!videoId) {
    veil.querySelector('p').textContent = 'تعذّر تحديد الفيديو. تأكد من صحة اللينك في إعدادات المنصة.';
    veil.querySelector('.spinner').style.display = 'none';
    return;
  }

  /* ---------------- عناصر الكونترول ---------------- */
  const playPauseBtn = document.getElementById('playPauseBtn');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  const timeReadout = document.getElementById('timeReadout');
  const seekFill = document.getElementById('seekFill');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const playerFrame = document.getElementById('playerFrame');
  const liveBadge = document.querySelector('.live-badge');
  const qualityBtn = document.getElementById('qualityBtn');
  const qualityMenu = document.getElementById('qualityMenu');
  const qualityLabel = document.getElementById('qualityLabel');
  const muteBtn = document.getElementById('muteBtn');
  const iconMuted = document.getElementById('iconMuted');
  const iconUnmuted = document.getElementById('iconUnmuted');
  const unmuteBadge = document.getElementById('unmuteBadge');

  const QUALITY_LABELS = {
    highres: '2K/4K', hd2160: '2160p', hd1440: '1440p',
    hd1080: '1080p', hd720: '720p', large: '480p',
    medium: '360p', small: '240p', tiny: '144p', auto: 'تلقائي'
  };

  let player = null;
  let pollTimer = null;

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('ytHost', {
      videoId: videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
        origin: window.location.origin
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  };

  function onPlayerReady() {
    veil.classList.add('hidden');
    buildQualityMenu();
    pollTimer = setInterval(updateReadout, 500);

    // نحاول تشغيل البث بالصوت مباشرة (بيشتغل غالبًا لأن الدخول جه من ضغطة الطالب على زرار الدخول)
    player.playVideo();

    // لو المتصفح رفض التشغيل بالصوت (أو كتمه بنفسه)، نرجع للتشغيل المكتوم كخطة بديلة
    setTimeout(() => {
      const blocked = player.isMuted() || player.getPlayerState() !== YT.PlayerState.PLAYING;
      if (blocked) {
        player.mute();
        player.playVideo();
        unmuteBadge.style.display = 'flex';
        iconMuted.style.display = '';
        iconUnmuted.style.display = 'none';
      } else {
        iconMuted.style.display = 'none';
        iconUnmuted.style.display = '';
      }
    }, 700);
  }

  function onPlayerError() {
    veil.classList.remove('hidden');
    veil.querySelector('.spinner').style.display = 'none';
    veil.querySelector('p').textContent = 'حدث خطأ في تحميل البث. برجاء المحاولة لاحقًا.';
  }

  function onPlayerStateChange(e) {
    const State = YT.PlayerState;
    if (e.data === State.PLAYING) {
      iconPlay.style.display = 'none';
      iconPause.style.display = '';
      posterOverlay.classList.add('hidden');
    } else if (e.data === State.PAUSED || e.data === State.ENDED) {
      iconPlay.style.display = '';
      iconPause.style.display = 'none';
    }
  }

  function updateReadout() {
    if (!player || !player.getCurrentTime) return;
    const cur = player.getCurrentTime() || 0;
    const dur = player.getDuration() || 0;

    if (dur > 0) {
      liveBadge.style.display = 'none';
      timeReadout.style.display = '';
      timeReadout.textContent = fmt(cur) + ' / ' + fmt(dur);
      seekFill.style.width = Math.min(100, (cur / dur) * 100) + '%';
    } else {
      liveBadge.style.display = 'flex';
      timeReadout.style.display = 'none';
      seekFill.style.width = '100%';
    }
  }

  function fmt(sec) {
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  /* ---------------- تشغيل / إيقاف ---------------- */
  function togglePlay() {
    if (!player) return;
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }
  playPauseBtn.addEventListener('click', togglePlay);
  bigPlayBtn.addEventListener('click', () => {
    if (player) player.playVideo();
  });

  /* ---------------- الصوت ---------------- */
  function unmute() {
    if (!player) return;
    player.unMute();
    player.setVolume(100);
    iconMuted.style.display = 'none';
    iconUnmuted.style.display = '';
    unmuteBadge.style.display = 'none';
  }
  function toggleMute() {
    if (!player) return;
    if (player.isMuted()) {
      unmute();
    } else {
      player.mute();
      iconMuted.style.display = '';
      iconUnmuted.style.display = 'none';
    }
  }
  muteBtn.addEventListener('click', toggleMute);
  unmuteBadge.addEventListener('click', unmute);

  /* ---------------- الجودة ---------------- */
  function buildQualityMenu() {
    let levels = [];
    try { levels = player.getAvailableQualityLevels(); } catch (e) { levels = []; }
    if (!levels.includes('auto')) levels.push('auto');

    qualityMenu.innerHTML = '';
    levels.forEach(level => {
      const btn = document.createElement('button');
      btn.textContent = QUALITY_LABELS[level] || level;
      btn.dataset.level = level;
      if (level === 'auto') btn.classList.add('active');
      btn.addEventListener('click', () => {
        if (level === 'auto') {
          player.setPlaybackQuality('default');
        } else {
          player.setPlaybackQuality(level);
        }
        qualityLabel.textContent = QUALITY_LABELS[level] || level;
        qualityMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        qualityMenu.classList.remove('open');
      });
      qualityMenu.appendChild(btn);
    });
  }

  qualityBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    qualityMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => qualityMenu.classList.remove('open'));

  /* ---------------- ملء الشاشة ---------------- */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      (playerFrame.requestFullscreen || playerFrame.webkitRequestFullscreen || playerFrame.msRequestFullscreen)
        .call(playerFrame);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)
        .call(document);
    }
  }
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  /* ---------------- طبقة الحماية ---------------- */
  // منع الضغط بالزر الأيمن والقص/النسخ على منطقة الفيديو والكونسول (بدون رسائل تنبيه للطالب)
  ['contextmenu'].forEach(evt => {
    playerFrame.addEventListener(evt, e => e.preventDefault());
    document.querySelector('.console-bar').addEventListener(evt, e => e.preventDefault());
  });

  // منع السحب (drag) لأي عنصر داخل منطقة العرض
  playerFrame.addEventListener('dragstart', e => e.preventDefault());

  // تعطيل اختيار/تحديد النص فوق منطقة الفيديو
  playerFrame.style.userSelect = 'none';

  window.addEventListener('beforeunload', () => {
    if (pollTimer) clearInterval(pollTimer);
  });
})();
