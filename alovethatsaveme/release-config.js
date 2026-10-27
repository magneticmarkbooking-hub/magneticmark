/* ===========================================================
   KONFIGURACJA WYDANIA
   To jedyny plik, który trzeba zmienić dla nowego wydania.
   Skopiuj cały folder, zmień wartości poniżej, wgraj na GitHub.
   =========================================================== */
const RELEASE = {
  // Tytuł wydania (pojawi się jako nagłówek, w <title> i w popupie)
  title: "A Love That Save Me",

  // Mały nadtytuł nad tytułem
  eyebrow: "NEW SINGLE",

  // Cover - plik leży w tym samym folderze co strona
  cover: "cover.jpg",

  // Cover w wersji surowej (do og:image).
  // MUSI być pełnym adresem https:// - Facebook/Instagram nie potrafi
  // odczytać ścieżki względnej i podgląd linku zostaje bez okładki.
  coverRaw: "https://magneticmarkdj.com/alovethatsaveme/cover.jpg",

  // Link docelowy przycisku — wczytywany z LINK_DO_WKLEJENIA.js
  linkUrl: (typeof RELEASE_LINK !== 'undefined') ? RELEASE_LINK : "PLACEHOLDER_WKLEJ_TUTAJ_LINK_SPOTIFY",

  // Link na telefon (opcjonalny), np. utwór w kontekście playlisty. Bez niego telefon dostaje
  // sam utwór, bo Spotify na telefonie ignoruje utwór przy kontekście artysty.
  mobileLinkUrl: (typeof RELEASE_LINK_MOBILE !== 'undefined' && RELEASE_LINK_MOBILE) ? RELEASE_LINK_MOBILE : null,

  // Nazwa platformy docelowej
  platform: "spotify",

  // Opis do meta tagów
  description: "Listen to \"A Love That Save Me\", the new single from MagneticMark. A euphoric love story at 150 BPM, from lost in space to saved."
};
