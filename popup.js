if (typeof browser !== 'undefined') {
    chrome = browser; // Firefox: redirige vers l'API standard
}
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
