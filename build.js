const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');

console.log('🚀 Iniciando compilación de GOLOSINASSSS...');

// Rutas de archivos
const srcJsPath = path.join(__dirname, 'src', 'app.js');
const srcCssPath = path.join(__dirname, 'src', 'styles.css');
const distJsPath = path.join(__dirname, 'public', 'app.js');
const distCssPath = path.join(__dirname, 'public', 'styles.css');

// 1. Procesar JavaScript
try {
    console.log('📦 Leyendo src/app.js...');
    let rawJs = fs.readFileSync(srcJsPath, 'utf8');

    console.log('🔒 Minificando JavaScript (Regex)...');
    // Basic JS minification
    rawJs = rawJs.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // Eliminar comentarios
    rawJs = rawJs.replace(/\s+/g, ' '); // Eliminar espacios extra
    rawJs = rawJs.replace(/\s*([=+\-{};(),:])\s*/g, '$1'); // Quitar espacios alrededor de operadores

    fs.writeFileSync(distJsPath, rawJs, 'utf8');
    console.log('   ✅ JavaScript minificado y guardado en ./app.js');
} catch (err) {
    console.error('   ❌ Error procesando JavaScript:', err);
    process.exit(1);
}

// 2. Procesar CSS
try {
    console.log('🎨 Leyendo src/styles.css...');
    const rawCss = fs.readFileSync(srcCssPath, 'utf8');

    console.log('⚡ Comprimiendo CSS...');
    const minifiedCss = new CleanCSS({}).minify(rawCss);

    if (minifiedCss.errors.length > 0) {
        throw new Error(minifiedCss.errors.join(', '));
    }

    fs.writeFileSync(distCssPath, minifiedCss.styles, 'utf8');
    console.log('   ✅ CSS comprimido y guardado en ./styles.css');
} catch (err) {
    console.error('   ❌ Error procesando CSS:', err);
    process.exit(1);
}

console.log('🎉 ¡Compilación completada con éxito!');
