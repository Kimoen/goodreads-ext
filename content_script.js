
if (typeof browser !== 'undefined') {
    chrome = browser; // Firefox: redirige vers l'API standard
}


// Mapping nom de langue ➝ code Goodreads attendu
const langCodeMap = {
    french: 'fre',
    english: 'eng',
    german: 'ger',
    spanish: 'spa',
    italian: 'ita',
    dutch: 'nl',
};

function getGoodreadsLangCode(name) {
    return langCodeMap[name.toLowerCase()] || name.toLowerCase(); // fallback = brut
}

// function getLangDisplayName(code) {
//     return langDisplayNames[code] || code;
// }

function getLangDisplayNameI18n(langCode) {
    return chrome.i18n.getMessage(`lang_display_${langCode}`) || langCode;
}

/**
 * Détecte l’identifiant du Work (workId) par 3 méthodes :
 * 1. Le lien « Show all editions »               (méthode la plus fiable aujourd’hui)
 * 2. La meta <meta property="books:work_id">     (encore présente sur certaines pages)
 * 3. Le JSON LD dans <script type="application/ld+json"> (secours)
 */
async function getWorkId() {

    // 1 — motif /work/editions/123456
    const re = document.documentElement.innerHTML.match(/\/work\/editions\/(\d+)/);
    if (re) return re[1];

    // 2 — meta books:work_id ou goodreads:work_id
    const meta = document.querySelector(
        'meta[property="books:work_id"], meta[property="goodreads:work_id"]'
    );
    if (meta?.content) return meta.content;

    // 3 — __NEXT_DATA__ : on le cherche et on tente un parse JSON
    const nextTag = document.querySelector('#__NEXT_DATA__');
    if (nextTag?.textContent) {
        try {
            const data = JSON.parse(nextTag.textContent);
            // la plupart du temps : data.props.pageProps.mainItem.legacyWorkId
            const id =
                data?.props?.pageProps?.mainItem?.legacyWorkId ||
                data?.props?.pageProps?.workId;
            if (id) return id;
        } catch (_) {
            /* continue */
        }
    }

    return null;
}

function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for ${selector}`));
        }, timeout);
    });
}


/* ----------- Bandeau visuel minimaliste ----------- */
function showBanner({ ok, text, targetUrl }) {
    // Supprimer toute bannière existante
    const existingBanner = document.querySelector('#grfr-banner');
    if (existingBanner) {
        existingBanner.remove();
    }

    const div = document.createElement('div');
    div.id = 'grfr-banner'; // pour l’identifier plus facilement
    div.textContent = text;
    div.style.cssText =
        'position:fixed;top:10px;right:10px;z-index:99999;padding:8px 12px;' +
        'border-radius:6px;font-weight:600;font-family:system-ui;' +
        `background:${ok ? '#34c759' : '#ff3b30'};color:#fff;` +
        'box-shadow:0 2px 6px rgba(0,0,0,.2);' +
        (targetUrl ? 'cursor:pointer;' : '');
    if (targetUrl) {
        div.addEventListener('click', () => {
            window.open(targetUrl, '_blank');
        });
        div.title = chrome.i18n.getMessage('open_edition');
    }
    document.body.appendChild(div);
}

async function main() {

    // 3. Langue cible depuis stockage
    const { watchedLanguage = 'french' } = await chrome.storage.sync.get('watchedLanguage');
    const langCode = watchedLanguage.toLowerCase();

    // 1. Ne rien faire si on est déjà sur une édition dans la langue cible
    const button = document.querySelector('button[aria-label="Book details and editions"]');
    if (button) {
        // button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        // button.blur(); // ← supprime le focus
        button.click();
    }

    try {
        const dl = await waitForElement('.DescList', 3000);
        const items = Array.from(dl.querySelectorAll('.DescListItem'));
        const langItem = items.find(item =>
            item.querySelector('dt')?.textContent.trim().toLowerCase() === 'language'
        );
        const currentLang = langItem?.querySelector('dd')?.textContent.trim().toLowerCase();

        if (currentLang === watchedLanguage.toLowerCase()) {
            console.log('[GR-FR] Édition déjà dans la langue ciblée. Rien à faire.');
            return;
        }
        console.log("current lang", currentLang)

    } catch (e) {
        console.warn('[GR-FR] Timeout ou erreur DOM', e);
        // continue le script quand même, dans le doute
    }


    // 2. Chercher le workId
    const workId = await getWorkId();
    if (!workId) {
        console.warn('[GR-FR] Impossible de trouver le workId');
        showBanner({ ok: false, text: chrome.i18n.getMessage('workid_not_found'), targetUrl: null });

        return;
    }


    // 4. Fetch de la page des éditions filtrée par langue
    const goodreadsLangCode = getGoodreadsLangCode(langCode);
    const langUrl = `https://www.goodreads.com/work/editions/${workId}?utf8=%E2%9C%93&sort=num_ratings&filter_by_language=${encodeURIComponent(goodreadsLangCode)}`;


    const html = await fetch(langUrl, { credentials: 'include' }).then(r =>
        r.text()
    );

    // Parser HTML manuellement
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Étape 1 : trouver tous les blocs dataRow
    const rows = Array.from(doc.querySelectorAll('.dataRow'));

    const editions = Array.from(doc.querySelectorAll('.editionData'));
    let matchUrl = null;

    for (const ed of editions) {
        const langRow = Array.from(ed.querySelectorAll('.dataRow')).find(row => {
            const label = row.querySelector('.dataTitle');
            return label && label.textContent.trim() === 'Edition language:';
        });

        const lang = langRow?.querySelector('.dataValue')?.textContent.trim().toLowerCase();
        if (lang === langCode) {
            const link = ed.querySelector('.bookTitle');
            if (link) {
                matchUrl = 'https://www.goodreads.com' + link.getAttribute('href');
                break; // on prend la première
            }
        }
    }

    const langDisplay = getLangDisplayNameI18n(langCode);

    if (matchUrl) {
        const msg = chrome.i18n.getMessage('edition_found').replace('__LANG__', langDisplay);
        showBanner({ ok: true, text: msg, targetUrl: matchUrl });

    } else {
        const msg = chrome.i18n.getMessage('edition_not_found').replace('__LANG__', langDisplay);
        showBanner({ ok: false, text: msg });
    }
}

/* ----------- Programme principal ----------- */
(async () => {

    main();

})();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'recheckLanguage') {
        console.log('[GR-FR] Requête reçue pour relancer la détection.');
        main(); // on relance la logique
    }
});