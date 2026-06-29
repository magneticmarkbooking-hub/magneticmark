/* ===========================================================
   KONFIGURACJA WYDANIA
   To jedyny plik, który trzeba zmienić dla nowego wydania.
   Skopiuj cały folder, zmień wartości poniżej, wgraj na GitHub.
   =========================================================== */
const RELEASE = {
  // Tytuł wydania (pojawi się jako nagłówek i w <title>)
  title: "Teckno Lady",

  // Mały nadtytuł nad tytułem
  eyebrow: "NEW SINGLE",

  // Cover - plik leży w tym samym folderze co strona
  cover: "cover.jpg",

  // Cover w wersji surowej (do og:image)
  coverRaw: "cover.jpg",

  // Link docelowy przycisku — wczytywany z LINK_DO_WKLEJENIA.js
  linkUrl: (typeof RELEASE_LINK !== 'undefined') ? RELEASE_LINK : "PLACEHOLDER_WKLEJ_TUTAJ_LINK_SPOTIFY",

  // Nazwa platformy docelowej
  platform: "spotify",

  // Opis do meta tagów
  description: "Listen to \"Teckno Lady\", the new single from MagneticMark. Peak Time Techno with live trumpet energy."
};
