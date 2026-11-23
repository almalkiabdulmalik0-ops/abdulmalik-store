import fs from "node:fs/promises";

const LIKECARD_URL =
  "https://ar-oman.likecard.com/game-cards/mobile-gaming/free-fire/free-fire-global/";
const STOCK_FILE = new URL("./stock.json", import.meta.url);
const PACKAGES = ["100", "210", "530", "1080", "2200"];

function isPackageAvailable(html, pkg) {
  const cleanText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const idx = cleanText.indexOf(pkg);
  if (idx === -1) return true;

  const snippet = cleanText.slice(Math.max(0, idx - 120), idx + 220).toLowerCase();
  const outKeywords = [
    "غير متوفر",
    "نفذت الكمية",
    "نفد",
    "out of stock",
    "sold out",
    "unavailable"
  ];

  return !outKeywords.some((word) => snippet.includes(word));
}

async function run() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(LIKECARD_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ar-OM,ar;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.status === 403) {
      console.warn("LikeCard blocked GitHub runner with HTTP 403; keeping current stock.json.");
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const packages = {};
    for (const pkg of PACKAGES) {
      packages[pkg] = isPackageAvailable(html, pkg);
    }

    const payload = {
      updated_at: new Date().toISOString(),
      packages
    };

    await fs.writeFile(STOCK_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log("Updated stock.json:", payload);
  } catch (err) {
    clearTimeout(timer);
    console.error("Failed to update stock.json:", err.message);
    process.exitCode = 1;
  }
}

run();
