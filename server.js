import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/track", async (req, res) => {
  const cn = req.body.cn;
  if (!cn) return res.status(400).json({ success: false, message: "CN number required" });

  const url = `https://leopardscourier.com/shipment_tracking?cn_number=${cn}`;
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForSelector(".shipment-details", { timeout: 15000 });

    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".shipment-details table tr"));
      return rows.map(row => {
        const cols = row.querySelectorAll("td");
        return {
          key: cols[0]?.innerText.trim(),
          value: cols[1]?.innerText.trim(),
        };
      }).filter(item => item.key && item.value);
    });

    await browser.close();
    res.json({ success: true, tracking: data });
  } catch (err) {
    console.error("Scrape failed:", err.message);
    res.status(500).json({ success: false, message: "Error scraping data" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
