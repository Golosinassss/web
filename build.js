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
    const rawJs = fs.readFileSync(srcJsPath, 'utf8');

    console.log('🔒 Ofuscando y minificando JavaScript...');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(rawJs, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false, 
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
    });

    fs.writeFileSync(distJsPath, obfuscationResult.getObfuscatedCode(), 'utf8');
    console.log('   ✅ JavaScript ofuscado y guardado en ./app.js');
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
