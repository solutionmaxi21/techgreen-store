import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';

async function createIcon() {
  try {
    const sourcePng = 'build/logo.png';
    const tempPng256 = 'build/temp_256.png';
    
    // First, resize to 256x256 using sharp
    console.log('Creating 256x256 PNG...');
    await sharp(sourcePng)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(tempPng256);
    
    console.log('Converting to ICO format...');
    const buf = await pngToIco(tempPng256);
    fs.writeFileSync('build/icon.ico', buf);
    
    // Cleanup temp file
    if (fs.existsSync(tempPng256)) {
      fs.unlinkSync(tempPng256);
    }
    
    console.log('✓ Icon created successfully with 256x256 size');
  } catch (error) {
    console.error('Error creating icon:', error);
    process.exit(1);
  }
}

createIcon();
