window.addEventListener("load", () => {
  navigator.serviceWorker.register("../sw.js?v=6-17-2024", { scope: "/a/" });
  const form = document.getElementById("fs");
  const input = document.getElementById("is");
  // Keyword shortcuts - type these to go directly to pages
  const shortcuts = {
    'home': '/',
    'games': '/gm',
    'game': '/gm',
    'apps': '/as',
    'app': '/as',
    'settings': '/st',
    'setting': '/st',
    'tabs': '/ta',
    'tab': '/ta',
    'browser': '/ta',
    'tools': '/ts',
    'tool': '/ts'
  };

  if (form && input) {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const formValue = input.value.trim();
      
      // Check for keyword shortcuts first
      if (shortcuts[formValue.toLowerCase()]) {
        window.location.href = shortcuts[formValue.toLowerCase()];
        return;
      }
      
      const url = isUrl(formValue)
        ? prependHttps(formValue)
        : `https://duckduckgo.com/?q=${formValue}`;
      processUrl(url);
    });
  }
  function processUrl(url) {
    // Check if YouTube/Google - show error immediately
    if (isYouTubeOrGoogle(url)) {
      const iframeContainer = document.getElementById("iframe-container");
      const activeIframe = Array.from(iframeContainer.querySelectorAll("iframe")).find(
        iframe => iframe.classList.contains("active"),
      );
      const activeTab = document.querySelector("#tab-list li.active");
      const tabTitle = activeTab ? activeTab.querySelector(".tab-title") : null;
      if (activeIframe && tabTitle) {
        showYouTubeError(activeIframe, tabTitle);
        input.value = "";
        return;
      }
    }
    
    sessionStorage.setItem("GoUrl", __uv$config.encodeUrl(url));
    const iframeContainer = document.getElementById("iframe-container");
    const activeIframe = Array.from(iframeContainer.querySelectorAll("iframe")).find(
      iframe => iframe.classList.contains("active"),
    );
    activeIframe.src = `/a/${__uv$config.encodeUrl(url)}`;
    activeIframe.dataset.tabUrl = url;
    input.value = url;
    console.log(activeIframe.dataset.tabUrl);
  }
  function isUrl(val = "") {
    if (
      /^http(s?):\/\//.test(val) ||
      (val.includes(".") && val.substr(0, 1) !== " ")
    ) {
      return true;
    }
    return false;
  }
  function prependHttps(url) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `https://${url}`;
    }
    return url;
  }
});
document.addEventListener("DOMContentLoaded", event => {
  const addTabButton = document.getElementById("add-tab");
  const tabList = document.getElementById("tab-list");
  const iframeContainer = document.getElementById("iframe-container");
  let tabCounter = 1;
  addTabButton.addEventListener("click", () => {
    createNewTab();
    Load();
  });
  function createNewTab() {
    const newTab = document.createElement("li");
    const tabTitle = document.createElement("span");
    const newIframe = document.createElement("iframe");
    // CRITICAL FIX: Remove sandbox entirely for game sites to allow nested iframes
    // CrazyGames games load in nested iframes that need full access
    // Sandbox restrictions prevent nested iframes from loading properly
    // Note: This is necessary for CrazyGames/Poki games to work
    // Check if this is a game site - if so, remove sandbox completely
    const checkGameSite = () => {
      try {
        const goUrl = sessionStorage.getItem("GoUrl");
        const url = sessionStorage.getItem("URL");
        const checkUrl = (goUrl || url || "").toLowerCase();
        // Decode if it's encoded
        let decodedUrl = checkUrl;
        try {
          if (checkUrl.includes("/a/")) {
            decodedUrl = decodeURIComponent(checkUrl);
          }
        } catch (e) {
          // Ignore decode errors
        }
        return decodedUrl.includes("crazygames") || 
               decodedUrl.includes("poki") || 
               decodedUrl.includes("game") ||
               decodedUrl.includes("play") ||
               decodedUrl.includes("html5.gamedistribution.com") ||
               decodedUrl.includes("cdn.crazygames.com");
      } catch (e) {
        return false;
      }
    };
    
    // Only apply sandbox for non-game sites (security)
    // For game sites, NO SANDBOX = allows nested iframes to work
    if (!checkGameSite()) {
      newIframe.sandbox =
        "allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-modals allow-orientation-lock allow-popups allow-popups-to-escape-sandbox allow-downloads allow-presentation allow-top-navigation-by-user-activation allow-top-navigation";
    }
    // For game sites: no sandbox attribute = full access for nested game iframes
    
    newIframe.allow = "fullscreen; microphone; camera; autoplay; encrypted-media; picture-in-picture; geolocation; payment; usb; xr-spatial-tracking";
    newIframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    newIframe.setAttribute("loading", "eager"); // Load immediately for games
    newIframe.setAttribute("allowfullscreen", "true");
    newIframe.setAttribute("webkitallowfullscreen", "true");
    newIframe.setAttribute("mozallowfullscreen", "true");
    // When Top Navigation is not allowed links with the "top" value will be entirely blocked, if we allow Top Navigation it will overwrite the tab, which is obviously not wanted.
    tabTitle.textContent = `New Tab ${tabCounter}`;
    tabTitle.className = "tab-title";
    newTab.dataset.tabId = tabCounter;
    newTab.addEventListener("click", switchTab);
    newTab.setAttribute("draggable", true);
    const closeButton = document.createElement("button");
    closeButton.classList.add("close-tab");
    closeButton.innerHTML = "&#10005;";
    closeButton.addEventListener("click", closeTab);
    newTab.appendChild(tabTitle);
    newTab.appendChild(closeButton);
    tabList.appendChild(newTab);
    const allTabs = Array.from(tabList.querySelectorAll("li"));
    for (const tab of allTabs) {
      tab.classList.remove("active");
    }
    const allIframes = Array.from(iframeContainer.querySelectorAll("iframe"));
    for (const iframe of allIframes) {
      iframe.classList.remove("active");
    }
    newTab.classList.add("active");
    newIframe.dataset.tabId = tabCounter;
    newIframe.classList.add("active");
    // Timeout check - if iframe doesn't load in 15 seconds, show error (increased for game sites)
    let loadTimeout;
    let hasLoaded = false;
    
    const handleLoad = () => {
      if (hasLoaded) return;
      hasLoaded = true;
      clearTimeout(loadTimeout);
      
      try {
        const title = newIframe.contentDocument?.title || "";
        if (title.length <= 1) {
          tabTitle.textContent = "";
        } else {
          tabTitle.textContent = title;
        }
        if (newIframe.contentWindow) {
          newIframe.contentWindow.open = url => {
            sessionStorage.setItem("URL", `/a/${__uv$config.encodeUrl(url)}`);
            createNewTab();
            return null;
          };
        }
        if (newIframe.contentDocument?.documentElement?.outerHTML?.trim().length > 0) {
          Load();
        }
        Load();
      } catch (e) {
        // Cross-origin - this is normal for proxied sites, don't show error
        // Only show error if it's actually a failure
        console.log("Cross-origin iframe (normal for proxied sites)");
      }
    };
    
    // Check if this is a game site to disable error detection
    const isGameSiteUrl = (url) => {
      try {
        const urlLower = (url || "").toLowerCase();
        let decodedUrl = urlLower;
        try {
          if (urlLower.includes("/a/")) {
            decodedUrl = decodeURIComponent(urlLower);
          }
        } catch (e) {}
        return decodedUrl.includes("crazygames") || 
               decodedUrl.includes("poki") || 
               decodedUrl.includes("html5.gamedistribution.com") ||
               decodedUrl.includes("cdn.crazygames.com") ||
               decodedUrl.includes("gamedistribution.com");
      } catch (e) {
        return false;
      }
    };
    
    const tabUrl = newIframe.dataset.tabUrl || newIframe.src || "";
    const isGameSite = isGameSiteUrl(tabUrl);
    
    // CRITICAL FIX: Don't show errors for game sites - games load slowly and cross-origin blocks detection
    // Only handle errors for non-game sites
    if (!isGameSite) {
      newIframe.addEventListener("error", () => {
        if (!hasLoaded) {
          // Check if it's YouTube/Google
          if (isYouTubeOrGoogle(tabUrl)) {
            showYouTubeError(newIframe, tabTitle);
          } else {
            showGenericError(newIframe, tabTitle);
          }
        }
      });
    }
    
    newIframe.addEventListener("load", handleLoad);
    
    // CRITICAL FIX: Disable timeout errors for game sites
    // Games load slowly and cross-origin prevents proper detection
    // Only use timeout for non-game sites
    if (!isGameSite) {
      // Extended timeout for non-game sites (30 seconds)
      loadTimeout = setTimeout(() => {
        if (!hasLoaded) {
          try {
            // Check if it's YouTube/Google first
            if (isYouTubeOrGoogle(tabUrl)) {
              showYouTubeError(newIframe, tabTitle);
              return;
            }
            
            // Check if iframe has actually loaded content
            const iframeDoc = newIframe.contentDocument || newIframe.contentWindow?.document;
            if (!iframeDoc || iframeDoc.readyState !== "complete") {
              // Give it one more chance
              setTimeout(() => {
                if (!hasLoaded) {
                  showGenericError(newIframe, tabTitle);
                }
              }, 5000);
            }
          } catch (e) {
            // Cross-origin is normal for proxied sites
            setTimeout(() => {
              if (!hasLoaded) {
                if (isYouTubeOrGoogle(tabUrl)) {
                  showYouTubeError(newIframe, tabTitle);
                } else {
                  showGenericError(newIframe, tabTitle);
                }
              }
            }, 10000);
          }
        }
      }, 30000);
    }
    // For game sites: NO timeout = games can load as long as they need
    const goUrl = sessionStorage.getItem("GoUrl");
    const url = sessionStorage.getItem("URL");

    if (tabCounter === 0 || tabCounter === 1) {
      if (goUrl !== null) {
        if (goUrl.includes("/e/")) {
          newIframe.src = window.location.origin + goUrl;
        } else {
          newIframe.src = `${window.location.origin}/a/${goUrl}`;
        }
      } else {
        newIframe.src = "/";
      }
    } else if (tabCounter > 1) {
      if (url !== null) {
        newIframe.src = window.location.origin + url;
        sessionStorage.removeItem("URL");
      } else if (goUrl !== null) {
        if (goUrl.includes("/e/")) {
          newIframe.src = window.location.origin + goUrl;
        } else {
          newIframe.src = `${window.location.origin}/a/${goUrl}`;
        }
      } else {
        newIframe.src = "/";
      }
    }

    iframeContainer.appendChild(newIframe);
    tabCounter += 1;
  }
  function closeTab(event) {
    event.stopPropagation();
    const tabId = event.target.closest("li").dataset.tabId;
    const tabToRemove = tabList.querySelector(`[data-tab-id='${tabId}']`);
    const iframeToRemove = iframeContainer.querySelector(`[data-tab-id='${tabId}']`);
    if (tabToRemove && iframeToRemove) {
      tabToRemove.remove();
      iframeToRemove.remove();
      const remainingTabs = Array.from(tabList.querySelectorAll("li"));
      if (remainingTabs.length === 0) {
        tabCounter = 0;
        document.getElementById("is").value = "";
      } else {
        const nextTabIndex = remainingTabs.findIndex(
          tab => tab.dataset.tabId !== tabId,
        );
        if (nextTabIndex > -1) {
          const nextTabToActivate = remainingTabs[nextTabIndex];
          const nextIframeToActivate = iframeContainer.querySelector(
            `[data-tab-id='${nextTabToActivate.dataset.tabId}']`,
          );
          for (const tab of remainingTabs) {
            tab.classList.remove("active");
          }
          remainingTabs[nextTabIndex].classList.add("active");
          const allIframes = Array.from(iframeContainer.querySelectorAll("iframe"));
          for (const iframe of allIframes) {
            iframe.classList.remove("active");
          }
          nextIframeToActivate.classList.add("active");
        }
      }
    }
  }
  function switchTab(event) {
    const tabId = event.target.closest("li").dataset.tabId;
    const allTabs = Array.from(tabList.querySelectorAll("li"));
    for (const tab of allTabs) {
      tab.classList.remove("active");
    }
    const allIframes = Array.from(iframeContainer.querySelectorAll("iframe"));
    for (const iframe of allIframes) {
      iframe.classList.remove("active");
    }
    const selectedTab = tabList.querySelector(`[data-tab-id='${tabId}']`);
    if (selectedTab) {
      selectedTab.classList.add("active");
      Load();
    } else {
      console.log("No selected tab found with ID:", tabId);
    }
    const selectedIframe = iframeContainer.querySelector(`[data-tab-id='${tabId}']`);
    if (selectedIframe) {
      selectedIframe.classList.add("active");
    } else {
      console.log("No selected iframe found with ID:", tabId);
    }
  }
  let dragTab = null;
  tabList.addEventListener("dragstart", event => {
    dragTab = event.target;
  });
  tabList.addEventListener("dragover", event => {
    event.preventDefault();
    const targetTab = event.target;
    if (targetTab.tagName === "LI" && targetTab !== dragTab) {
      const targetIndex = Array.from(tabList.children).indexOf(targetTab);
      const dragIndex = Array.from(tabList.children).indexOf(dragTab);
      if (targetIndex < dragIndex) {
        tabList.insertBefore(dragTab, targetTab);
      } else {
        tabList.insertBefore(dragTab, targetTab.nextSibling);
      }
    }
  });
  tabList.addEventListener("dragend", () => {
    dragTab = null;
  });
  createNewTab();
});
// Reload
function reload() {
  const activeIframe = document.querySelector("#iframe-container iframe.active");
  if (activeIframe) {
    // biome-ignore lint/correctness/noSelfAssign:
    activeIframe.src = activeIframe.src;
    Load();
  } else {
    console.error("No active iframe found");
  }
}

