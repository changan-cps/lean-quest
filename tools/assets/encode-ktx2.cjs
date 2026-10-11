// Encode the procedural PNG sources to KTX2 (Basis Universal) at two sizes.
//   node tools/assets/encode-ktx2.cjs SRC_DIR OUT_DIR /path/to/basis_encoder.js
// albedo -> ETC1S sRGB, orm -> ETC1S linear, normal -> UASTC linear (+zstd) for quality.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [src, out, encPath] = process.argv.slice(2);
const BASIS = require(path.resolve(encPath));
fs.mkdirSync(out, { recursive: true });
BASIS().then(M => {
  M.initializeBasis();
  const report = [];
  for (const file of fs.readdirSync(src).filter(f => f.endsWith('.png')).sort()) {
    const kind = file.replace('.png', '').split('_').pop();
    for (const size of [1024, 512]) {
      const tmp = path.join(out, '.tmp.png');
      execFileSync('convert', [path.join(src, file), '-resize', size + 'x' + size, tmp]);
      const png = fs.readFileSync(tmp);
      const e = new M.BasisEncoder();
      const srgb = kind === 'albedo';
      e.setCreateKTX2File(true);
      e.setKTX2UASTCSupercompression(true);
      e.setPerceptual(srgb);
      e.setKTX2AndBasisSRGBTransferFunc(srgb);
      e.setMipSRGB(srgb);
      e.setSliceSourceImage(0, new Uint8Array(png), 0, 0, M.ldr_image_type.cPNGImage.value);
      if (kind === 'normal') {
        e.setFormatMode(M.basis_tex_format.cUASTC_LDR_4x4.value);
        e.setNormalMapPreset();
        e.setRDOUASTC(true); e.setRDOUASTCQualityScalar(1.0);
      } else {
        e.setFormatMode(M.basis_tex_format.cETC1S.value);
        e.setQualityLevel(kind === 'orm' ? 96 : 160);
      }
      e.setMipGen(true);
      e.setStatusOutput(false); e.setPrintStats(false); e.setDebug(false);
      const buf = new Uint8Array(32 << 20);
      const n = e.encode(buf); e.delete();
      if (!n) throw new Error('encode failed ' + file);
      const name = file.replace('.png', '') + '_' + size + '.ktx2';
      fs.writeFileSync(path.join(out, name), buf.slice(0, n));
      report.push([name, n]);
      fs.unlinkSync(tmp);
    }
  }
  for (const [n, b] of report) console.log(n.padEnd(28), (b / 1024).toFixed(1) + ' KB');
});
