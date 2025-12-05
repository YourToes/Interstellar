window.addEventListener("load", () => {
  navigator.serviceWorker.register("../sw.js?v=6-17-2024", {
    scope: "/a/",
  });
});

const form = document.getElementById("fs");
const input = document.getElementById("is");

if (form && input) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (window.top.location.pathname === "/ta") {
      processUrl(input.value, "");
    } else {
      processUrl(input.value, "/ta");
    }
  });
}
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

function processUrl(value, path) {
  let url = value.trim().toLowerCase();
  
  // Check for keyword shortcuts first
  if (shortcuts[url]) {
    window.location.href = shortcuts[url];
    return;
  }
  
  url = value.trim(); // Reset to original case
  const engine = localStorage.getItem("engine");
  const searchUrl = engine ? engine : "https://duckduckgo.com/?q=";

  if (!isUrl(url)) {
    url = searchUrl + url;
  } else if (!(url.startsWith("https://") || url.startsWith("http://"))) {
    url = `https://${url}`;
  }

  sessionStorage.setItem("GoUrl", __uv$config.encodeUrl(url));
  const dy = localStorage.getItem("dy");

  if (dy === "true") {
    window.location.href = `/a/q/${__uv$config.encodeUrl(url)}`;
  } else if (path) {
    location.href = path;
  } else {
    window.location.href = `/a/${__uv$config.encodeUrl(url)}`;
  }
}

function go(value) {
  processUrl(value, "/ta");
}

function blank(value) {
  processUrl(value);
}

function dy(value) {
  processUrl(value, `/a/q/${__uv$config.encodeUrl(value)}`);
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
