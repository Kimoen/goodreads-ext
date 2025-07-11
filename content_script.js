/* eslint-disable no-console */

/**
 * Détecte l’identifiant du Work (workId) par 3 méthodes :
 * 1. Le lien « Show all editions »               (méthode la plus fiable aujourd’hui)
 * 2. La meta <meta property="books:work_id">     (encore présente sur certaines pages)
 * 3. Le JSON LD dans <script type="application/ld+json"> (secours)
 */
function getWorkId() {
    const html = document.documentElement.innerHTML;

    // 1 — motif /work/editions/123456
    const re = html.match(/\/work\/editions\/(\d+)/);
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
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText =
        'position:fixed;top:10px;right:10px;z-index:99999;padding:8px 12px;' +
        'border-radius:6px;font-weight:600;font-family:system-ui;' +
        `background:${ok ? '#34c759' : '#ff3b30'};color:#fff;` +
        'box-shadow:0 2px 6px rgba(0,0,0,.2);' +
        (targetUrl ? 'cursor:pointer;' : '');
    if (targetUrl) {
        div.addEventListener('click', () => {
            chrome.tabs ? chrome.tabs.create({ url: targetUrl }) : window.open(targetUrl, '_blank');
        });
        div.title = 'Ouvrir l’édition française';
    }
    document.body.appendChild(div);
}

/* ----------- Programme principal ----------- */
(async () => {
    try {
        const dl = await waitForElement('.DescList');
        const items = Array.from(dl.querySelectorAll('.DescListItem'));
        const langItem = items.find(item =>
            item.querySelector('dt')?.textContent.trim().toLowerCase() === 'language'
        );
        const lang = langItem?.querySelector('dd')?.textContent.trim().toLowerCase();

        if (lang === 'french') {
            console.log('[GR-FR] Édition déjà en français. Aucun traitement.');
            return;
        }
    } catch (e) {
        console.warn('[GR-FR] Timeout ou erreur DOM', e);
        // continue le script quand même, dans le doute
    }

    const workId = getWorkId();
    if (!workId) {
        console.warn('[GR-FR] Impossible de trouver le workId');
        showBanner({ ok: false, text: '⛔ workId introuvable', targetUrl: null });
        return;
    }
    const langUrl = `https://www.goodreads.com/work/editions/${workId}?utf8=%E2%9C%93&sort=num_ratings&filter_by_language=fre`;

    const html = await fetch(langUrl, { credentials: 'include' }).then(r =>
        r.text()
    );

    // Parser HTML manuellement
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Étape 1 : trouver tous les blocs dataRow
    const rows = Array.from(doc.querySelectorAll('.dataRow'));

    const editions = Array.from(doc.querySelectorAll('.editionData'));
    let frLink = null;

    for (const ed of editions) {
        const langRow = Array.from(ed.querySelectorAll('.dataRow')).find(row => {
            const label = row.querySelector('.dataTitle');
            return label && label.textContent.trim() === 'Edition language:';
        });

        const lang = langRow?.querySelector('.dataValue')?.textContent.trim().toLowerCase();
        if (lang === 'french') {
            const link = ed.querySelector('.bookTitle');
            if (link) {
                frLink = 'https://www.goodreads.com' + link.getAttribute('href');
                break; // on prend la première
            }
        }
    }
    const hasFrench = Boolean(frLink);

    showBanner({
        ok: hasFrench,
        text: hasFrench
            ? '✅ Édition française disponible !'
            : '❌ Aucune édition française',
        targetUrl: frLink // null si pas trouvée ⇒ bannière non cliquable
    });

})();
