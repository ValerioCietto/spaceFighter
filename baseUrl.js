// Exposes BASE_URL depending on where the app is running.
const href = (window.location.href || "").toLowerCase();

const isGitHubPages = href.includes("github.io");
const isLocal = href.includes("127.0.0.1") || href.includes("localhost");

const BASE_URL = isGitHubPages
  ? "https://valeriocietto.github.io/spaceFighter/"
  : isLocal
    ? "http://127.0.0.1:8080/"
    : "/";

window.BASE_URL = BASE_URL;
