if (typeof browser !== 'undefined') {
    chrome = browser; // Firefox: redirige vers l'API standard
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('popupTitle').textContent = chrome.i18n.getMessage('popup_title');
    document.getElementById('saveBtn').textContent = chrome.i18n.getMessage('save');
    document.getElementById('optFrench').textContent = chrome.i18n.getMessage('lang_fr');
    document.getElementById('optEnglish').textContent = chrome.i18n.getMessage('lang_en');
    document.getElementById('optGerman').textContent = chrome.i18n.getMessage('lang_de');
    document.getElementById('optSpanish').textContent = chrome.i18n.getMessage('lang_es');
    document.getElementById('optItalian').textContent = chrome.i18n.getMessage('lang_it');
    document.getElementById('optDutch').textContent = chrome.i18n.getMessage('lang_nl');
});


const select = document.getElementById('languageSelect');
const saveBtn = document.getElementById('saveBtn');

// Charger la valeur enregistrée
chrome.storage.sync.get('watchedLanguage', data => {
    if (data.watchedLanguage) {
        select.value = data.watchedLanguage;
    }
});

// Enregistrer
saveBtn.addEventListener('click', async () => {
    const selected = select.value;

    // 1. Enregistre dans le storage
    await chrome.storage.sync.set({ watchedLanguage: selected });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'recheckLanguage' });
    });

    window.close();
});
