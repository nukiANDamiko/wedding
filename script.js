/* =========================================================
   ნუკა & ამიკო · 01.10.2026
   countdown · music · scroll reveal · background video
   ========================================================= */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     COUNTDOWN
     The target carries the Georgian offset (+04:00), so the
     count is right from any timezone.
     --------------------------------------------------------- */
  function initCountdown() {
    var grid = document.getElementById("countdown");
    var message = document.getElementById("countdownMessage");
    if (!grid || !message) return;

    var target = new Date(grid.dataset.target);
    if (isNaN(target.getTime())) return;

    /* the wedding day itself, midnight to midnight in Georgian time
       (Georgia keeps UTC+4 all year, so a fixed offset is exact) */
    var GEORGIA_OFFSET = 4 * 60 * 60 * 1000;
    var asGeorgian = new Date(target.getTime() + GEORGIA_OFFSET);
    var dayStart = new Date(Date.UTC(
      asGeorgian.getUTCFullYear(),
      asGeorgian.getUTCMonth(),
      asGeorgian.getUTCDate()
    ) - GEORGIA_OFFSET);
    var dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    var fields = {
      days: grid.querySelector('[data-countdown="days"]'),
      hours: grid.querySelector('[data-countdown="hours"]'),
      minutes: grid.querySelector('[data-countdown="minutes"]')
    };

    function showMessage(text) {
      grid.hidden = true;
      message.textContent = text;
      message.hidden = false;
    }

    function render() {
      var now = Date.now();

      if (now >= dayEnd.getTime()) {
        showMessage("ჩვენი დღე უკვე შედგა ♡");
        return false;
      }

      if (now >= dayStart.getTime()) {
        showMessage("დღეს ჩვენი დღეა ♡");
        return false;
      }

      var totalMinutes = Math.floor((target.getTime() - now) / 60000);
      fields.days.textContent = Math.floor(totalMinutes / 1440);
      fields.hours.textContent = Math.floor((totalMinutes % 1440) / 60);
      fields.minutes.textContent = totalMinutes % 60;
      return true;
    }

    if (render()) {
      var timer = window.setInterval(function () {
        if (!render()) window.clearInterval(timer);
      }, 20000);
    }
  }

  /* ---------------------------------------------------------
     MUSIC
     Tries to start on load. Browsers that refuse audio without
     a gesture (iOS Safari in particular) get a second chance on
     the visitor's first tap, scroll or key press — the listeners
     drop away as soon as the track is going. Scrolling never
     restarts it, and the small control can always override.
     --------------------------------------------------------- */
  function initMusic() {
    var button = document.getElementById("musicToggle");
    var label = document.getElementById("musicLabel");
    var audio = document.getElementById("music");
    if (!button || !label || !audio) return;

    var TARGET_VOLUME = 0.35;
    var GESTURES = ["pointerdown", "touchstart", "keydown", "scroll"];
    var fade = null;
    var armed = false;
    var stoppedByVisitor = false;

    function setState(playing) {
      button.setAttribute("aria-pressed", playing ? "true" : "false");
      button.setAttribute(
        "aria-label",
        playing ? "ფონური მუსიკის გამორთვა" : "ფონური მუსიკის ჩართვა"
      );
      label.textContent = playing ? "მუსიკის გამორთვა" : "მუსიკის ჩართვა";
    }

    function fadeTo(to, done) {
      var step = 0.035;
      window.clearInterval(fade);
      fade = window.setInterval(function () {
        var distance = to - audio.volume;
        if (Math.abs(distance) <= step) {
          audio.volume = to;
          window.clearInterval(fade);
          if (done) done();
          return;
        }
        audio.volume = Math.min(1, Math.max(0, audio.volume + (distance > 0 ? step : -step)));
      }, 60);
    }

    /* returns a promise that never rejects — an autoplay refusal is
       an expected outcome here, not an error to log */
    function start() {
      if (!audio.paused) return Promise.resolve(true);
      audio.volume = 0;
      var attempt = audio.play();
      if (!attempt || typeof attempt.then !== "function") {
        fadeTo(TARGET_VOLUME);
        return Promise.resolve(true);
      }
      return attempt.then(function () {
        fadeTo(TARGET_VOLUME);
        return true;
      }).catch(function () {
        return false;
      });
    }

    function onFirstGesture(event) {
      /* if the visitor's first move is the control itself, let the
         button handle it — otherwise the two fight over play/pause */
      var fromButton =
        event && event.target && typeof event.target.closest === "function" &&
        event.target.closest("#musicToggle");

      disarm();
      if (fromButton || stoppedByVisitor) return;

      /* some browsers refuse on pointerdown but allow on click — if this
         attempt is turned down, listen again for the next move */
      start().then(function (playing) {
        if (!playing && !stoppedByVisitor) arm();
      });
    }

    function arm() {
      if (armed || stoppedByVisitor) return;
      armed = true;
      GESTURES.forEach(function (type) {
        document.addEventListener(type, onFirstGesture, { passive: true, capture: true });
      });
    }

    function disarm() {
      if (!armed) return;
      armed = false;
      GESTURES.forEach(function (type) {
        document.removeEventListener(type, onFirstGesture, { capture: true });
      });
    }

    button.addEventListener("click", function () {
      if (audio.paused) {
        stoppedByVisitor = false;
        disarm();
        start();
      } else {
        stoppedByVisitor = true;
        disarm();
        fadeTo(0, function () { audio.pause(); });
      }
    });

    audio.addEventListener("play", function () { setState(true); disarm(); });
    audio.addEventListener("pause", function () { setState(false); });

    setState(false);

    start().then(function (playing) {
      if (!playing) arm();
    });
  }

  /* ---------------------------------------------------------
     SCROLL REVEAL
     --------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (item) { item.classList.add("is-visible"); });
      return;
    }

    /* the collage fades in one photo after another */
    document.querySelectorAll(".collage .shot").forEach(function (shot, index) {
      shot.style.setProperty("--d", index * 90 + "ms");
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    items.forEach(function (item) { observer.observe(item); });
  }

  /* ---------------------------------------------------------
     BACKGROUND VIDEO
     Muted autoplay while the stage is on screen, paused when it
     is not. If the file cannot be decoded at all, the stage falls
     back to a warm wash so the text over it stays readable.
     --------------------------------------------------------- */
  function initStageVideo() {
    var video = document.getElementById("stageVideo");
    var stage = document.getElementById("stage");
    if (!video || !stage) return;

    video.muted = true; // iOS refuses to autoplay without this set as a property
    video.setAttribute("muted", "");

    function fallBack() {
      stage.classList.add("stage--no-video");
      video.hidden = true;
    }

    video.addEventListener("error", fallBack);
    video.querySelectorAll("source").forEach(function (source) {
      source.addEventListener("error", fallBack);
    });

    /* a file the browser cannot decode reports no dimensions */
    video.addEventListener("loadeddata", function () {
      if (!video.videoWidth) fallBack();
    });

    function tryPlay() {
      var attempt = video.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.catch(function () { /* blocked — the stage still reads fine */ });
      }
    }

    if (!("IntersectionObserver" in window)) {
      tryPlay();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tryPlay();
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0 });

    observer.observe(stage);
  }

  /* --------------------------------------------------------- */
  function init() {
    initCountdown();
    initMusic();
    initReveal();
    initStageVideo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