// Popout
function popout() {
  const activeIframe = document.querySelector("#iframe-container iframe.active");
  if (activeIframe) {
    const newWindow = window.open("about:blank", "_blank");
    if (newWindow) {
      const name = localStorage.getItem("name") || "My Drive - Google Drive";
      const icon =
        localStorage.getItem("icon") ||
        "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png";
      newWindow.document.title = name;
      const link = newWindow.document.createElement("link");
      link.rel = "icon";
      link.href = encodeURI(icon);
      newWindow.document.head.appendChild(link);

      const newIframe = newWindow.document.createElement("iframe");
      const style = newIframe.style;
      style.position = "fixed";
      style.top = style.bottom = style.left = style.right = 0;
      style.border = style.outline = "none";
      style.width = style.height = "100%";

      newIframe.src = activeIframe.src;

      newWindow.document.body.appendChild(newIframe);
    }
  } else {
    console.error("No active iframe found");
  }
}

function erudaToggle() {
  const activeIframe = document.querySelector("#iframe-container iframe.active");
  if (!activeIframe) {
    console.error("No active iframe found");
    return;
  }
  const erudaWindow = activeIframe.contentWindow;
  if (!erudaWindow) {
    console.error("No content window found for the active iframe");
    return;
  }
  if (erudaWindow.eruda) {
    if (erudaWindow.eruda._isInit) {
      erudaWindow.eruda.destroy();
    } else {
      console.error("Eruda is not initialized in the active iframe");
    }
  } else {
    const erudaDocument = activeIframe.contentDocument;
    if (!erudaDocument) {
      console.error("No content document found for the active iframe");
      return;
    }
    const script = erudaDocument.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/eruda";
    script.onload = () => {
      if (!erudaWindow.eruda) {
        console.error("Failed to load Eruda in the active iframe");
        return;
      }
      erudaWindow.eruda.init();
      erudaWindow.eruda.show();
    };
    erudaDocument.head.appendChild(script);
  }
}
// Fullscreen
function FS() {
  const activeIframe = document.querySelector("#iframe-container iframe.active");
  if (activeIframe) {
    if (activeIframe.contentDocument.fullscreenElement) {
      activeIframe.contentDocument.exitFullscreen();
    } else {
      activeIframe.contentDocument.documentElement.requestFullscreen();
    }
  } else {
    console.error("No active iframe found");
  }
}
const fullscreenButton = document.getElementById("fullscreen-button");
fullscreenButton.addEventListener("click", FS);
// Home
function Home() {
  window.location.href = "./";
}
const homeButton = document.getElementById("home-page");
homeButton.addEventListener("click", Home);
// Back
function goBack() {
  const activeIframe = document.querySelector("#iframe-container iframe.active");
  if (activeIframe) {
    activeIframe.contentWindow.history.back();
    iframe.src = activeIframe.src;
    Load();
  } else {
    console.error("No active iframe found");
  }
}
// Forward
function goForward() {
  const activeIframe = document.querySelector("#iframe-container iframe.active");
  if (activeIframe) {
    activeIframe.contentWindow.history.forward();
    iframe.src = activeIframe.src;
    Load();
  } else {
    console.error("No active iframe found");
  }
}
// Remove Nav
document.addEventListener("DOMContentLoaded", () => {
  const tb = document.getElementById("tabs-button");
  const nb = document.getElementById("right-side-nav");
  tb.addEventListener("click", () => {
    const activeIframe = document.querySelector("#iframe-container iframe.active");
    if (nb.style.display === "none") {
      nb.style.display = "";
      activeIframe.style.top = "10%";
      activeIframe.style.height = "90%";
      tb.querySelector("i").classList.remove("fa-magnifying-glass-plus");
      tb.querySelector("i").classList.add("fa-magnifying-glass-minus");
    } else {
      nb.style.display = "none";
      activeIframe.style.top = "5%";
      activeIframe.style.height = "95%";
      tb.querySelector("i").classList.remove("fa-magnifying-glass-minus");
      tb.querySelector("i").classList.add("fa-magnifying-glass-plus");
    }
  });
});
if (navigator.userAgent.includes("Chrome")) {
  window.addEventListener("resize", () => {
    navigator.keyboard.lock(["Escape"]);
  });
}
function Load() {
  const activeIframe = document.querySelector("#iframe-container iframe.active");
  if (
    activeIframe &&
    activeIframe.contentWindow.document.readyState === "complete"
  ) {
    const website = activeIframe.contentWindow.document.location.href;
    if (website.includes("/a/")) {
      const websitePath = website
        .replace(window.location.origin, "")
        .replace("/a/", "");
      localStorage.setItem("decoded", websitePath);
      const decodedValue = decodeXor(websitePath);
      document.getElementById("is").value = decodedValue;
    } else if (website.includes("/a/q/")) {
      const websitePath = website
        .replace(window.location.origin, "")
        .replace("/a/q/", "");
      const decodedValue = decodeXor(websitePath);
      localStorage.setItem("decoded", websitePath);
      document.getElementById("is").value = decodedValue;
    } else {
      const websitePath = website.replace(window.location.origin, "");
      document.getElementById("is").value = websitePath;
      localStorage.setItem("decoded", websitePath);
    }
  }
}
function decodeXor(input) {
  if (!input) {
    return input;
  }
  const [str, ...search] = input.split("?");
  return (
    decodeURIComponent(str)
      .split("")
      .map((char, ind) =>
        ind % 2 ? String.fromCharCode(char.charCodeAt(Number.NaN) ^ 2) : char,
      )
      .join("") + (search.length ? `?${search.join("?")}` : "")
  );
}

