// generate-icons.js
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePNG(size, bgR, bgG, bgB) {
  const width = size;
  const height = size;
  
  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw scanlines with RGBA
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const radius = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter byte: 0 = None
    for (let x = 0; x < width; x++) {
      // Rounded rectangle test
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const halfSize = size / 2;
      const cornerDx = dx - (halfSize - radius);
      const cornerDy = dy - (halfSize - radius);
      
      let inside = true;
      if (cornerDx > 0 && cornerDy > 0) {
        if (cornerDx * cornerDx + cornerDy * cornerDy > radius * radius) {
          inside = false;
        }
      }

      if (!inside) {
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
        continue;
      }

      // Drawing stylized inner clipboard icon
      const innerMargin = size * 0.18;
      const isInnerCard = (x >= innerMargin && x <= size - innerMargin && y >= innerMargin && y <= size - innerMargin);
      
      // Center checklist bar lines
      const isClip = (x >= size * 0.38 && x <= size * 0.62 && y >= innerMargin * 0.75 && y <= innerMargin * 1.3);
      const isLine1 = (x >= size * 0.35 && x <= size * 0.75 && y >= size * 0.40 && y <= size * 0.45);
      const isLine2 = (x >= size * 0.35 && x <= size * 0.68 && y >= size * 0.52 && y <= size * 0.57);
      const isCheck1 = (x >= size * 0.25 && x <= size * 0.30 && y >= size * 0.40 && y <= size * 0.45);
      const isCheck2 = (x >= size * 0.25 && x <= size * 0.30 && y >= size * 0.52 && y <= size * 0.57);

      if (isClip) {
        rawData.writeUInt8(15, offset++);
        rawData.writeUInt8(23, offset++);
        rawData.writeUInt8(42, offset++);
        rawData.writeUInt8(255, offset++);
      } else if (isCheck1 || isCheck2) {
        rawData.writeUInt8(16, offset++);
        rawData.writeUInt8(185, offset++);
        rawData.writeUInt8(129, offset++);
        rawData.writeUInt8(255, offset++);
      } else if (isLine1 || isLine2) {
        rawData.writeUInt8(203, offset++);
        rawData.writeUInt8(213, offset++);
        rawData.writeUInt8(225, offset++);
        rawData.writeUInt8(255, offset++);
      } else if (isInnerCard) {
        rawData.writeUInt8(255, offset++);
        rawData.writeUInt8(255, offset++);
        rawData.writeUInt8(255, offset++);
        rawData.writeUInt8(255, offset++);
      } else {
        // Gradient #0284c7 -> #0369a1
        const ratio = y / height;
        const r = Math.round(2 + (3 - 2) * ratio);
        const g = Math.round(132 + (105 - 132) * ratio);
        const b = Math.round(199 + (161 - 199) * ratio);
        rawData.writeUInt8(r, offset++);
        rawData.writeUInt8(g, offset++);
        rawData.writeUInt8(b, offset++);
        rawData.writeUInt8(255, offset++);
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public/icons');
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), generatePNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), generatePNG(512));
fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), generatePNG(192));
fs.writeFileSync(path.resolve('public/favicon.ico'), generatePNG(64));
console.log('Icons generated successfully!');
