# Goodreads Edition Finder

**Goodreads Edition Finder** is a browser extension for Chrome and Firefox that helps you instantly check if a book on Goodreads is available in your preferred language.

## 🔎 What it does

When you're browsing a book page on Goodreads, the extension automatically checks if there's a translated edition available in the language you've chosen (currently supported: French, Spanish, German, Italian, Dutch).

- Displays a banner if a matching edition exists
- Does nothing if you're already viewing the book in the selected language
- One-click access to the translated edition
- Runs entirely in your browser — no tracking, no external requests

## 🛠️ How to use

1. Install the extension (Chrome / Firefox build).
2. Click the extension icon and select the language you want to track.
3. Visit a Goodreads book page.
4. If a matching edition exists, a small banner appears — click it to go to the translated edition.

## 🔧 Features

- Simple, minimalist UI
- Language selection stored via `chrome.storage.sync`
- Smart detection logic using Goodreads DOM and edition listings
- Compatible with dynamic content and delayed page rendering

## 📦 Supported Platforms

- ✅ Chrome (Manifest V3)
- ✅ Firefox (via [addons.mozilla.org](https://addons.mozilla.org))

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 🙋‍♂️ Author

Built by [Julian](mailto:temechon@gmail.com).  
Feel free to open issues or contribute.

