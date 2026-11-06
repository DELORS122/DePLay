(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const round2 = (v) => Math.round(v * 100) / 100;
  const pad2 = (n) => String(n).padStart(2, '0');

  const i18n = window.DePLayI18n;
  let lang = 'ru';
  const t = (key, vars) => (i18n ? i18n.t(lang, key, vars) : key);
  const tp = (key, count, vars) => (i18n ? i18n.plural(lang, key, count, vars) : String(count));
  const unit = (name, count) => (i18n ? i18n.unit(lang, name, count) : name);

  const dom = {
    playerCard: $('playerCard'),
    stage: $('stage'),
    emptyState: $('emptyState'),
    video: $('video'),
    imageViewport: $('imageViewport'),
    imageAmbient: $('imageAmbient'),
    imageEl: $('imageEl'),
    imageName: $('imageName'),
    imageDims: $('imageDims'),
    zoomBadge: $('zoomBadge'),
    loading: $('loading'),
    centerPlay: $('centerPlay'),
    toast: $('toast'),
    videoControls: $('videoControls'),
    timeline: $('timeline'),
    buffered: $('buffered'),
    progress: $('progress'),
    hoverLine: $('hoverLine'),
    timelineThumb: $('timelineThumb'),
    previewCard: $('previewCard'),
    previewCanvas: $('previewCanvas'),
    previewTime: $('previewTime'),
    speedBtn: $('speedBtn'),
    speedLabel: $('speedLabel'),
    speedPopover: $('speedPopover'),
    speedValue: $('speedValue'),
    speedRange: $('speedRange'),
    speedChips: $('speedChips'),
    playBtn: $('playBtn'),
    back2: $('back2'),
    prevFrame: $('prevFrame'),
    nextFrame: $('nextFrame'),
    fwd2: $('fwd2'),
    muteBtn: $('muteBtn'),
    masterVolume: $('masterVolume'),
    currentTime: $('currentTime'),
    duration: $('duration'),
    fpsPill: $('fpsPill'),
    loopBtn: $('loopBtn'),
    pipBtn: $('pipBtn'),
    fullscreenBtn: $('fullscreenBtn'),
    imageControls: $('imageControls'),
    galleryStrip: $('galleryStrip'),
    zoomOut: $('zoomOut'),
    zoomRange: $('zoomRange'),
    zoomIn: $('zoomIn'),
    zoomValue: $('zoomValue'),
    fitBtn: $('fitBtn'),
    actualBtn: $('actualBtn'),
    galleryNav: $('galleryNav'),
    prevImage: $('prevImage'),
    nextImage: $('nextImage'),
    imageCounter: $('imageCounter'),
    mediaStatus: $('mediaStatus'),
    sideEmpty: $('sideEmpty'),
    mediaSummary: $('mediaSummary'),
    mediaIcon: $('mediaIcon'),
    mediaName: $('mediaName'),
    mediaSub: $('mediaSub'),
    mediaFacts: $('mediaFacts'),
    factRes: $('factRes'),
    factDurationLabel: $('factDurationLabel'),
    factDuration: $('factDuration'),
    factSize: $('factSize'),
    factFormat: $('factFormat'),
    factAudio: $('factAudio'),
    tracksBlock: $('tracksBlock'),
    tracksCount: $('tracksCount'),
    tracksFileName: $('tracksFileName'),
    addAudioBtn: $('addAudioBtn'),
    tracksList: $('tracksList'),
    tracksBtn: $('tracksBtn'),
    tracksBadge: $('tracksBadge'),
    toggleAllTracks: $('toggleAllTracks'),
    toggleAllTracksLabel: $('toggleAllTracksLabel'),
    toggleAllTracksIcon: $('toggleAllTracksIcon'),
    tracksSheet: $('tracksSheet'),
    tracksBackdrop: $('tracksBackdrop'),
    tracksClose: $('tracksClose'),
    galleryBlock: $('galleryBlock'),
    galleryCount: $('galleryCount'),
    galleryGrid: $('galleryGrid'),
    settingsMode: $('settingsMode'),
    imageTips: $('imageTips'),
    languageSelect: $('languageSelect'),
    fpsSetting: $('fpsSetting'),
    fpsSelect: $('fpsSelect'),
    loopSetting: $('loopSetting'),
    loopSwitch: $('loopSwitch'),
    addAudioTop: $('addAudioTop'),
    openMediaSheet: $('openMediaSheet'),
    emptyOpen: $('emptyOpen'),
    mediaInput: $('mediaInput'),
    audioInput: $('audioInput'),
    dropVeil: $('dropVeil'),
    settingsSheet: $('settingsSheet'),
    settingsBackdrop: $('settingsBackdrop'),
    settingsClose: $('settingsClose'),
    settingsBtn: $('settingsBtn'),
    settingsBtnImage: $('settingsBtnImage'),
    settingsBtnEmpty: $('settingsBtnEmpty'),
  };

  const state = {
    mode: 'empty',
    videoFile: null,
    videoUrl: null,
    videoReady: false,
    originalEnabled: true,
    audioTracks: [],
    embeddedTracks: [],
    embeddedAnalyzing: false,
    embeddedChecked: false,
    analysisToken: 0,
    audioSeq: 0,
    masterVolume: 0.9,
    lastVolume: 0.9,
    muted: false,
    rate: 1,
    loop: false,
    imageItems: [],
    imageIndex: 0,
    imageScale: 1,
    imageX: 0,
    imageY: 0,
    imageMoved: false,
    pointers: new Map(),
    pan: null,
    pinch: null,
    scrubbing: false,
    previewSeeking: false,
    previewPending: null,
    previewToken: 0,
    fpsOverride: 'auto',
    detectedFps: null,
    fpsSamples: [],
    fpsLastMedia: null,
    fpsProbeRunning: false,
    fpsProbeHandle: null,
    idleTimer: null,
    toastTimer: null,
    frameToastTimer: null,
    tickHandle: null,
    lastAudioSync: 0,
    lastNonZeroVolume: 0.9,
    settingsOpen: false,
    settingsTrigger: null,
    tracksOpen: false,
    tracksTrigger: null,
    chromeHover: false,
  };

  const previewVideo = document.createElement('video');
  previewVideo.muted = true;
  previewVideo.playsInline = true;
  previewVideo.preload = 'auto';
  previewVideo.setAttribute('aria-hidden', 'true');
  previewVideo.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
  document.body.append(previewVideo);

  const previewCtx = dom.previewCanvas.getContext('2d');
  let videoClickTimer = null;

  // ── Utilities ──────────────────────────────────────────────
  function fmtTime(value, forceHours = false) {
    let sec = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0 || forceHours) return `${h}:${pad2(m)}:${pad2(s)}`;
    return `${m}:${pad2(s)}`;
  }

  function fmtTimePrecise(value) {
    const sec = Number.isFinite(value) && value > 0 ? value : 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.round((sec - Math.floor(sec)) * 1000);
    const tail = `${pad2(s)}.${String(ms).padStart(3, '0')}`;
    return h > 0 ? `${h}:${pad2(m)}:${tail}` : `${m}:${tail}`;
  }

  function fmtRate(rate) {
    return `${Number(rate.toFixed(2))}×`;
  }

  function fmtFps(fps) {
    if (!Number.isFinite(fps)) return '30';
    return Math.abs(fps - Math.round(fps)) < 0.01 ? String(Math.round(fps)) : String(Number(fps.toFixed(2)));
  }

  function fmtBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    const units = lang === 'ru' ? ['Б', 'КБ', 'МБ', 'ГБ'] : ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
    return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
  }

  function plural(n, forms) {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  }

  function extOf(name) {
    const match = /\.([^.]+)$/.exec(name || '');
    return match ? match[1].toUpperCase() : '';
  }

  const isVideoFile = (file) => /^video\//.test(file.type) || /\.(mp4|webm|mov|m4v|ogv|mkv|avi)$/i.test(file.name);
  const isImageFile = (file) => /^image\//.test(file.type) || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(file.name);
  const isAudioFile = (file) => /^audio\//.test(file.type) || /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus)$/i.test(file.name);

  function paintRange(input, percent) {
    if (input) input.style.setProperty('--fill', `${clamp(percent, 0, 100)}%`);
  }

  function toast(message, duration = 2400) {
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => dom.toast.classList.remove('show'), duration);
  }

  function setLoading(visible, text = null) {
    dom.loading.hidden = !visible;
    const label = dom.loading.querySelector('.loading-text');
    if (label) label.textContent = text || t('loading.default');
  }

  function iconMarkup(id) {
    return `<svg class="ico"><use href="#${id}"></use></svg>`;
  }

  // ── Audio metadata helpers ─────────────────────────────────
  const LANG_NAMES = {
    rus: 'Русский',
    eng: 'English',
    deu: 'Deutsch',
    ger: 'Deutsch',
    fra: 'Français',
    fre: 'Français',
    spa: 'Español',
    ita: 'Italiano',
    por: 'Português',
    ukr: 'Українська',
    pol: 'Polski',
    tur: 'Türkçe',
    ara: 'العربية',
    heb: 'עברית',
    jpn: '日本語',
    zho: '中文',
    chi: '中文',
    kor: '한국어',
    hin: 'हिन्दी',
    nld: 'Nederlands',
    dut: 'Nederlands',
    swe: 'Svenska',
    nor: 'Norsk',
    dan: 'Dansk',
    fin: 'Suomi',
    ces: 'Čeština',
    cze: 'Čeština',
    ell: 'Ελληνικά',
    gre: 'Ελληνικά',
    hun: 'Magyar',
    ron: 'Română',
    rum: 'Română',
    und: '',
  };

  const ADTS_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

  const allAudioTracks = () => [...state.embeddedTracks, ...state.audioTracks];

  function codecInfo(codec) {
    const value = String(codec || '').toLowerCase();
    if (/^mp4a\.40\.(2|5|29)/.test(value) || /^aac/.test(value)) {
      return {
        format: 'aac',
        mime: 'audio/aac',
        supported: true,
        label: /\.40\.(5|29)/.test(value) ? 'HE-AAC' : 'AAC-LC',
      };
    }
    if (/^mp4a\.6[9b]/.test(value) || /^mp3/.test(value)) {
      return { format: 'mp3', mime: 'audio/mpeg', supported: true, label: 'MP3' };
    }
    if (/^ac-3/.test(value)) {
      return {
        format: 'raw',
        mime: 'audio/ac3',
        supported: false,
        label: 'AC-3',
        reason: t('track.codecReason.ac3'),
      };
    }
    if (/^ec-3/.test(value)) {
      return {
        format: 'raw',
        mime: 'audio/eac3',
        supported: false,
        label: 'E-AC-3',
        reason: t('track.codecReason.eac3'),
      };
    }
    if (/^opus/.test(value)) {
      return {
        format: 'raw',
        mime: 'audio/opus',
        supported: false,
        label: 'Opus',
        reason: t('track.codecReason.opus'),
      };
    }
    if (/^flac/.test(value)) {
      return {
        format: 'raw',
        mime: 'audio/flac',
        supported: false,
        label: 'FLAC',
        reason: t('track.codecReason.flac'),
      };
    }
    return {
      format: 'raw',
      mime: 'audio/mpeg',
      supported: false,
      label: value ? value.toUpperCase() : 'AUDIO',
      reason: t('track.codecReason.unsupported'),
    };
  }

  function languageTitle(track, index) {
    const customName = String(track.customName || '').trim();
    const genericName = /^(sound|video|subtitle|metadata|media)?\s*handler$/i.test(customName)
      || /handler$/i.test(customName)
      || customName.toLowerCase() === 'soundhandler';
    if (customName && !genericName) return customName;

    const name = String(track.name || '').trim();
    const genericHandler = /^(sound|video|subtitle|metadata|media)?\s*handler$/i.test(name)
      || /handler$/i.test(name)
      || name.toLowerCase() === 'soundhandler';
    if (name && !genericHandler) return name;
    const code = String(track.language || '').toLowerCase();
    if (code && code !== 'und' && LANG_NAMES[code]) return t('track.title.language', { language: LANG_NAMES[code] });
    return t('track.title.default', { n: index + 1 });
  }

  function channelText(channels) {
    if (channels === 1) return t('channel.mono');
    if (channels === 2) return t('channel.stereo');
    if (Number.isFinite(channels) && channels > 2) return t('channel.multi', { count: channels });
    return t('channel.audio');
  }

  function rateText(rate) {
    if (!Number.isFinite(rate) || rate <= 0) return '';
    const khz = rate / 1000;
    return t('rate.khz', { value: Number.isInteger(khz) ? khz : khz.toFixed(1) });
  }

  function embeddedMetaText(track) {
    const parts = [];
    const code = String(track.language || '').toLowerCase();
    if (code && code !== 'und') parts.push(code.toUpperCase());
    parts.push(channelText(track.channels));
    if (track.sampleRate) parts.push(rateText(track.sampleRate));
    if (track.codecLabel) parts.push(track.codecLabel);
    return parts.filter(Boolean).join(' · ');
  }

  function embeddedStatus(track) {
    if (!track.supported) return track.reason || t('track.codecUnsupported');
    if (track.loading) return t('track.extracting');
    if (track.status === 'error') return track.statusMessage || t('track.extractError');
    return '';
  }

  // ── Sidebar ────────────────────────────────────────────────
  function syncSidebar() {
    const mode = state.mode;
    const status = mode === 'empty' ? t('status.idle') : t('status.onDevice');
    dom.mediaStatus.innerHTML = `<i></i> ${status}`;
    dom.mediaStatus.classList.toggle('live', mode !== 'empty');
    dom.settingsMode.textContent = mode === 'video' ? t('mode.video') : mode === 'image' ? t('mode.image') : '—';
    dom.settingsMode.hidden = mode === 'empty';
    dom.imageTips.hidden = mode !== 'image';
    dom.fpsSetting.hidden = mode !== 'video';
    dom.loopSetting.hidden = mode !== 'video';
    dom.sideEmpty.hidden = mode !== 'empty';
    dom.mediaSummary.hidden = mode === 'empty';
    dom.mediaFacts.hidden = mode === 'empty';
    dom.tracksBlock.hidden = mode !== 'video';
    dom.galleryBlock.hidden = mode !== 'image';
    dom.tracksBtn.hidden = mode !== 'video';
    dom.tracksBtn.disabled = mode !== 'video';
    dom.addAudioTop.disabled = mode !== 'video';
    dom.addAudioBtn.disabled = mode !== 'video';
    dom.fpsSelect.disabled = mode !== 'video';
    dom.loopSwitch.disabled = mode !== 'video';
    if (mode !== 'video' && state.tracksOpen) closeTracks(false);
  }

  function setFacts(res, duration, size, format) {
    dom.factRes.textContent = res || '—';
    dom.factDuration.textContent = duration || '—';
    dom.factSize.textContent = size || '—';
    dom.factFormat.textContent = format || '—';
  }

  function updateVideoInfo() {
    const file = state.videoFile;
    if (!file) return;
    const v = dom.video;
    const hasMeta = state.videoReady && v.videoWidth > 0;
    const res = hasMeta ? `${v.videoWidth} × ${v.videoHeight}` : '—';
    const count = state.embeddedTracks.length;
    const countLabel = count ? `${count} ${unit('track', count)}` : '';
    dom.factDurationLabel.textContent = t('facts.duration');
    dom.mediaIcon.innerHTML = iconMarkup('i-film');
    dom.mediaName.textContent = file.name;
    dom.mediaName.title = file.name;
    dom.mediaSub.textContent = `${res === '—' ? t('media.video') : res} · ${fmtBytes(file.size)}${countLabel ? ` · ${countLabel}` : ''}`;
    dom.tracksFileName.textContent = file.name;
    dom.tracksFileName.title = file.name;
    setFacts(res, Number.isFinite(v.duration) && v.duration > 0 ? fmtTime(v.duration) : '—', fmtBytes(file.size), extOf(file.name) || t('media.video'));
    dom.factAudio.textContent = state.embeddedAnalyzing
      ? t('media.analysis')
      : count
        ? countLabel
        : state.embeddedChecked
          ? t('media.standard')
          : '—';
  }

  function updateImageInfo() {
    const item = state.imageItems[state.imageIndex];
    if (!item) return;
    const dims = item.w && item.h ? `${item.w} × ${item.h}` : '—';
    dom.factDurationLabel.textContent = t('facts.orientation');
    dom.mediaIcon.innerHTML = iconMarkup('i-image');
    dom.mediaName.textContent = item.file.name;
    dom.mediaName.title = item.file.name;
    dom.mediaSub.textContent = `${dims === '—' ? t('media.image') : dims} · ${fmtBytes(item.file.size)}`;
    const orientation = item.w && item.h ? (item.w >= item.h ? t('orientation.landscape') : t('orientation.portrait')) : '—';
    setFacts(dims, orientation, fmtBytes(item.file.size), extOf(item.file.name) || t('media.image'));
    dom.factAudio.textContent = '—';
    dom.imageName.textContent = item.file.name;
    dom.imageDims.textContent = dims === '—' ? t('loading.image') : `${dims} · ${fmtBytes(item.file.size)}`;
  }

  function refreshInfo() {
    if (state.mode === 'video') updateVideoInfo();
    else if (state.mode === 'image') updateImageInfo();
  }

  function setMode(mode) {
    state.mode = mode;
    dom.playerCard.classList.remove('mode-empty', 'mode-video', 'mode-image');
    dom.playerCard.classList.add(`mode-${mode}`);
    dom.video.hidden = mode !== 'video';
    dom.imageViewport.hidden = mode !== 'image';
    if (mode !== 'video') dom.playerCard.classList.remove('ui-idle', 'is-playing', 'is-paused', 'video-ready');
    if (mode !== 'image') dom.playerCard.classList.remove('is-zoomed');
    if (mode !== 'video') document.body.classList.remove('is-playing');
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
    syncSidebar();
    refreshInfo();
    updatePlaybackState();
    if (mode === 'image') showChrome();
  }

  // ── Playback chrome ───────────────────────────────────────
  function updatePlaybackState() {
    if (state.mode !== 'video') {
      dom.playerCard.classList.remove('is-playing', 'is-paused', 'video-ready');
      document.body.classList.remove('is-playing');
      return;
    }
    const ready = state.videoReady;
    const playing = ready && !dom.video.paused && !dom.video.ended;
    dom.playerCard.classList.toggle('video-ready', ready);
    dom.playerCard.classList.toggle('is-playing', playing);
    dom.playerCard.classList.toggle('is-paused', !playing);
    document.body.classList.toggle('is-playing', playing);
    dom.playBtn.setAttribute('aria-label', playing ? t('aria.pause') : t('aria.play'));
    dom.playBtn.title = playing ? t('play.title.pause') : t('play.title.play');
    if (!playing) {
      clearTimeout(state.idleTimer);
      state.idleTimer = null;
      dom.playerCard.classList.remove('ui-idle');
    } else {
      scheduleIdle();
    }
  }

  function canAutoHide() {
    if (state.settingsOpen || state.tracksOpen || state.scrubbing || state.chromeHover) return false;
    if (dom.speedPopover.classList.contains('open')) return false;
    if (state.mode === 'video') return state.videoReady && !dom.video.paused && !dom.video.ended;
    if (state.mode === 'image') return state.pointers.size === 0;
    return false;
  }

  function showChrome() {
    dom.playerCard.classList.remove('ui-idle');
    scheduleIdle();
  }

  function scheduleIdle(delay = 2800) {
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
    if (!canAutoHide()) return;
    state.idleTimer = setTimeout(() => {
      if (canAutoHide() && idCardInPlayer()) dom.playerCard.classList.add('ui-idle');
    }, delay);
  }

  function idCardInPlayer() {
    return dom.playerCard && document.body.contains(dom.playerCard);
  }

  // ── Transport ──────────────────────────────────────────────
  function togglePlayback() {
    if (state.mode !== 'video' || !state.videoReady) return;
    if (dom.video.paused || dom.video.ended) {
      dom.video.play().catch(() => toast(t('toast.playFailed')));
    } else {
      dom.video.pause();
    }
  }

  function seekTo(time) {
    if (state.mode !== 'video' || !state.videoReady) return;
    const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
    const target = clamp(time, 0, Math.max(0, duration - 0.01));
    try { dom.video.currentTime = target; } catch { /* ignore */ }
    updateTimeline();
  }

  function seekBy(delta) {
    if (state.mode !== 'video' || !state.videoReady) return;
    seekTo((dom.video.currentTime || 0) + delta);
    showChrome();
  }

  function getFps() {
    if (state.fpsOverride !== 'auto') {
      const manual = parseFloat(state.fpsOverride);
      if (Number.isFinite(manual) && manual > 0) return manual;
    }
    return state.detectedFps || 30;
  }

  function updateFpsUi() {
    const fps = getFps();
    dom.fpsPill.textContent = `${fmtFps(fps)} fps`;
    dom.fpsPill.title = t('fps.title', { fps: fmtFps(fps), ms: (1000 / fps).toFixed(1) });
    const autoOption = dom.fpsSelect.querySelector('option[value="auto"]');
    if (autoOption) autoOption.textContent = state.detectedFps ? t('fps.auto', { fps: fmtFps(state.detectedFps) }) : t('fps.autoPlain');
  }

  function stepFrame(direction) {
    if (state.mode !== 'video' || !state.videoReady) return;
    if (!dom.video.paused) dom.video.pause();
    const fps = getFps();
    const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
    if (!duration) return;
    const maxFrame = Math.max(0, Math.ceil(duration * fps) - 1);
    const current = clamp(Math.floor((dom.video.currentTime || 0) * fps + 1e-4), 0, maxFrame);
    const next = clamp(current + direction, 0, maxFrame);
    const target = Math.min((next + 0.35) / fps, Math.max(0, duration - 0.001));
    try { dom.video.currentTime = target; } catch { /* ignore */ }
    updateTimeline();
    showChrome();
    clearTimeout(state.frameToastTimer);
    state.frameToastTimer = setTimeout(() => {
      const frame = Math.floor((dom.video.currentTime || 0) * fps + 1e-4) + 1;
      toast(t('toast.frame', { frame, time: fmtTimePrecise(dom.video.currentTime), fps: fmtFps(fps) }), 1600);
    }, 160);
  }

  function setRate(value, notify = false) {
    const rate = clamp(round2(value), 0.1, 3);
    state.rate = rate;
    if (dom.video) dom.video.playbackRate = rate;
    allAudioTracks().forEach((track) => { if (track.el) track.el.playbackRate = rate; });
    dom.speedLabel.textContent = fmtRate(rate);
    dom.speedValue.textContent = fmtRate(rate);
    dom.speedRange.value = String(Math.round(rate * 100));
    paintRange(dom.speedRange, ((rate - 0.1) / 2.9) * 100);
    dom.speedLabel.parentElement.classList.toggle('is-active', Math.abs(rate - 1) > 0.001);
    dom.speedChips.querySelectorAll('button').forEach((button) => {
      button.classList.toggle('is-active', Math.abs(parseFloat(button.dataset.rate) - rate) < 0.001);
    });
    if (notify) toast(t('toast.speed', { rate: fmtRate(rate) }));
  }

  function adjustRate(dir) {
    const steps = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    const current = state.rate;
    let next = current;
    if (dir > 0) next = steps.find((value) => value > current + 0.001) ?? 3;
    else next = [...steps].reverse().find((value) => value < current - 0.001) ?? 0.1;
    setRate(next, true);
  }

  function applyVolume() {
    const master = clamp(state.masterVolume, 0, 1);
    const embeddedActive = state.embeddedTracks.some((track) => track.enabled && track.status !== 'error');
    const videoMuted = state.muted || !state.originalEnabled || embeddedActive;
    dom.video.volume = master;
    dom.video.muted = videoMuted;
    allAudioTracks().forEach((track) => {
      if (!track.el) return;
      track.el.volume = clamp(master * track.volume, 0, 1);
      track.el.muted = state.muted || !track.enabled;
    });
    dom.masterVolume.value = String(Math.round(master * 100));
    paintRange(dom.masterVolume, master * 100);
    const level = state.muted || master === 0 ? 'mute' : master < 0.45 ? 'low' : 'high';
    dom.muteBtn.dataset.level = level;
    dom.muteBtn.setAttribute('aria-label', level === 'mute' ? t('aria.muteOn') : t('aria.muteOff'));
    if (master > 0) state.lastNonZeroVolume = master;
    updateTrackVolumeVisuals();
  }

  function toggleMute() {
    if (state.muted) {
      state.muted = false;
      if (state.masterVolume === 0) state.masterVolume = state.lastNonZeroVolume || 0.5;
    } else {
      state.muted = true;
    }
    applyVolume();
    showChrome();
  }

  function setLoop(on, notify = false) {
    state.loop = Boolean(on);
    dom.video.loop = state.loop;
    dom.loopBtn.classList.toggle('is-active', state.loop);
    dom.loopBtn.setAttribute('aria-pressed', String(state.loop));
    dom.loopSwitch.setAttribute('aria-checked', String(state.loop));
    if (notify) toast(state.loop ? t('toast.loopOn') : t('toast.loopOff'));
  }

  function updateTimeline() {
    const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
    const current = Number.isFinite(dom.video.currentTime) ? dom.video.currentTime : 0;
    const ratio = duration > 0 ? clamp(current / duration, 0, 1) : 0;
    dom.progress.style.transform = `scaleX(${ratio})`;
    dom.timelineThumb.style.left = `${ratio * 100}%`;
    dom.currentTime.textContent = fmtTime(current, duration >= 3600);
    dom.duration.textContent = fmtTime(duration, duration >= 3600);
    dom.timeline.setAttribute('aria-valuenow', String(Math.round(current)));
    dom.timeline.setAttribute('aria-valuemax', String(Math.round(duration)));
    dom.timeline.setAttribute('aria-valuetext', t('aria.time', { current: fmtTime(current), total: fmtTime(duration) }));
  }

  function updateBuffered() {
    const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
    let end = 0;
    try {
      const ranges = dom.video.buffered;
      for (let i = 0; i < ranges.length; i += 1) end = Math.max(end, ranges.end(i));
    } catch { /* ignore */ }
    dom.buffered.style.transform = `scaleX(${duration > 0 ? clamp(end / duration, 0, 1) : 0})`;
  }

  function startTick() {
    if (state.tickHandle) return;
    const tick = () => {
      state.tickHandle = null;
      if (state.mode !== 'video' || dom.video.paused) return;
      updateTimeline();
      const now = performance.now();
      if (now - state.lastAudioSync > 750) {
        state.lastAudioSync = now;
        syncAudioTracks(false);
      }
      state.tickHandle = requestAnimationFrame(tick);
    };
    state.tickHandle = requestAnimationFrame(tick);
  }

  // ── Audio tracks ──────────────────────────────────────────
  let originalRow = null;

  function clearAudioTracks() {
    state.analysisToken += 1;
    dom.tracksFileName.textContent = '—';
    dom.tracksFileName.title = '';
    dom.tracksBadge.textContent = '0';
    dom.tracksBadge.hidden = true;
    allAudioTracks().forEach((track) => {
      if (track.el) {
        try { track.el.pause(); } catch { /* ignore */ }
        track.el.removeAttribute('src');
      }
      if (track.url) {
        try { URL.revokeObjectURL(track.url); } catch { /* ignore */ }
      }
      track.row = null;
    });
    state.audioTracks = [];
    state.embeddedTracks = [];
    state.embeddedAnalyzing = false;
    state.embeddedChecked = false;
    state.originalEnabled = true;
    originalRow = null;
    if (state.mode === 'video') renderTracks();
  }

  function updateTrackRowMeta(track) {
    if (!track.row || track.kind !== 'external') return;
    const meta = track.row.querySelector('.track-meta');
    if (!meta) return;
    const duration = Number.isFinite(track.el.duration) && track.el.duration > 0 ? fmtTime(track.el.duration) : '';
    meta.textContent = duration ? t('track.externalMeta', { duration }) : t('track.externalShort');
  }

  function updateTrackVolumeVisuals() {
    allAudioTracks().forEach((track) => {
      if (!track.row) return;
      const input = track.row.querySelector('.track-vol input');
      const label = track.row.querySelector('.track-vol span');
      const pct = Math.round(track.volume * 100);
      if (input) { input.value = String(pct); paintRange(input, pct); }
      if (label) label.textContent = `${pct}%`;
      track.row.classList.toggle('is-on', track.enabled);
      track.row.classList.toggle('is-off', !track.enabled);
      const sw = track.row.querySelector('.switch');
      if (sw) sw.setAttribute('aria-checked', String(track.enabled));
    });
    if (originalRow) {
      const sw = originalRow.querySelector('.switch');
      if (sw) sw.setAttribute('aria-checked', String(state.originalEnabled));
      originalRow.classList.toggle('is-on', state.originalEnabled);
      originalRow.classList.toggle('is-off', !state.originalEnabled);
    }
  }

  function buildOriginalRow() {
    const row = document.createElement('div');
    row.className = `track ${state.originalEnabled ? 'is-on' : 'is-off'}`;
    row.innerHTML = `
      <div class="track-top">
        <span class="track-index">NAT</span>
        <div class="eq" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="track-text">
          <div class="track-name">${t('track.nativeName')}</div>
          <div class="track-meta">${t('track.nativeMeta')}</div>
        </div>
        <span class="track-badge">native</span>
        <button class="switch" type="button" role="switch" aria-checked="${state.originalEnabled}" aria-label="${t('track.nativeName')}"><span></span></button>
      </div>`;
    const sw = row.querySelector('.switch');
    sw.addEventListener('click', () => {
      state.originalEnabled = !state.originalEnabled;
      applyVolume();
      updateTrackVolumeVisuals();
      showChrome();
    });
    originalRow = row;
    return row;
  }

  function buildAudioRow(track) {
    const row = document.createElement('div');
    row.className = `track ${track.enabled ? 'is-on' : 'is-off'}`;
    row.dataset.id = track.id;
    row.innerHTML = `
      <div class="track-top">
        <span class="track-index">EXT</span>
        <div class="eq" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="track-text">
          <div class="track-name"></div>
          <div class="track-meta">${t('track.externalShort')}</div>
        </div>
        <span class="track-badge">${t('track.externalBadge')}</span>
        <button class="track-remove" type="button" title="${t('track.remove')}" aria-label="${t('track.remove')}">${iconMarkup('i-trash')}</button>
        <button class="switch" type="button" role="switch" aria-checked="${track.enabled}" aria-label="${t('track.enable')}"><span></span></button>
      </div>
      <div class="track-vol">
        ${iconMarkup('i-volume-low')}
        <input type="range" min="0" max="100" step="1" value="${Math.round(track.volume * 100)}" aria-label="${t('track.volume')}">
        <span>${Math.round(track.volume * 100)}%</span>
      </div>`;
    const name = row.querySelector('.track-name');
    name.textContent = track.file.name;
    name.title = track.file.name;
    const sw = row.querySelector('.switch');
    const remove = row.querySelector('.track-remove');
    const volume = row.querySelector('.track-vol input');
    const volumeLabel = row.querySelector('.track-vol span');

    row.querySelectorAll('.track-remove .ico').forEach((node) => node.setAttribute('aria-hidden', 'true'));
    sw.setAttribute('aria-label', t('track.enableNamed', { name: track.file.name }));
    remove.setAttribute('aria-label', t('track.removeNamed', { name: track.file.name }));
    paintRange(volume, track.volume * 100);
    track.row = row;
    updateTrackRowMeta(track);

    sw.addEventListener('click', () => {
      track.enabled = !track.enabled;
      if (!track.enabled) {
        try { track.el.pause(); } catch { /* ignore */ }
      } else if (state.videoReady && !dom.video.paused) {
        syncAudioTracks(true);
      }
      applyVolume();
      updateTrackVolumeVisuals();
      updateToggleAllTracks();
      showChrome();
    });

    remove.addEventListener('click', () => {
      removeAudioTrack(track.id);
    });

    volume.addEventListener('input', () => {
      track.volume = clamp(Number(volume.value) / 100, 0, 1);
      paintRange(volume, Number(volume.value));
      volumeLabel.textContent = `${Math.round(track.volume * 100)}%`;
      applyVolume();
    });

    return row;
  }

  function refreshEmbeddedRow(track) {
    const row = track.row;
    if (!row) return;
    const meta = row.querySelector('.track-meta');
    const badge = row.querySelector('.track-badge');
    const status = row.querySelector('.track-status');
    const sw = row.querySelector('.switch');
    if (meta) {
      const suffix = track.loading ? t('track.extractingSuffix') : '';
      meta.textContent = `${embeddedMetaText(track)}${suffix}`;
    }
    if (badge) {
      badge.textContent = track.codecLabel || 'AUDIO';
      badge.classList.toggle('is-warn', !track.supported);
      badge.title = track.supported ? t('track.codecSupported') : (track.reason || t('track.codecUnsupported'));
    }
    if (status) {
      const text = embeddedStatus(track);
      status.textContent = text;
      status.hidden = !text;
      status.classList.toggle('is-loading', track.loading);
      status.classList.toggle('is-error', track.status === 'error');
    }
    if (sw) {
      sw.disabled = !track.supported;
      sw.setAttribute('aria-checked', String(track.enabled));
      sw.setAttribute('aria-label', t('track.enableNamed', { name: track.title }));
    }
    row.classList.toggle('is-on', track.enabled);
    row.classList.toggle('is-off', !track.enabled);
    row.title = track.supported ? '' : (track.reason || t('track.codecUnsupported'));
  }

  function buildEmbeddedRow(track) {
    const row = document.createElement('div');
    row.className = `track track-embedded ${track.enabled ? 'is-on' : 'is-off'}`;
    row.dataset.id = track.id;
    row.innerHTML = `
      <div class="track-top">
        <span class="track-index">${String(track.index).padStart(2, '0')}</span>
        <div class="eq" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="track-text">
          <div class="track-name"></div>
          <div class="track-meta"></div>
        </div>
        <span class="track-badge"></span>
        <button class="switch" type="button" role="switch" aria-checked="${track.enabled}" aria-label="${t('track.enable')}"><span></span></button>
      </div>
      <div class="track-vol">
        ${iconMarkup('i-volume-low')}
        <input type="range" min="0" max="100" step="1" value="${Math.round(track.volume * 100)}" aria-label="${t('track.volume')}">
        <span>${Math.round(track.volume * 100)}%</span>
      </div>
      <div class="track-status"></div>`;
    const name = row.querySelector('.track-name');
    name.textContent = track.title;
    name.title = track.title;
    const volume = row.querySelector('.track-vol input');
    const volumeLabel = row.querySelector('.track-vol span');
    const sw = row.querySelector('.switch');
    paintRange(volume, track.volume * 100);
    track.row = row;

    sw.addEventListener('click', () => {
      if (!track.supported) return;
      track.enabled = !track.enabled;
      applyVolume();
      updateTrackVolumeVisuals();
      if (!track.enabled) {
        if (track.el) {
          try { track.el.pause(); } catch { /* ignore */ }
        }
      } else {
        ensureEmbeddedAudio(track).then(() => {
          if (state.videoReady && !dom.video.paused) syncAudioTracks(true);
        });
      }
      refreshEmbeddedRow(track);
      updateToggleAllTracks();
      showChrome();
    });

    volume.addEventListener('input', () => {
      track.volume = clamp(Number(volume.value) / 100, 0, 1);
      paintRange(volume, Number(volume.value));
      volumeLabel.textContent = `${Math.round(track.volume * 100)}%`;
      applyVolume();
    });

    refreshEmbeddedRow(track);
    return row;
  }

  function updateToggleAllTracks() {
    if (!dom.toggleAllTracks) return;
    const tracks = [...state.embeddedTracks.filter((track) => track.supported), ...state.audioTracks];
    const enabled = tracks.length > 0 && tracks.every((track) => track.enabled);
    const available = state.mode === 'video' && tracks.length > 0;
    dom.toggleAllTracks.disabled = !available;
    dom.toggleAllTracks.classList.toggle('is-on', enabled);
    dom.toggleAllTracksLabel.textContent = enabled ? t('toggleAll.disable') : t('toggleAll.enable');
    const label = enabled ? t('toggleAll.ariaDisable') : t('toggleAll.ariaEnable');
    dom.toggleAllTracks.setAttribute('aria-label', label);
    dom.toggleAllTracks.setAttribute('aria-pressed', String(enabled));
    if (dom.toggleAllTracksIcon) {
      const use = dom.toggleAllTracksIcon.querySelector('use');
      if (use) use.setAttribute('href', enabled ? '#i-close' : '#i-check');
    }
  }

  function setAllTracksEnabled(enable) {
    if (state.mode !== 'video') return;
    const tracks = [...state.embeddedTracks.filter((track) => track.supported), ...state.audioTracks];
    if (!tracks.length) return;
    tracks.forEach((track) => {
      track.enabled = enable;
      if (!enable && track.el) {
        try { track.el.pause(); } catch { /* ignore */ }
      }
    });
    if (!enable) state.originalEnabled = true;
    applyVolume();
    renderTracks();
    if (enable) {
      const file = state.videoFile;
      const token = state.analysisToken;
      const embedded = state.embeddedTracks.filter((track) => track.supported && track.enabled);
      (async () => {
        for (const track of embedded) {
          if (token !== state.analysisToken || state.videoFile !== file || !track.enabled) break;
          await ensureEmbeddedAudio(track);
        }
      })();
      if (state.videoReady && !dom.video.paused) syncAudioTracks(true);
    }
    updateToggleAllTracks();
  }

  function renderTracks() {
    if (state.mode !== 'video') {
      dom.tracksList.replaceChildren();
      dom.tracksCount.textContent = '0';
      dom.tracksBadge.textContent = '0';
      dom.tracksBadge.hidden = true;
      updateToggleAllTracks();
      return;
    }
    const frag = document.createDocumentFragment();
    const hasSupportedEmbedded = state.embeddedTracks.some((track) => track.supported && track.status !== 'error');
    if (!hasSupportedEmbedded) frag.append(buildOriginalRow());
    state.embeddedTracks.forEach((track) => frag.append(buildEmbeddedRow(track)));
    state.audioTracks.forEach((track) => frag.append(buildAudioRow(track)));
    dom.tracksList.replaceChildren(frag);
    const count = state.embeddedTracks.length + state.audioTracks.length + (hasSupportedEmbedded ? 0 : 1);
    const countText = state.embeddedAnalyzing ? '…' : String(count);
    dom.tracksCount.textContent = countText;
    dom.tracksBadge.textContent = countText;
    dom.tracksBadge.hidden = countText === '0';
    applyVolume();
    updateToggleAllTracks();
  }

  function addAudioTracks(files) {
    const valid = [...files].filter(isAudioFile);
    if (!valid.length) return 0;
    if (state.mode !== 'video') {
      toast(t('audio.openVideoFirst'));
      return 0;
    }
    valid.forEach((file) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audio.volume = clamp(state.masterVolume, 0, 1);
      audio.preservesPitch = true;
      if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;
      audio.playbackRate = state.rate;
      state.audioSeq += 1;
      const track = {
        id: `audio-${state.audioSeq}`,
        kind: 'external',
        file,
        url,
        el: audio,
        enabled: true,
        volume: 1,
        offset: 0,
        row: null,
      };
      audio.addEventListener('loadedmetadata', () => {
        updateTrackRowMeta(track);
        if (state.videoReady && !dom.video.paused) syncAudioTracks(true);
      });
      audio.addEventListener('error', () => {
        toast(t('audio.openFailed', { name: file.name }), 3500);
      });
      state.audioTracks.push(track);
    });
    renderTracks();
    if (state.videoReady && !dom.video.paused) syncAudioTracks(true);
    const count = valid.length;
    toast(tp('trackAdded', count));
    return count;
  }

  function removeAudioTrack(id) {
    const index = state.audioTracks.findIndex((track) => track.id === id);
    if (index === -1) return;
    const [track] = state.audioTracks.splice(index, 1);
    try { track.el.pause(); } catch { /* ignore */ }
    URL.revokeObjectURL(track.url);
    track.el.removeAttribute('src');
    renderTracks();
    toast(t('audio.removed'));
  }

  function syncAudioTracks(force = false) {
    if (state.mode !== 'video') return;
    const tracks = allAudioTracks().filter((track) => track.el);
    if (!tracks.length) return;
    const playing = state.videoReady && !dom.video.paused && !dom.video.ended;
    const time = Number.isFinite(dom.video.currentTime) ? dom.video.currentTime : 0;
    tracks.forEach((track) => {
      const audio = track.el;
      if (!track.enabled) {
        if (!audio.paused) audio.pause();
        return;
      }
      audio.playbackRate = state.rate;
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      const localTime = time - (track.offset || 0);
      if (localTime < 0) {
        if (!audio.paused) audio.pause();
        return;
      }
      if (!playing) {
        if (!audio.paused) audio.pause();
        if (force && audio.readyState >= 1 && duration > 0) {
          try { audio.currentTime = Math.min(localTime, Math.max(0, duration - 0.01)); } catch { /* ignore */ }
        }
        return;
      }
      if (duration > 0 && localTime >= duration - 0.03) {
        if (!audio.paused) audio.pause();
        return;
      }
      const target = duration > 0 ? Math.min(localTime, Math.max(0, duration - 0.01)) : localTime;
      if (audio.readyState >= 1 && (force || audio.paused || Math.abs(audio.currentTime - target) > 0.18)) {
        try { audio.currentTime = target; } catch { /* ignore */ }
      }
      if (audio.paused) audio.play().catch(() => { /* autoplay can be blocked */ });
    });
  }

  // ── Embedded MP4 audio (MP4Box) ───────────────────────────
  function decodeBoxText(bytes) {
    if (!bytes || !bytes.length) return '';
    try {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      return text.replace(/\u0000+$/g, '').replace(/^\uFEFF/, '').trim();
    } catch {
      return '';
    }
  }

  async function readTrackCustomNames(mp4, file) {
    const names = {};
    if (!mp4 || !mp4.moov || !mp4.moov.traks) return names;
    for (const trak of mp4.moov.traks) {
      const id = trak.tkhd && trak.tkhd.track_id;
      if (!id || !trak.udta || !trak.udta.boxes) continue;
      for (const box of trak.udta.boxes) {
        if (box.type !== 'name') continue;
        let bytes = null;
        if (box.data) {
          bytes = box.data instanceof Uint8Array
            ? box.data
            : box.data.buffer instanceof ArrayBuffer
              ? new Uint8Array(box.data.buffer, box.data.byteOffset || 0, box.data.byteLength || box.data.length || 0)
              : new Uint8Array(box.data);
        }
        if ((!bytes || !bytes.length) && Number.isFinite(box.start) && Number.isFinite(box.size) && box.size > 8) {
          const start = box.start + (box.hdr_size || 8);
          const end = box.start + box.size;
          if (start >= 0 && end <= file.size) {
            try { bytes = new Uint8Array(await file.slice(start, end).arrayBuffer()); }
            catch { bytes = null; }
          }
        }
        const text = decodeBoxText(bytes);
        if (text) { names[id] = text; break; }
      }
    }
    return names;
  }

  function readMp4Info(file, token) {
    return new Promise((resolve, reject) => {
      const MP4 = window.MP4Box;
      if (!MP4) {
        reject(new Error(t('error.mp4boxMissing')));
        return;
      }
      const mp4 = MP4.createFile(false);
      let offset = 0;
      let settled = false;
      let reading = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        mp4.onReady = null;
        mp4.onError = null;
        fn(value);
      };
      mp4.onReady = async (info) => {
        let names = {};
        try { names = await readTrackCustomNames(mp4, file); }
        catch { names = {}; }
        finish(resolve, { info, names });
      };
      mp4.onError = (error) => finish(reject, error instanceof Error ? error : new Error(t('error.mp4Parse')));
      const readNext = async () => {
        if (settled || reading) return;
        if (token !== state.analysisToken) {
          finish(reject, new Error(t('error.mp4Cancelled')));
          return;
        }
        if (offset >= file.size) {
          finish(reject, new Error(t('error.mp4Metadata')));
          return;
        }
        reading = true;
        const end = Math.min(file.size, offset + 4 * 1024 * 1024);
        try {
          const chunk = await file.slice(offset, end).arrayBuffer();
          if (settled) return;
          chunk.fileStart = offset;
          offset = end;
          mp4.appendBuffer(chunk);
          reading = false;
          if (!settled) setTimeout(readNext, 0);
        } catch (error) {
          reading = false;
          finish(reject, error);
        }
      };
      readNext();
    });
  }

  function sampleBytes(sample) {
    const data = sample && sample.data;
    if (!data) return new Uint8Array(0);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (data.buffer instanceof ArrayBuffer) {
      return new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || sample.size || 0);
    }
    return new Uint8Array(0);
  }

  function concatSamples(samples) {
    let total = 0;
    samples.forEach((sample) => { total += sampleBytes(sample).length; });
    const out = new Uint8Array(total);
    let offset = 0;
    samples.forEach((sample) => {
      const bytes = sampleBytes(sample);
      out.set(bytes, offset);
      offset += bytes.length;
    });
    return out;
  }

  function buildAdtsData(samples, track) {
    let total = 0;
    const payloads = samples.map((sample) => {
      const bytes = sampleBytes(sample);
      total += bytes.length + 7;
      return bytes;
    });
    const out = new Uint8Array(total);
    const freqIndex = ADTS_RATES.indexOf(Number(track.sampleRate));
    const frequency = freqIndex >= 0 ? freqIndex : 4;
    const channels = clamp(Number(track.channels) || 2, 1, 7);
    const profile = 1;
    let offset = 0;
    payloads.forEach((bytes) => {
      const frameLength = bytes.length + 7;
      if (frameLength > 8191) throw new Error(t('error.aacFrame'));
      out[offset] = 0xff;
      out[offset + 1] = 0xf1;
      out[offset + 2] = ((profile & 3) << 6) | ((frequency & 15) << 2) | ((channels >> 2) & 1);
      out[offset + 3] = ((channels & 3) << 6) | ((frameLength >> 11) & 3);
      out[offset + 4] = (frameLength >> 3) & 0xff;
      out[offset + 5] = ((frameLength & 7) << 5) | 0x1f;
      out[offset + 6] = 0xfc;
      out.set(bytes, offset + 7);
      offset += frameLength;
    });
    return out;
  }

  async function extractMp4Audio(file, track) {
    const MP4 = window.MP4Box;
    if (!MP4) throw new Error(t('error.mp4boxMissing'));
    const buffer = await file.arrayBuffer();
    if (state.videoFile !== file) throw new Error(t('error.fileClosed'));
    buffer.fileStart = 0;
    const mp4 = MP4.createFile(true);
    const info = await new Promise((resolve, reject) => {
      let settled = false;
      mp4.onReady = (value) => {
        settled = true;
        resolve(value);
      };
      mp4.onError = (error) => {
        if (!settled) reject(error instanceof Error ? error : new Error(t('error.mp4Parse')));
      };
      try {
        mp4.appendBuffer(buffer);
        mp4.flush();
      } catch (error) {
        reject(error);
      }
    });
    const meta = info.tracks.find((item) => item.id === track.mp4Id);
    if (!meta) throw new Error(t('error.trackNotFound'));
    const samples = [];
    const expected = Number(track.nbSamples) || Number(meta.nb_samples) || 0;
    await new Promise((resolve, reject) => {
      const started = performance.now();
      let finished = false;
      const done = (error) => {
        if (finished) return;
        finished = true;
        mp4.onSamples = null;
        if (error) reject(error);
        else resolve();
      };
      mp4.onSamples = (id, user, batch) => {
        if (id !== track.mp4Id || !batch || !batch.length) return;
        for (let i = 0; i < batch.length; i += 1) samples.push(batch[i]);
      };
      mp4.setExtractionOptions(track.mp4Id, null, { nbSamples: 2000 });
      try {
        mp4.start();
        mp4.flush();
      } catch (error) {
        done(error);
        return;
      }
      const check = () => {
        if (finished) return;
        if (expected && samples.length >= expected) { done(); return; }
        const waited = performance.now() - started;
        if (!expected && samples.length && waited > 600) { done(); return; }
        if (waited > 30000) {
          if (samples.length) done();
          else done(new Error(t('error.extractFailed')));
          return;
        }
        setTimeout(check, 30);
      };
      check();
    });
    if (!samples.length) throw new Error(t('error.noSamples'));

    let data;
    let mime;
    if (track.format === 'aac') {
      data = buildAdtsData(samples, track);
      mime = 'audio/aac';
    } else if (track.format === 'mp3') {
      data = concatSamples(samples);
      mime = 'audio/mpeg';
    } else {
      throw new Error(t('error.unsupportedFormat'));
    }
    const first = samples[0];
    const timescale = Number(first.timescale) || track.sampleRate || 48000;
    const offset = Math.max(0, (Number(first.cts) || 0) / timescale);
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    return { url, offset };
  }

  function failEmbeddedTrack(track, message) {
    track.loading = false;
    track.status = 'error';
    track.statusMessage = message;
    track.enabled = false;
    if (track.el) {
      try { track.el.pause(); } catch { /* ignore */ }
      track.el.removeAttribute('src');
      track.el = null;
    }
    if (track.url) {
      try { URL.revokeObjectURL(track.url); } catch { /* ignore */ }
      track.url = null;
    }
    if (!state.embeddedTracks.some((item) => item !== track && item.enabled && item.status !== 'error')) {
      state.originalEnabled = true;
    }
    renderTracks();
  }

  function ensureEmbeddedAudio(track) {
    if (!track || !track.supported) return Promise.resolve(null);
    if (track.el) return Promise.resolve(track.el);
    if (track.pending) return track.pending;
    if (!state.videoFile) return Promise.resolve(null);
    const file = state.videoFile;
    const token = state.analysisToken;
    track.loading = true;
    track.status = 'idle';
    track.statusMessage = '';
    refreshEmbeddedRow(track);
    applyVolume();
    track.pending = (async () => {
      try {
        const result = await extractMp4Audio(file, track);
        if (token !== state.analysisToken || state.videoFile !== file || !state.embeddedTracks.includes(track)) {
          URL.revokeObjectURL(result.url);
          return null;
        }
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = result.url;
        audio.volume = clamp(state.masterVolume * track.volume, 0, 1);
        audio.preservesPitch = true;
        if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;
        audio.playbackRate = state.rate;
        track.el = audio;
        track.url = result.url;
        track.offset = result.offset;
        track.loading = false;
        track.status = 'ready';
        track.statusMessage = '';
        audio.addEventListener('loadedmetadata', () => {
          if (state.videoReady && !dom.video.paused && track.enabled) syncAudioTracks(true);
        });
        audio.addEventListener('error', () => {
          failEmbeddedTrack(track, t('error.playbackExtracted'));
          toast(t('toast.trackPlayFailed', { title: track.title }), 3800);
        });
        if (dom.tracksList.querySelector('.track:not(.track-embedded)')) {
          renderTracks();
        } else {
          refreshEmbeddedRow(track);
          applyVolume();
        }
        if (state.videoReady && !dom.video.paused && track.enabled) syncAudioTracks(true);
        return audio;
      } catch (error) {
        failEmbeddedTrack(track, error && error.message ? error.message : t('track.extractError'));
        toast(t('toast.trackExtractFailed', { title: track.title }), 3800);
        return null;
      } finally {
        track.pending = null;
      }
    })();
    return track.pending;
  }

  async function analyzeEmbeddedAudio(file) {
    const isoBmff = /\.(mp4|m4v|mov|m4a)$/i.test(file.name) || /(mp4|quicktime)/i.test(file.type);
    if (!isoBmff) {
      state.embeddedAnalyzing = false;
      state.embeddedChecked = true;
      renderTracks();
      updateVideoInfo();
      return;
    }
    const token = ++state.analysisToken;
    state.embeddedTracks = [];
    state.embeddedAnalyzing = true;
    state.embeddedChecked = false;
    renderTracks();
    updateVideoInfo();
    if (!window.MP4Box) {
      state.embeddedAnalyzing = false;
      state.embeddedChecked = true;
      renderTracks();
      updateVideoInfo();
      return;
    }
    try {
      const result = await readMp4Info(file, token);
      if (token !== state.analysisToken || state.videoFile !== file) return;
      const info = result.info;
      const names = result.names || {};
      const audioTracks = info.tracks.filter((item) => item.audio);
      state.embeddedTracks = audioTracks.map((item, index) => {
        const codec = codecInfo(item.codec);
        const customName = names[item.id] || '';
        const titleTrack = {
          name: item.name || '',
          language: item.language || 'und',
          customName,
        };
        return {
          id: `embedded-${item.id}`,
          kind: 'embedded',
          mp4Id: item.id,
          index: index + 1,
          codec: item.codec,
          codecLabel: codec.label,
          format: codec.format,
          mime: codec.mime,
          supported: codec.supported,
          reason: codec.reason || '',
          language: item.language || 'und',
          name: item.name || '',
          customName,
          title: languageTitle(titleTrack, index),
          channels: item.audio && item.audio.channel_count ? item.audio.channel_count : 2,
          sampleRate: item.audio && item.audio.sample_rate ? item.audio.sample_rate : 48000,
          nbSamples: item.nb_samples || 0,
          enabled: codec.supported,
          volume: 1,
          el: null,
          url: null,
          offset: 0,
          loading: false,
          pending: null,
          status: 'idle',
          statusMessage: '',
          row: null,
        };
      });
      state.embeddedAnalyzing = false;
      state.embeddedChecked = true;
      state.originalEnabled = true;
      renderTracks();
      updateVideoInfo();
      applyVolume();
      if (state.embeddedTracks.length > 1) {
        toast(tp('tracksFound', state.embeddedTracks.length), 3000);
      }
      const supported = state.embeddedTracks.filter((track) => track.supported);
      if (supported.length) {
        setTimeout(() => {
          if (token !== state.analysisToken || state.videoFile !== file) return;
          (async () => {
            for (const track of supported) {
              if (token !== state.analysisToken || state.videoFile !== file || !track.enabled) break;
              await ensureEmbeddedAudio(track);
            }
          })();
        }, 260);
      }
    } catch (error) {
      if (token !== state.analysisToken) return;
      state.embeddedAnalyzing = false;
      state.embeddedChecked = true;
      state.embeddedTracks = [];
      state.originalEnabled = true;
      renderTracks();
      updateVideoInfo();
      applyVolume();
      if (window.console && console.warn) console.warn('DePLay: не удалось разобрать аудиодорожки MP4', error);
    }
  }

  // ── FPS probe ─────────────────────────────────────────────
  function resetFpsProbe() {
    if (state.fpsProbeHandle != null && typeof dom.video.cancelVideoFrameCallback === 'function') {
      try { dom.video.cancelVideoFrameCallback(state.fpsProbeHandle); } catch { /* ignore */ }
    }
    state.fpsProbeHandle = null;
    state.fpsProbeRunning = false;
    state.fpsSamples = [];
    state.fpsLastMedia = null;
    state.detectedFps = null;
    state.fpsOverride = 'auto';
    dom.fpsSelect.value = 'auto';
    updateFpsUi();
  }

  function finishFpsProbe() {
    if (!state.fpsProbeRunning && state.fpsSamples.length === 0) return;
    state.fpsProbeRunning = false;
    if (state.fpsProbeHandle != null && typeof dom.video.cancelVideoFrameCallback === 'function') {
      try { dom.video.cancelVideoFrameCallback(state.fpsProbeHandle); } catch { /* ignore */ }
    }
    state.fpsProbeHandle = null;
    if (state.fpsSamples.length < 5) return;
    const sorted = [...state.fpsSamples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (!Number.isFinite(median) || median <= 0) return;
    let fps = 1 / median;
    if (fps < 5 || fps > 240) return;
    const common = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 100, 120];
    let nearest = null;
    let best = Infinity;
    common.forEach((value) => {
      const diff = Math.abs(value - fps);
      if (diff < best) { best = diff; nearest = value; }
    });
    const tolerance = Math.max(0.6, Math.min(1.8, (nearest || fps) * 0.055));
    if (nearest && best < tolerance) fps = nearest;
    else fps = Math.round(fps * 100) / 100;
    state.detectedFps = fps;
    updateFpsUi();
  }

  function startFpsProbe() {
    if (state.fpsProbeRunning || state.detectedFps) return;
    if (state.fpsOverride !== 'auto') return;
    if (typeof dom.video.requestVideoFrameCallback !== 'function') return;
    if (dom.video.paused || !state.videoReady) return;
    state.fpsProbeRunning = true;
    state.fpsLastMedia = null;
    const callback = (now, metadata) => {
      if (!state.fpsProbeRunning || state.mode !== 'video') return;
      const mediaTime = metadata && Number.isFinite(metadata.mediaTime) ? metadata.mediaTime : null;
      if (mediaTime != null) {
        if (state.fpsLastMedia != null && mediaTime > state.fpsLastMedia) {
          const delta = mediaTime - state.fpsLastMedia;
          if (delta > 0.0005 && delta < 0.35) state.fpsSamples.push(delta);
        }
        state.fpsLastMedia = mediaTime;
      }
      if (state.fpsSamples.length >= 24) { finishFpsProbe(); return; }
      state.fpsProbeHandle = dom.video.requestVideoFrameCallback(callback);
    };
    state.fpsProbeHandle = dom.video.requestVideoFrameCallback(callback);
  }

  // ── Timeline preview ──────────────────────────────────────
  function drawPreview() {
    const width = dom.previewCanvas.width;
    const height = dom.previewCanvas.height;
    previewCtx.clearRect(0, 0, width, height);
    const vw = previewVideo.videoWidth;
    const vh = previewVideo.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.min(width / vw, height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    previewCtx.fillStyle = '#000';
    previewCtx.fillRect(0, 0, width, height);
    try { previewCtx.drawImage(previewVideo, (width - dw) / 2, (height - dh) / 2, dw, dh); } catch { /* ignore */ }
  }

  function seekPreview() {
    if (state.previewSeeking) return;
    const targetTime = state.previewPending;
    if (targetTime == null) return;
    if (!Number.isFinite(previewVideo.duration) || previewVideo.readyState < 1) return;
    state.previewSeeking = true;
    const token = ++state.previewToken;
    let finished = false;

    const finish = () => {
      if (finished || token !== state.previewToken) return;
      finished = true;
      state.previewSeeking = false;
      drawPreview();
      const pending = state.previewPending;
      if (pending != null && Math.abs(pending - previewVideo.currentTime) > 0.045) {
        seekPreview();
      } else {
        state.previewPending = null;
      }
    };

    const afterSeek = () => {
      if (token !== state.previewToken) return;
      if (typeof previewVideo.requestVideoFrameCallback === 'function') {
        previewVideo.requestVideoFrameCallback(() => finish());
      } else {
        finish();
      }
    };

    if (Math.abs(previewVideo.currentTime - targetTime) < 0.015) {
      afterSeek();
      return;
    }
    previewVideo.addEventListener('seeked', afterSeek, { once: true });
    try { previewVideo.currentTime = targetTime; } catch { finish(); return; }
    setTimeout(finish, 700);
  }

  function requestPreviewFrame(time) {
    if (state.mode !== 'video' || !state.videoReady) return;
    if (!Number.isFinite(previewVideo.duration) || previewVideo.readyState < 1) return;
    state.previewPending = clamp(time, 0, Math.max(0, previewVideo.duration - 0.04));
    if (!state.previewSeeking) seekPreview();
  }

  function hidePreview() {
    dom.previewCard.classList.remove('show');
    dom.hoverLine.classList.remove('show');
    state.previewPending = null;
  }

  function updateHover(event) {
    if (state.mode !== 'video' || !state.videoReady) return;
    const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
    if (!duration) return;
    const rect = dom.timeline.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const ratio = rect.width > 0 ? x / rect.width : 0;
    dom.hoverLine.style.left = `${x}px`;
    dom.hoverLine.classList.add('show');
    const previewX = clamp(x, 96, Math.max(96, rect.width - 96));
    dom.previewCard.style.left = `${previewX}px`;
    dom.previewTime.textContent = fmtTime(ratio * duration);
    dom.previewCard.classList.add('show');
    requestPreviewFrame(ratio * duration);
  }

  // ── Media loading ─────────────────────────────────────────
  function resetVideoTimeline() {
    dom.progress.style.transform = 'scaleX(0)';
    dom.buffered.style.transform = 'scaleX(0)';
    dom.timelineThumb.style.left = '0%';
    dom.currentTime.textContent = '0:00';
    dom.duration.textContent = '0:00';
    dom.timeline.setAttribute('aria-valuenow', '0');
    dom.timeline.setAttribute('aria-valuemax', '0');
    dom.timeline.setAttribute('aria-valuetext', t('aria.time', { current: '0:00', total: '0:00' }));
    hidePreview();
    state.scrubbing = false;
    dom.playerCard.classList.remove('is-scrubbing');
    updateFpsUi();
  }

  function stopVideoSource() {
    dom.video.pause();
    dom.video.removeAttribute('src');
    try { dom.video.load(); } catch { /* ignore */ }
    try { previewVideo.pause(); previewVideo.removeAttribute('src'); previewVideo.load(); } catch { /* ignore */ }
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl);
      state.videoUrl = null;
    }
    state.videoFile = null;
    state.videoReady = false;
    dom.playerCard.classList.remove('video-ready', 'is-playing', 'is-paused');
    document.body.classList.remove('is-playing');
    resetFpsProbe();
    setLoading(false);
  }

  function resetVideoUi() {
    resetVideoTimeline();
    setLoading(true, t('loading.openingVideo'));
    dom.playerCard.classList.remove('ui-idle', 'is-scrubbing');
    document.body.classList.remove('is-playing');
  }

  function loadVideo(file) {
    if (!file || !isVideoFile(file)) return;
    stopVideoSource();
    clearGallery();
    clearAudioTracks();
    state.videoFile = file;
    state.videoUrl = URL.createObjectURL(file);
    state.videoReady = false;
    state.originalEnabled = true;
    state.masterVolume = clamp(state.masterVolume, 0, 1);
    dom.video.src = state.videoUrl;
    dom.video.load();
    previewVideo.src = state.videoUrl;
    previewVideo.load();
    setMode('video');
    dom.video.loop = state.loop;
    setRate(1);
    setLoop(state.loop);
    resetFpsProbe();
    dom.fpsSelect.value = 'auto';
    updateFpsUi();
    renderTracks();
    updateVideoInfo();
    resetVideoUi();
    applyVolume();
    updatePlaybackState();
    analyzeEmbeddedAudio(file).catch(() => { /* fallback to native audio */ });
  }

  function handleVideoError() {
    if (!state.videoFile || state.mode !== 'video') return;
    const name = state.videoFile.name;
    state.videoFile = null;
    stopVideoSource();
    clearAudioTracks();
    setMode('empty');
    syncSidebar();
    toast(t('toast.videoOpenFailed', { name }), 4400);
  }

  // ── Images ────────────────────────────────────────────────
  function clearGallery() {
    state.imageItems.forEach((item) => {
      try { URL.revokeObjectURL(item.url); } catch { /* ignore */ }
    });
    state.imageItems = [];
    state.imageIndex = 0;
    dom.imageEl.removeAttribute('src');
    dom.imageAmbient.style.backgroundImage = 'none';
    dom.galleryGrid.replaceChildren();
    dom.galleryStrip.replaceChildren();
    dom.galleryNav.hidden = true;
    state.pointers.clear();
    state.pan = null;
    state.pinch = null;
    dom.imageViewport.classList.remove('dragging');
  }

  function makeThumb(item, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `gallery-thumb${index === state.imageIndex ? ' is-active' : ''}`;
    button.title = item.file.name;
    button.setAttribute('aria-label', t('gallery.open', { name: item.file.name }));
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = '';
    img.draggable = false;
    const badge = document.createElement('span');
    badge.className = 'thumb-index';
    badge.textContent = pad2(index + 1);
    button.append(img, badge);
    button.addEventListener('click', () => selectImage(index));
    return button;
  }

  function renderGallery() {
    const items = state.imageItems;
    dom.galleryGrid.replaceChildren();
    dom.galleryStrip.replaceChildren();
    items.forEach((item, index) => {
      dom.galleryGrid.append(makeThumb(item, index));
      dom.galleryStrip.append(makeThumb(item, index));
    });
    const count = items.length;
    dom.galleryCount.textContent = `${count} ${unit('file', count)}`;
    dom.galleryNav.hidden = count < 2;
    dom.imageCounter.textContent = `${count ? state.imageIndex + 1 : 0} / ${count}`;
  }

  function resetImageTransform() {
    state.imageScale = 1;
    state.imageX = 0;
    state.imageY = 0;
    state.pointers.clear();
    state.pan = null;
    state.pinch = null;
    dom.imageViewport.classList.remove('dragging');
    renderImageTransform();
  }

  function renderImageTransform() {
    const scale = clamp(state.imageScale, 1, 8);
    state.imageScale = scale;
    dom.imageEl.style.transform = `translate3d(${state.imageX}px, ${state.imageY}px, 0) scale(${scale})`;
    dom.playerCard.classList.toggle('is-zoomed', scale > 1.001);
    const percent = Math.round(scale * 100);
    dom.zoomValue.textContent = `${percent}%`;
    dom.zoomBadge.textContent = `${percent}%`;
    dom.zoomRange.value = String(percent);
    paintRange(dom.zoomRange, ((percent - 100) / 700) * 100);
  }

  function clampPan() {
    const vw = dom.imageViewport.clientWidth;
    const vh = dom.imageViewport.clientHeight;
    const baseW = dom.imageEl.offsetWidth || 0;
    const baseH = dom.imageEl.offsetHeight || 0;
    const maxX = Math.max(0, (baseW * state.imageScale - vw) / 2);
    const maxY = Math.max(0, (baseH * state.imageScale - vh) / 2);
    state.imageX = clamp(state.imageX, -maxX, maxX);
    state.imageY = clamp(state.imageY, -maxY, maxY);
  }

  function setImageScale(next, anchorX = 0, anchorY = 0) {
    const scale = clamp(next, 1, 8);
    const previous = state.imageScale;
    if (Math.abs(scale - previous) < 0.0001) return;
    const ratio = scale / previous;
    state.imageX = anchorX - (anchorX - state.imageX) * ratio;
    state.imageY = anchorY - (anchorY - state.imageY) * ratio;
    state.imageScale = scale;
    clampPan();
    renderImageTransform();
  }

  function zoomImageBy(factor) {
    setImageScale(state.imageScale * factor, 0, 0);
  }

  function actualSize() {
    const base = dom.imageEl.offsetWidth;
    if (!base || !dom.imageEl.naturalWidth) return;
    const target = dom.imageEl.naturalWidth / base;
    setImageScale(clamp(target, 1, 8), 0, 0);
    showChrome();
  }

  function selectImage(index) {
    if (index < 0 || index >= state.imageItems.length) return;
    state.imageIndex = index;
    const item = state.imageItems[index];
    dom.imageEl.src = item.url;
    dom.imageAmbient.style.backgroundImage = `url("${item.url}")`;
    resetImageTransform();
    updateImageInfo();
    renderGallery();
    dom.hoverLine.classList.remove('show');
    if (state.mode !== 'image') setMode('image');
  }

  function stepImage(direction) {
    if (state.mode !== 'image' || state.imageItems.length < 2) return;
    const count = state.imageItems.length;
    selectImage((state.imageIndex + direction + count) % count);
  }

  function openImages(files, append = false) {
    const valid = [...files].filter(isImageFile);
    if (!valid.length) return;
    if (!append) {
      stopVideoSource();
      clearAudioTracks();
      clearGallery();
    }
    const firstNew = state.imageItems.length;
    valid.forEach((file) => {
      state.imageItems.push({ file, url: URL.createObjectURL(file), w: 0, h: 0 });
    });
    setMode('image');
    selectImage(append ? firstNew : 0);
    setLoading(false);
    if (!append) toast(t('toast.imageTips'), 3400);
  }

  // ── Fullscreen / PiP ──────────────────────────────────────
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    // Fullscreen the whole document so the settings and tracks sheets,
    // which live outside the player card, stay visible and clickable.
    const target = document.documentElement;
    if (target.requestFullscreen) {
      target.requestFullscreen().catch(() => toast(t('toast.fullscreenUnavailable')));
    } else {
      toast(t('toast.fullscreenUnsupported'));
    }
  }

  async function togglePip() {
    if (state.mode !== 'video' || !state.videoReady) {
      toast(t('toast.openVideoFirst'));
      return;
    }
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await dom.video.requestPictureInPicture();
    } catch {
      toast(t('toast.pipUnavailable'));
    }
  }

  // ── Files ─────────────────────────────────────────────────
  function openMediaPicker() {
    dom.mediaInput.value = '';
    dom.mediaInput.click();
  }

  function openAudioPicker() {
    if (state.mode !== 'video') {
      toast(t('audio.openVideoFirst'));
      return;
    }
    dom.audioInput.value = '';
    dom.audioInput.click();
  }

  function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    const videos = [];
    const images = [];
    const audios = [];
    files.forEach((file) => {
      if (isVideoFile(file)) videos.push(file);
      else if (isImageFile(file)) images.push(file);
      else if (isAudioFile(file)) audios.push(file);
    });

    if (videos.length) {
      loadVideo(videos[0]);
      if (audios.length) addAudioTracks(audios);
      if (videos.length > 1) toast(t('toast.firstVideo'));
      return;
    }
    if (images.length) {
      openImages(images, state.mode === 'image');
      return;
    }
    if (audios.length) {
      if (state.mode === 'video') addAudioTracks(audios);
      else toast(t('audio.openVideoFirst'));
      return;
    }
    toast(t('toast.unsupportedFile'));
  }

  // ── Timeline pointer ──────────────────────────────────────
  function timeFromPointer(clientX) {
    const duration = Number.isFinite(dom.video.duration) ? dom.video.duration : 0;
    const rect = dom.timeline.getBoundingClientRect();
    if (!duration || rect.width <= 0) return 0;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * duration;
  }

  function onTimelineDown(event) {
    if (state.mode !== 'video' || !state.videoReady) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    try { dom.timeline.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    state.scrubbing = true;
    dom.playerCard.classList.add('is-scrubbing');
    dom.hoverLine.classList.remove('show');
    hidePreview();
    seekTo(timeFromPointer(event.clientX));
    clearTimeout(state.idleTimer);
  }

  function onTimelineMove(event) {
    if (state.mode !== 'video') return;
    if (state.scrubbing) {
      seekTo(timeFromPointer(event.clientX));
      return;
    }
    if (event.pointerType !== 'touch') updateHover(event);
  }

  function onTimelineUp() {
    if (!state.scrubbing) return;
    state.scrubbing = false;
    dom.playerCard.classList.remove('is-scrubbing');
    updateTimeline();
    syncAudioTracks(true);
    showChrome();
    hidePreview();
  }

  // ── Image gestures ────────────────────────────────────────
  function imageMidpoint() {
    const values = [...state.pointers.values()];
    if (values.length < 2) return null;
    return {
      x: (values[0].x + values[1].x) / 2,
      y: (values[0].y + values[1].y) / 2,
      dist: Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y),
    };
  }

  function onImagePointerDown(event) {
    if (state.mode !== 'image') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    try { dom.imageViewport.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.pointers.size === 1) {
      state.pan = { x: event.clientX, y: event.clientY, ox: state.imageX, oy: state.imageY };
      state.imageMoved = false;
      state.pinch = null;
    } else if (state.pointers.size === 2) {
      const info = imageMidpoint();
      if (info) {
        state.pinch = {
          dist: info.dist,
          mid: { x: info.x, y: info.y },
          scale: state.imageScale,
          ox: state.imageX,
          oy: state.imageY,
        };
        state.pan = null;
      }
    }
    dom.imageViewport.classList.add('dragging');
  }

  function onImagePointerMove(event) {
    if (state.mode !== 'image' || !state.pointers.has(event.pointerId)) return;
    event.preventDefault();
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (state.pointers.size === 1 && state.pan) {
      const dx = event.clientX - state.pan.x;
      const dy = event.clientY - state.pan.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.imageMoved = true;
      state.imageX = state.pan.ox + dx;
      state.imageY = state.pan.oy + dy;
      clampPan();
      renderImageTransform();
      return;
    }

    if (state.pointers.size === 2 && state.pinch) {
      const info = imageMidpoint();
      if (!info || state.pinch.dist < 1) return;
      const rect = dom.imageViewport.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startRelX = state.pinch.mid.x - centerX;
      const startRelY = state.pinch.mid.y - centerY;
      const imagePointX = (startRelX - state.pinch.ox) / state.pinch.scale;
      const imagePointY = (startRelY - state.pinch.oy) / state.pinch.scale;
      const nextScale = clamp(state.pinch.scale * (info.dist / state.pinch.dist), 1, 8);
      state.imageScale = nextScale;
      state.imageX = (info.x - centerX) - imagePointX * nextScale;
      state.imageY = (info.y - centerY) - imagePointY * nextScale;
      state.imageMoved = true;
      clampPan();
      renderImageTransform();
    }
  }

  function onImagePointerUp(event) {
    if (!state.pointers.has(event.pointerId)) return;
    state.pointers.delete(event.pointerId);
    if (state.pointers.size === 1) {
      const remaining = [...state.pointers.values()][0];
      state.pinch = null;
      state.pan = { x: remaining.x, y: remaining.y, ox: state.imageX, oy: state.imageY };
    } else if (state.pointers.size === 0) {
      state.pan = null;
      state.pinch = null;
      dom.imageViewport.classList.remove('dragging');
      showChrome();
    }
  }

  function onImageWheel(event) {
    if (state.mode !== 'image') return;
    event.preventDefault();
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    const factor = clamp(Math.exp(-delta * 0.0016), 0.72, 1.38);
    const rect = dom.imageViewport.getBoundingClientRect();
    const px = event.clientX - (rect.left + rect.width / 2);
    const py = event.clientY - (rect.top + rect.height / 2);
    setImageScale(state.imageScale * factor, px, py);
  }

  function onImageDoubleClick(event) {
    if (state.mode !== 'image') return;
    if (state.imageMoved) { state.imageMoved = false; return; }
    event.preventDefault();
    const rect = dom.imageViewport.getBoundingClientRect();
    const px = event.clientX - (rect.left + rect.width / 2);
    const py = event.clientY - (rect.top + rect.height / 2);
    if (state.imageScale > 1.02) setImageScale(1, px, py);
    else setImageScale(2.5, px, py);
  }

  // ── Bindings ──────────────────────────────────────────────
  function setSettingsExpanded(open) {
    [dom.settingsBtn, dom.settingsBtnImage, dom.settingsBtnEmpty].forEach((button) => {
      if (button) button.setAttribute('aria-expanded', String(open));
    });
  }

  function setTracksExpanded(open) {
    if (dom.tracksBtn) dom.tracksBtn.setAttribute('aria-expanded', String(open));
  }

  function openSettings(trigger) {
    if (state.settingsOpen) return;
    if (state.tracksOpen) closeTracks();
    state.settingsOpen = true;
    state.settingsTrigger = trigger || document.activeElement;
    closeSpeedPopover();
    dom.settingsBackdrop.classList.add('open');
    dom.settingsSheet.classList.add('open');
    dom.settingsSheet.removeAttribute('inert');
    dom.settingsSheet.setAttribute('aria-hidden', 'false');
    setSettingsExpanded(true);
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
    dom.playerCard.classList.remove('ui-idle');
    setTimeout(() => {
      if (state.settingsOpen) dom.settingsClose.focus({ preventScroll: true });
    }, 60);
  }

  function closeSettings() {
    if (!state.settingsOpen) return;
    state.settingsOpen = false;
    dom.settingsBackdrop.classList.remove('open');
    dom.settingsSheet.classList.remove('open');
    dom.settingsSheet.setAttribute('aria-hidden', 'true');
    dom.settingsSheet.setAttribute('inert', '');
    setSettingsExpanded(false);
    const trigger = state.settingsTrigger;
    state.settingsTrigger = null;
    if (trigger && typeof trigger.focus === 'function') trigger.focus({ preventScroll: true });
    showChrome();
  }

  function toggleSettings(trigger) {
    if (state.settingsOpen) closeSettings();
    else openSettings(trigger);
  }

  function openTracks(trigger) {
    if (state.mode !== 'video' || state.tracksOpen) return;
    if (state.settingsOpen) closeSettings();
    state.tracksOpen = true;
    state.tracksTrigger = trigger || dom.tracksBtn || document.activeElement;
    closeSpeedPopover();
    dom.tracksBackdrop.classList.add('open');
    dom.tracksSheet.classList.add('open');
    dom.tracksSheet.removeAttribute('inert');
    dom.tracksSheet.setAttribute('aria-hidden', 'false');
    setTracksExpanded(true);
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
    dom.playerCard.classList.remove('ui-idle');
    setTimeout(() => {
      if (state.tracksOpen) dom.tracksClose.focus({ preventScroll: true });
    }, 60);
  }

  function closeTracks(restoreFocus = true) {
    if (!state.tracksOpen) return;
    state.tracksOpen = false;
    dom.tracksBackdrop.classList.remove('open');
    dom.tracksSheet.classList.remove('open');
    dom.tracksSheet.setAttribute('aria-hidden', 'true');
    dom.tracksSheet.setAttribute('inert', '');
    setTracksExpanded(false);
    const trigger = state.tracksTrigger;
    state.tracksTrigger = null;
    if (restoreFocus && trigger && typeof trigger.focus === 'function') trigger.focus({ preventScroll: true });
    showChrome();
  }

  function toggleTracks(trigger) {
    if (state.tracksOpen) closeTracks();
    else openTracks(trigger);
  }

  function closeSpeedPopover() {
    dom.speedPopover.classList.remove('open');
    dom.speedBtn.setAttribute('aria-expanded', 'false');
    scheduleIdle();
  }

  function toggleSpeedPopover() {
    const open = !dom.speedPopover.classList.contains('open');
    dom.speedPopover.classList.toggle('open', open);
    dom.speedBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      clearTimeout(state.idleTimer);
      dom.playerCard.classList.remove('ui-idle');
    } else {
      scheduleIdle();
    }
  }

  dom.openMediaSheet.addEventListener('click', openMediaPicker);
  dom.emptyOpen.addEventListener('click', openMediaPicker);
  dom.addAudioTop.addEventListener('click', openAudioPicker);
  dom.addAudioBtn.addEventListener('click', openAudioPicker);
  dom.settingsBtn.addEventListener('click', () => toggleSettings(dom.settingsBtn));
  dom.settingsBtnImage.addEventListener('click', () => toggleSettings(dom.settingsBtnImage));
  dom.settingsBtnEmpty.addEventListener('click', () => toggleSettings(dom.settingsBtnEmpty));
  dom.settingsClose.addEventListener('click', closeSettings);
  dom.settingsBackdrop.addEventListener('click', closeSettings);
  dom.settingsSheet.addEventListener('click', (event) => {
    if (event.target === dom.settingsSheet) closeSettings();
  });
  dom.tracksBtn.addEventListener('click', () => toggleTracks(dom.tracksBtn));
  dom.toggleAllTracks.addEventListener('click', () => {
    const tracks = [...state.embeddedTracks.filter((track) => track.supported), ...state.audioTracks];
    const allOn = tracks.length > 0 && tracks.every((track) => track.enabled);
    setAllTracksEnabled(!allOn);
  });
  dom.languageSelect.addEventListener('change', () => setLanguage(dom.languageSelect.value, true));
  dom.tracksClose.addEventListener('click', () => closeTracks());
  dom.tracksBackdrop.addEventListener('click', () => closeTracks());
  dom.tracksSheet.addEventListener('click', (event) => {
    if (event.target === dom.tracksSheet) closeTracks();
  });
  dom.mediaInput.addEventListener('change', () => {
    const files = [...dom.mediaInput.files];
    dom.mediaInput.value = '';
    handleFiles(files);
  });
  dom.audioInput.addEventListener('change', () => {
    const files = [...dom.audioInput.files];
    dom.audioInput.value = '';
    if (files.length) addAudioTracks(files);
  });

  dom.playBtn.addEventListener('click', togglePlayback);
  dom.centerPlay.addEventListener('click', () => {
    showChrome();
    togglePlayback();
  });
  dom.back2.addEventListener('click', () => seekBy(-2));
  dom.fwd2.addEventListener('click', () => seekBy(2));
  dom.prevFrame.addEventListener('click', () => stepFrame(-1));
  dom.nextFrame.addEventListener('click', () => stepFrame(1));
  dom.muteBtn.addEventListener('click', toggleMute);
  dom.masterVolume.addEventListener('input', () => {
    state.masterVolume = clamp(Number(dom.masterVolume.value) / 100, 0, 1);
    if (state.masterVolume > 0) state.muted = false;
    applyVolume();
    showChrome();
  });
  dom.loopBtn.addEventListener('click', () => setLoop(!state.loop, true));
  dom.loopSwitch.addEventListener('click', () => setLoop(!state.loop, true));
  dom.pipBtn.addEventListener('click', togglePip);
  dom.fullscreenBtn.addEventListener('click', toggleFullscreen);

  dom.speedBtn.addEventListener('click', toggleSpeedPopover);
  dom.speedRange.addEventListener('input', () => setRate(Number(dom.speedRange.value) / 100));
  dom.speedChips.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-rate]');
    if (!button) return;
    setRate(parseFloat(button.dataset.rate), true);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!dom.speedPopover.classList.contains('open')) return;
    if (dom.speedPopover.contains(event.target) || dom.speedBtn.contains(event.target)) return;
    closeSpeedPopover();
  });

  dom.fpsSelect.addEventListener('change', () => {
    state.fpsOverride = dom.fpsSelect.value;
    updateFpsUi();
    const fps = getFps();
    toast(t('toast.speedStep', { fps: fmtFps(fps) }), 1800);
    if (state.fpsOverride === 'auto') startFpsProbe();
  });

  dom.timeline.addEventListener('pointerdown', onTimelineDown);
  dom.timeline.addEventListener('pointermove', onTimelineMove);
  dom.timeline.addEventListener('pointerup', onTimelineUp);
  dom.timeline.addEventListener('pointercancel', onTimelineUp);
  dom.timeline.addEventListener('pointerleave', () => {
    if (!state.scrubbing) hidePreview();
  });
  dom.timeline.addEventListener('pointerenter', (event) => {
    if (state.mode === 'video' && state.videoReady && event.pointerType !== 'touch') updateHover(event);
  });

  dom.imageViewport.addEventListener('pointerdown', onImagePointerDown);
  dom.imageViewport.addEventListener('pointermove', onImagePointerMove);
  dom.imageViewport.addEventListener('pointerup', onImagePointerUp);
  dom.imageViewport.addEventListener('pointercancel', onImagePointerUp);
  dom.imageViewport.addEventListener('wheel', onImageWheel, { passive: false });
  dom.imageViewport.addEventListener('dblclick', onImageDoubleClick);
  dom.imageEl.addEventListener('dragstart', (event) => event.preventDefault());
  dom.zoomIn.addEventListener('click', () => zoomImageBy(1.35));
  dom.zoomOut.addEventListener('click', () => zoomImageBy(1 / 1.35));
  dom.zoomRange.addEventListener('input', () => setImageScale(Number(dom.zoomRange.value) / 100, 0, 0));
  dom.fitBtn.addEventListener('click', () => resetImageTransform());
  dom.actualBtn.addEventListener('click', actualSize);
  dom.prevImage.addEventListener('click', () => stepImage(-1));
  dom.nextImage.addEventListener('click', () => stepImage(1));

  dom.imageEl.addEventListener('load', () => {
    if (state.mode !== 'image') return;
    const item = state.imageItems[state.imageIndex];
    if (!item || dom.imageEl.getAttribute('src') !== item.url) return;
    item.w = dom.imageEl.naturalWidth;
    item.h = dom.imageEl.naturalHeight;
    updateImageInfo();
    clampPan();
    renderImageTransform();
  });
  dom.imageEl.addEventListener('error', () => {
    if (state.mode !== 'image') return;
    toast(t('toast.imageOpenFailed'), 3600);
  });

  dom.video.addEventListener('loadedmetadata', () => {
    if (!state.videoFile || state.mode !== 'video') return;
    state.videoReady = true;
    dom.playerCard.classList.add('video-ready');
    updateVideoInfo();
    updateTimeline();
    updateBuffered();
    updatePlaybackState();
  });
  dom.video.addEventListener('loadeddata', () => {
    if (state.mode !== 'video') return;
    setLoading(false);
    updatePlaybackState();
  });
  dom.video.addEventListener('canplay', () => {
    if (state.mode !== 'video') return;
    setLoading(false);
  });
  dom.video.addEventListener('play', () => {
    updatePlaybackState();
    startTick();
    startFpsProbe();
    syncAudioTracks(true);
    showChrome();
  });
  dom.video.addEventListener('playing', () => {
    setLoading(false);
    updatePlaybackState();
    startTick();
    startFpsProbe();
  });
  dom.video.addEventListener('pause', () => {
    updatePlaybackState();
    syncAudioTracks(true);
    finishFpsProbe();
    setLoading(false);
  });
  dom.video.addEventListener('ended', () => {
    updatePlaybackState();
    syncAudioTracks(true);
  });
  dom.video.addEventListener('waiting', () => {
    if (state.mode === 'video' && !dom.video.paused) setLoading(true, t('loading.buffering'));
  });
  dom.video.addEventListener('timeupdate', () => {
    updateTimeline();
    if (!dom.video.paused && performance.now() - state.lastAudioSync > 900) {
      state.lastAudioSync = performance.now();
      syncAudioTracks(false);
    }
  });
  dom.video.addEventListener('seeked', () => {
    updateTimeline();
    updateBuffered();
    syncAudioTracks(true);
  });
  dom.video.addEventListener('durationchange', () => {
    updateTimeline();
    updateBuffered();
    updateVideoInfo();
  });
  dom.video.addEventListener('progress', updateBuffered);
  dom.video.addEventListener('ratechange', () => {
    allAudioTracks().forEach((track) => { if (track.el) track.el.playbackRate = dom.video.playbackRate; });
  });
  dom.video.addEventListener('error', handleVideoError);
  dom.video.addEventListener('enterpictureinpicture', () => dom.pipBtn.classList.add('pip-active'));
  dom.video.addEventListener('leavepictureinpicture', () => dom.pipBtn.classList.remove('pip-active'));

  dom.video.addEventListener('click', () => {
    if (state.mode !== 'video') return;
    if (videoClickTimer) {
      clearTimeout(videoClickTimer);
      videoClickTimer = null;
      toggleFullscreen();
      return;
    }
    videoClickTimer = setTimeout(() => {
      videoClickTimer = null;
      if (dom.playerCard.classList.contains('ui-idle')) {
        showChrome();
        return;
      }
      togglePlayback();
    }, 190);
  });

  dom.stage.addEventListener('pointermove', () => {
    if (state.mode === 'image') showChrome();
    else if (state.mode === 'video' && !dom.video.paused) showChrome();
  });
  dom.stage.addEventListener('pointerleave', () => {
    if (state.mode !== 'video' && state.mode !== 'image') return;
    if (state.mode === 'video' && (dom.video.paused || state.scrubbing)) return;
    if (dom.speedPopover.classList.contains('open')) return;
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => {
      if (!state.scrubbing && !dom.speedPopover.classList.contains('open') && canAutoHide()) {
        dom.playerCard.classList.add('ui-idle');
      }
    }, 1100);
  });

  dom.stage.querySelectorAll('.controls').forEach((panel) => {
    panel.addEventListener('pointerenter', () => {
      state.chromeHover = true;
      clearTimeout(state.idleTimer);
      state.idleTimer = null;
      dom.playerCard.classList.remove('ui-idle');
    });
    panel.addEventListener('pointerleave', () => {
      state.chromeHover = false;
      scheduleIdle();
    });
  });

  document.addEventListener('fullscreenchange', () => {
    requestAnimationFrame(() => {
      if (state.mode === 'image') {
        clampPan();
        renderImageTransform();
      }
      showChrome();
    });
  });

  let dragDepth = 0;
  window.addEventListener('dragenter', (event) => {
    if (!event.dataTransfer || ![...event.dataTransfer.types].includes('Files')) return;
    event.preventDefault();
    dragDepth += 1;
    dom.dropVeil.classList.add('show');
  });
  window.addEventListener('dragover', (event) => {
    if (event.dataTransfer && [...event.dataTransfer.types].includes('Files')) event.preventDefault();
  });
  window.addEventListener('dragleave', (event) => {
    if (!event.dataTransfer) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dom.dropVeil.classList.remove('show');
  });
  window.addEventListener('drop', (event) => {
    event.preventDefault();
    dragDepth = 0;
    dom.dropVeil.classList.remove('show');
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length) {
      handleFiles(event.dataTransfer.files);
    }
  });

  // ── Keyboard ──────────────────────────────────────────────
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const tag = target && target.tagName ? target.tagName : '';
    if (event.key === 'Escape' && state.settingsOpen) {
      event.preventDefault();
      closeSettings();
      return;
    }
    if (event.key === 'Escape' && state.tracksOpen) {
      event.preventDefault();
      closeTracks();
      return;
    }
    if (target && (target.isContentEditable || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')) return;
    if (event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    let code = event.code || '';
    const rawKey = event.key || '';
    const lowerKey = rawKey.toLowerCase();
    if (!code) {
      const fallback = {
        ' ': 'Space',
        'spacebar': 'Space',
        'arrowleft': 'ArrowLeft',
        'arrowright': 'ArrowRight',
        'arrowup': 'ArrowUp',
        'arrowdown': 'ArrowDown',
        'escape': 'Escape',
        'home': 'Home',
        'end': 'End',
        ',': 'Comma',
        '.': 'Period',
        '[': 'BracketLeft',
        ']': 'BracketRight',
        '=': 'Equal',
        '+': 'NumpadAdd',
        '-': 'Minus',
        '_': 'Minus',
        '0': 'Digit0',
        'o': 'KeyO',
        'a': 'KeyA',
        'f': 'KeyF',
        'm': 'KeyM',
        'l': 'KeyL',
        'p': 'KeyP',
        'k': 'KeyK',
        's': 'KeyS',
        't': 'KeyT',
      };
      if (fallback[lowerKey]) code = fallback[lowerKey];
    }

    if (code === 'Escape') {
      closeSpeedPopover();
      hidePreview();
      return;
    }
    if (code === 'KeyS') {
      if (event.repeat) return;
      event.preventDefault();
      toggleSettings(document.activeElement);
      return;
    }
    if (code === 'KeyT') {
      if (event.repeat) return;
      event.preventDefault();
      toggleTracks(document.activeElement);
      return;
    }
    if (state.settingsOpen || state.tracksOpen) return;
    if (code === 'KeyO') {
      if (event.repeat) return;
      event.preventDefault();
      openMediaPicker();
      return;
    }
    if (code === 'KeyA') {
      if (event.repeat) return;
      event.preventDefault();
      openAudioPicker();
      return;
    }
    if (code === 'KeyF') {
      event.preventDefault();
      toggleFullscreen();
      return;
    }

    if ((code === 'Space' || code === 'KeyK') && !(target && target.closest && target.closest('button, a, summary'))) {
      if (state.mode === 'video') {
        event.preventDefault();
        togglePlayback();
      }
      return;
    }

    if (code === 'ArrowLeft' || code === 'ArrowRight') {
      const direction = code === 'ArrowRight' ? 1 : -1;
      if (state.mode === 'video') {
        event.preventDefault();
        if (event.shiftKey) stepFrame(direction);
        else seekBy(direction * 2);
      } else if (state.mode === 'image') {
        event.preventDefault();
        stepImage(direction);
      }
      return;
    }

    if (state.mode === 'video') {
      switch (code) {
        case 'Comma': event.preventDefault(); stepFrame(-1); return;
        case 'Period': event.preventDefault(); stepFrame(1); return;
        case 'BracketLeft': event.preventDefault(); adjustRate(-1); return;
        case 'BracketRight': event.preventDefault(); adjustRate(1); return;
        case 'ArrowUp':
          event.preventDefault();
          state.masterVolume = clamp(state.masterVolume + 0.05, 0, 1);
          state.muted = false;
          applyVolume();
          showChrome();
          return;
        case 'ArrowDown':
          event.preventDefault();
          state.masterVolume = clamp(state.masterVolume - 0.05, 0, 1);
          applyVolume();
          showChrome();
          return;
        case 'KeyM': event.preventDefault(); toggleMute(); return;
        case 'KeyL': event.preventDefault(); setLoop(!state.loop, true); return;
        case 'KeyP': event.preventDefault(); togglePip(); return;
        case 'Home': event.preventDefault(); seekTo(0); showChrome(); return;
        case 'End': event.preventDefault(); seekTo(dom.video.duration || 0); showChrome(); return;
        default: break;
      }
    }

    if (state.mode === 'image') {
      if (code === 'Equal' || code === 'NumpadAdd') {
        event.preventDefault();
        zoomImageBy(1.35);
      } else if (code === 'Minus' || code === 'NumpadSubtract') {
        event.preventDefault();
        zoomImageBy(1 / 1.35);
      } else if (code === 'Digit0' || code === 'Numpad0') {
        event.preventDefault();
        resetImageTransform();
      }
    }
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      if (state.mode !== 'image') return;
      clampPan();
      renderImageTransform();
    });
    observer.observe(dom.imageViewport);
  }
  window.addEventListener('resize', () => {
    if (state.mode !== 'image') return;
    clampPan();
    renderImageTransform();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    updateTimeline();
    syncAudioTracks(false);
  });
  window.addEventListener('pagehide', () => {
    try { dom.video.pause(); } catch { /* ignore */ }
    allAudioTracks().forEach((track) => { if (track.el) { try { track.el.pause(); } catch { /* ignore */ } } });
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    allAudioTracks().forEach((track) => { if (track.url) URL.revokeObjectURL(track.url); });
    state.imageItems.forEach((item) => URL.revokeObjectURL(item.url));
  });

  // ── Desktop launch ────────────────────────────────────────
  async function openDesktopFile() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    const openUrl = params.get('open');
    if (!openUrl) return;
    const name = params.get('name') || 'video.mp4';

    setLoading(true, t('loading.openingFile'));
    try {
      const response = await fetch(openUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], name, { type: blob.type || '' });
      handleFiles([file]);
    } catch (error) {
      setLoading(false);
      toast(t('toast.desktopOpenFailed', { message: (error && error.message ? error.message : t('error.read')) }), 6000);
    } finally {
      if (state.mode === 'empty') setLoading(false);
      try {
        history.replaceState(null, '', window.location.pathname);
      } catch { /* ignore */ }
    }
  }

  // ── Language ──────────────────────────────────────────────
  function readStoredLanguage() {
    try {
      const value = window.localStorage.getItem('deplay.lang');
      return value ? i18n.normalize(value) : null;
    } catch {
      return null;
    }
  }

  function readUrlLanguage() {
    try {
      const value = new URLSearchParams(window.location.search).get('lang');
      return value ? i18n.normalize(value) : null;
    } catch {
      return null;
    }
  }

  function persistLanguage(code) {
    try { window.localStorage.setItem('deplay.lang', code); } catch { /* ignore */ }
    try {
      if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function') {
        window.chrome.webview.postMessage(`deplay:language:${code}`);
      }
    } catch { /* host messaging is optional */ }
  }

  function refreshEmbeddedTexts() {
    state.embeddedTracks.forEach((track) => {
      track.title = languageTitle(track, track.index - 1);
      const codec = codecInfo(track.codec);
      track.reason = codec.reason || '';
    });
  }

  function refreshLocalizedUi() {
    setRate(state.rate);
    setLoop(state.loop);
    updateFpsUi();
    syncSidebar();
    refreshInfo();
    refreshEmbeddedTexts();
    renderTracks();
    if (state.mode === 'image') renderGallery();
    updatePlaybackState();
    updateTimeline();
    updateToggleAllTracks();
    if (state.mode === 'video' && !state.videoReady && !dom.loading.hidden) {
      setLoading(true, t('loading.openingVideo'));
    }
  }

  function setLanguage(next, persist = true) {
    const code = i18n ? i18n.normalize(next) : 'ru';
    lang = code;
    if (i18n) i18n.translateDocument(document, code);
    document.documentElement.lang = code;
    document.title = t('app.title');
    if (dom.languageSelect) dom.languageSelect.value = code;
    if (persist) persistLanguage(code);
    refreshLocalizedUi();
  }

  function initLanguage() {
    const urlLanguage = readUrlLanguage();
    const stored = readStoredLanguage();
    setLanguage(urlLanguage || stored || 'ru', Boolean(urlLanguage));
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    if (!document.pictureInPictureEnabled || typeof dom.video.requestPictureInPicture !== 'function') {
      dom.pipBtn.hidden = true;
    }
    dom.video.volume = state.masterVolume;
    dom.video.loop = false;
    setRate(1);
    setLoop(false);
    applyVolume();
    updateFpsUi();
    resetImageTransform();
    setLoading(false);
    resetVideoTimeline();
    setMode('empty');
    syncSidebar();
    updatePlaybackState();
  }

  init();
  initLanguage();
  openDesktopFile();
})();