// Check if URL is YouTube or Google service
function isYouTubeOrGoogle(url) {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return urlLower.includes('youtube.com') || 
         urlLower.includes('youtu.be') ||
         urlLower.includes('google.com/video') ||
         urlLower.includes('googlevideo.com');
}

// Show YouTube/Google error page with alternatives
function showYouTubeError(iframe, tabTitle) {
  try {
    const errorHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Video Unavailable</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: white;
            text-align: center;
          }
          .error-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            max-width: 600px;
          }
          h1 { font-size: 64px; margin: 0 0 20px 0; }
          h2 { font-size: 28px; margin: 0 0 20px 0; }
          p { font-size: 16px; margin: 10px 0; opacity: 0.9; line-height: 1.6; }
          .alternatives {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid rgba(255,255,255,0.2);
          }
          .alt-link {
            display: inline-block;
            margin: 8px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s;
          }
          .alt-link:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
          }
          button {
            margin-top: 20px;
            padding: 12px 30px;
            background: white;
            color: #ff0000;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 600;
          }
          button:hover { transform: scale(1.05); }
          .info-box {
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>📺</h1>
          <h2>Video Unavailable</h2>
          <p><strong>YouTube and Google Video services cannot be accessed through this proxy.</strong></p>
          <p>This is due to DRM (Digital Rights Management) protection that prevents videos from being proxied.</p>
          
          <div class="info-box">
            <p><strong>Why?</strong> YouTube uses Widevine DRM which requires direct browser access and cannot work through proxies.</p>
          </div>
          
          <div class="alternatives">
            <p><strong>Try these alternatives instead:</strong></p>
            <a href="/a/https://www.dailymotion.com" class="alt-link">Dailymotion</a>
            <a href="/a/https://www.vimeo.com" class="alt-link">Vimeo</a>
            <a href="/a/https://www.twitch.tv" class="alt-link">Twitch</a>
            <a href="/a/https://www.crazygames.com" class="alt-link">CrazyGames</a>
            <a href="/a/https://www.poki.com" class="alt-link">Poki</a>
          </div>
          
          <button onclick="window.location.href='/'">Go Home</button>
        </div>
      </body>
      </html>
    `;
    
    iframe.srcdoc = errorHTML;
    tabTitle.textContent = "Video Unavailable";
    
    if (document.getElementById("is")) {
      document.getElementById("is").value = "";
    }
  } catch (e) {
    console.error("Error showing YouTube error:", e);
    iframe.src = "/";
  }
}

// Show generic error page instead of exposing URL
function showGenericError(iframe, tabTitle) {
  try {
    // Replace iframe content with generic error page
    const errorHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Game Unavailable</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: white;
            text-align: center;
          }
          .error-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            max-width: 500px;
          }
          h1 { font-size: 48px; margin: 0 0 20px 0; }
          p { font-size: 18px; margin: 10px 0; opacity: 0.9; }
          button {
            margin-top: 20px;
            padding: 12px 30px;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 600;
          }
          button:hover { transform: scale(1.05); }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>⚠️</h1>
          <h2>Game Unavailable</h2>
          <p>This game is currently unavailable or not working.</p>
          <p>Please try a different game or check back later.</p>
          <button onclick="window.location.href='/gm'">Go to Games</button>
        </div>
      </body>
      </html>
    `;
    
    // Write error page to iframe
    iframe.srcdoc = errorHTML;
    tabTitle.textContent = "Game Unavailable";
    
    // Clear the URL from address bar
    if (document.getElementById("is")) {
      document.getElementById("is").value = "";
    }
  } catch (e) {
    console.error("Error showing generic error:", e);
    // Fallback: redirect to home
    iframe.src = "/";
  }
}
