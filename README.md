# GOLOSINASSSS - Web

Ecosistema documental transmedia y portafolio de archivo vivo.

## 🛠️ Arquitectura de Archivos

*   `src/`: Directorio que contiene el código fuente legible de desarrollo.
    *   `src/app.js`: Lógica principal del reproductor de YouTube, playlist y sistema de telemetría local (`GolosinasTelemetry`).
    *   `src/styles.css`: Estilos de diseño, marquesinas y animaciones del portal.
*   `app.js` y `styles.css` (en la raíz): Archivos compilados, ofuscados y minificados que se sirven en producción. *No deben editarse manualmente*.
*   `build.js`: Script de automatización de compilación con Node.js.

## 🚀 Despliegue Automatizado (CI/CD)

Este repositorio cuenta con **GitHub Actions** configurado para desplegarse automáticamente en Cloudflare. 

Cada vez que se realiza un `git push` a la rama `main`:
1. GitHub Actions detecta el cambio.
2. Ejecuta la compilación de activos (`npm run build`).
3. Despliega la web actualizada directamente a los servidores de Cloudflare.

---
*Última actualización: 9 de junio de 2026.*
