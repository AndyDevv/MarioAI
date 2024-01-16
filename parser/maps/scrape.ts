import fs from "fs";
import path from "path";

const baseUrl: string = "https://www.mariouniverse.com/maps-snes-smb2/";
const imageBaseUrl: string =
  "https://www.mariouniverse.com/wp-content/img/maps/snes/smb2/";

// Function to download the image
async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filepath, buffer);
}

// Function to fetch and parse the HTML, then download images
async function scrapeImages(): Promise<void> {
  try {
    const response = await fetch(baseUrl);
    const body = await response.text();

    // Regex to find the world and level
    const regex = /smb2\/(\d)-(\d)\.png/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(body)) !== null) {
      const world: string = match[1];
      const level: string = match[2];
      const imageUrl: string = `${imageBaseUrl}${world}-${level}.png`;

      const dir: string = `World_${world}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      const filepath: string = path.join(dir, `${world}-${level}.png`);
      console.log(`Downloading: ${imageUrl}`);
      await downloadImage(imageUrl, filepath);
    }

    console.log("Download complete.");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

scrapeImages();
