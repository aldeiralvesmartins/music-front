#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.resolve(root, 'public', '.htaccess');
const destDir = path.resolve(root, 'dist');
const dest = path.resolve(destDir, '.htaccess');

function main() {
  try {
    if (!fs.existsSync(destDir)) {
      console.error('[postbuild] dist/ não encontrado. Execute primeiro: vite build');
      process.exit(1);
    }
    if (!fs.existsSync(src)) {
      console.warn('[postbuild] public/.htaccess não encontrado. Nada a copiar.');
      process.exit(0);
    }
    fs.copyFileSync(src, dest);
    console.log('[postbuild] .htaccess copiado para dist/.');
  } catch (e) {
    console.error('[postbuild] Erro ao copiar .htaccess:', e.message);
    process.exit(1);
  }
}

main();
