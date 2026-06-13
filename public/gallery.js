// ══════════════════════════════════════════════════════════════
// GOLOSINASSSS — Módulo de Galería de Arte Híbrida (Direct-to-Collector)
// Lógica para renderizado 3D de Polycam e integración de Stripe
// ══════════════════════════════════════════════════════════════

const ARTWORKS = [
    {
        sku: "SKU-001",
        title: "Código Decolonial 001 - Ojo del Origen",
        year: "2026",
        dimensions: "60 x 60 x 4 cm",
        materials: "Acrílico y tinta sobre lienzo de algodón",
        technique: "Pintura mixta contemporánea",
        previewImg: "Portada_Diomedes_Golosinassss.gif",
        polycamId: "c25a073e721544a0b25e7912ffae5ece", // Captura de prueba / demo de Polycam
        stripeLink: "https://buy.stripe.com/mock_decolonial_001", // Stripe Payment Link de prueba
        saatchiLink: "https://www.saatchiart.com/art/Painting-Codigo-Decolonial-001-Ojo-del-Origen/1234567/8901234",
        nfcUrl: "https://www.golosinassss.com/verificar/sku-001"
    },
    {
        sku: "SKU-002",
        title: "Código Decolonial 002 - Camuflaje Geométrico",
        year: "2026",
        dimensions: "50 x 50 x 3.5 cm",
        materials: "Tinta de archivo y acrílico sobre papel de algodón",
        technique: "Dibujo y técnica mixta",
        previewImg: "Portada_ESTALLIDO.gif",
        polycamId: "d1822852095f463393a20125463fbaee", // Captura de prueba / demo de Polycam
        stripeLink: "https://buy.stripe.com/mock_decolonial_002",
        saatchiLink: "https://www.saatchiart.com/art/Drawing-Codigo-Decolonial-002-Camuflaje/1234567/8901235",
        nfcUrl: "https://www.golosinassss.com/verificar/sku-002"
    },
    {
        sku: "SKU-003",
        title: "Código Decolonial 003 - Portal Transdisciplinar",
        year: "2026",
        dimensions: "70 x 70 x 4 cm",
        materials: "Acrílico y óleo sobre bastidor reforzado",
        technique: "Pintura contemporánea",
        previewImg: "Portada_JEP.gif",
        polycamId: "e9015463393a1f2c64306a4b12631105", // Captura de prueba / demo de Polycam
        stripeLink: "https://buy.stripe.com/mock_decolonial_003",
        saatchiLink: "https://www.saatchiart.com/art/Painting-Codigo-Decolonial-003-Portal/1234567/8901236",
        nfcUrl: "https://www.golosinassss.com/verificar/sku-003"
    },
    {
        sku: "SKU-004",
        title: "Código Decolonial 004 - Luz Monumental",
        year: "2026",
        dimensions: "60 x 80 x 4 cm",
        materials: "Pintura mixta y pigmentos naturales sobre lienzo",
        technique: "Pintura de gran formato",
        previewImg: "Portada_HVLI.gif",
        polycamId: "f9015463393c25a073e721544a0b25e7", // Captura de prueba / demo de Polycam
        stripeLink: "https://buy.stripe.com/mock_decolonial_004",
        saatchiLink: "https://www.saatchiart.com/art/Painting-Codigo-Decolonial-004-Luz/1234567/8901237",
        nfcUrl: "https://www.golosinassss.com/verificar/sku-004"
    }
];

document.addEventListener("DOMContentLoaded", () => {
    renderArtGallery();
});

function renderArtGallery() {
    const grid = document.getElementById("grid-art-gallery");
    if (!grid) return;

    grid.innerHTML = "";

    ARTWORKS.forEach((art) => {
        const card = document.createElement("div");
        card.className = "art-card";
        card.setAttribute("data-sku", art.sku);

        card.innerHTML = `
            <!-- Visor 3D Dinámico -->
            <div class="art-viewer-container" id="viewer-${art.sku}">
                <img src="${art.previewImg}" alt="${art.title}" class="art-preview-img" id="img-${art.sku}">
                <button class="art-3d-btn" onclick="activate3D('${art.sku}', '${art.polycamId}')">
                    [ VER EN 3D ]
                </button>
            </div>

            <!-- Ficha Técnica -->
            <div class="art-info">
                <h3 class="art-title">${art.title}</h3>
                <ul class="art-meta">
                    <li><strong>Técnica:</strong> ${art.technique}</li>
                    <li><strong>Soporte:</strong> ${art.materials}</li>
                    <li><strong>Dimensiones:</strong> ${art.dimensions}</li>
                    <li><strong>Año:</strong> ${art.year}</li>
                    <li><strong>SKU / Ref:</strong> ${art.sku}</li>
                </ul>

                <!-- Badge de Autenticación Polygon (Web3) -->
                <div class="art-crypto-badge" title="Contrato Inteligente verificado en Polygon para procedencia digital">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2L2 22h20L12 2zm0 3.99L18.51 19H5.49L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z"/>
                    </svg>
                    <span>Gemelo Digital (Polygon NFT)</span>
                </div>

                <!-- Botones de Acción -->
                <div class="art-action-buttons">
                    <a href="${art.stripeLink}" target="_blank" class="btn-stripe-checkout">
                        ADQUIRIR OBRA FÍSICA
                    </a>
                    <a href="${art.saatchiLink}" target="_blank" class="btn-saatchi-link">
                        VER EN SAATCHI ART
                    </a>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Activa el iframe interactivo de Polycam al hacer clic en el botón
window.activate3D = function(sku, polycamId) {
    const container = document.getElementById(`viewer-${sku}`);
    if (!container) return;

    // Inyectar el iframe WebGL de Polycam de forma limpia
    container.innerHTML = `
        <iframe 
            src="https://poly.cam/capture/${polycamId}/embed" 
            class="art-iframe"
            title="Visor 3D interactivo Polycam"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            loading="lazy">
        </iframe>
    `;
    
    // Loguear evento en la telemetría del sitio
    if (window.GolosinasTelemetry) {
        window.GolosinasTelemetry.logEvent("activate_3d_scan", { sku, polycamId });
    }
};
