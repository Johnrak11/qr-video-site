/* Player logic: supports YouTube, Vimeo, direct MP4 via ?video=... */
(function() {
  const qs = new URLSearchParams(location.search);
  const videoURL = qs.get("video");

  const container = document.getElementById("player-container");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");

  if (!videoURL) {
    container.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:white;padding:24px;text-align:center">
      <div>
        <h1>No video specified</h1>
        <p>Append <code>?video=&lt;URL&gt;</code> with a YouTube/Vimeo/direct MP4 link.</p>
        <p>Examples:</p>
        <code>?video=https://youtu.be/VIDEO_ID</code><br/>
        <code>?video=https://vimeo.com/123456789</code><br/>
        <code>?video=https://example.com/clip.mp4</code>
      </div>
    </div>`;
    return;
  }

  function isYouTube(url) {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
  }
  function isVimeo(url) {
    return /^(https?:\/\/)?(www\.)?vimeo\.com\//i.test(url);
  }
  function getYouTubeId(url) {
    try {
      // Support youtu.be/ID and youtube.com/watch?v=ID and other formats
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        return u.pathname.replace("/", "");
      }
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      // /embed/ID or /shorts/ID
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex(p => p === "embed" || p === "shorts" || p === "live");
      if (idx >= 0 && parts[idx+1]) return parts[idx+1];
      // last fallback: last segment
      return parts.pop();
    } catch { return null; }
  }
  function getVimeoId(url) {
    try {
      const u = new URL(url);
      // URLs may look like /manage/videos/ID or /ID
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex(p => p === "videos" || p === "manage");
      if (idx >= 0) {
        // if .../manage/videos/123456789
        const last = parts[parts.length - 1];
        if (/^\d+$/.test(last)) return last;
      }
      // Plain vimeo.com/123456789
      const last = parts[parts.length - 1];
      if (/^\d+$/.test(last)) return last;
      return null;
    } catch { return null; }
  }

  function buildYouTubeEmbed(id) {
    const params = new URLSearchParams({
      autoplay: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      mute: "1" // improves autoplay reliability on mobile
    });
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  }
  function buildVimeoEmbed(id) {
    const params = new URLSearchParams({
      autoplay: "1",
      muted: "1",
      autopause: "0",
      playsinline: "1",
      title: "0",
      byline: "0",
      portrait: "0"
    });
    return `https://player.vimeo.com/video/${id}?${params.toString()}`;
  }

  function renderIframe(src) {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; accelerometer; gyroscope");
    iframe.setAttribute("allowfullscreen", "true");
    iframe.className = "player-container";
    container.appendChild(iframe);
    return iframe;
  }

  function renderVideo(mp4) {
    const video = document.createElement("video");
    video.src = mp4;
    video.autoplay = true;
    video.muted = true; // required for mobile autoplay
    video.playsInline = true;
    video.controls = true;
    video.className = "player-container";
    container.appendChild(video);
    return video;
  }

  async function tryFullscreenAndLandscape(el) {
    try {
      if (document.fullscreenElement == null && el.requestFullscreen) {
        await el.requestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (e) {
      // Often requires user gesture on iOS/Safari; ignore error and show overlay on failure
      console.debug("Fullscreen/orientation lock failed:", e);
    }
  }

  function showOverlay(startFn) {
    overlay.classList.remove("hidden");
    function handler() {
      overlay.classList.add("hidden");
      startFn();
      startBtn.removeEventListener("click", handler);
      overlay.removeEventListener("click", handler);
    }
    startBtn.addEventListener("click", handler);
    overlay.addEventListener("click", handler);
  }

  (async () => {
    let el;
    if (isYouTube(videoURL)) {
      const id = getYouTubeId(videoURL);
      if (!id) {
        container.textContent = "Could not extract YouTube video ID.";
        return;
      }
      el = renderIframe(buildYouTubeEmbed(id));
    } else if (isVimeo(videoURL)) {
      const id = getVimeoId(videoURL);
      if (!id) {
        container.textContent = "Could not extract Vimeo video ID.";
        return;
      }
      el = renderIframe(buildVimeoEmbed(id));
    } else {
      // assume direct mp4
      el = renderVideo(videoURL);
      // try to start playback programmatically (some browsers need this)
      el.play().catch(() => {});
    }

    // Try fullscreen + landscape immediately (best case on Android/Chrome)
    tryFullscreenAndLandscape(document.documentElement);

    // If autoplay stalls (common on iOS), show overlay
    // We'll check after a short delay whether anything is playing
    setTimeout(async () => {
      let isPlaying = false;
      try {
        if (el.tagName === "VIDEO") {
          isPlaying = !el.paused && !el.ended && el.currentTime > 0;
        } else {
          // For iframes we can't directly detect play state; assume failure if document stays visible and no fullscreen
          isPlaying = !!document.fullscreenElement;
        }
      } catch {}
      if (!isPlaying) {
        showOverlay(() => {
          if (el.tagName === "VIDEO") {
            el.play().catch(()=>{});
            tryFullscreenAndLandscape(el);
          } else {
            tryFullscreenAndLandscape(document.documentElement);
          }
        });
      }
    }, 800);
  })();
})();
