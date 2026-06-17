/* ===========================================================
   KONFIGURACJA WYDANIA
   To jedyny plik, który trzeba zmienić dla nowego wydania.
   Skopiuj cały folder, zmień wartości poniżej, wgraj na GitHub.
   =========================================================== */
const RELEASE = {
  // Tytuł wydania (pojawi się jako nagłówek i w <title>)
  title: "Hey Hi Hello",

  // Mały nadtytuł nad tytułem - tekst widoczny na stronie jest po angielsku
  // (np. "NEW SINGLE", "OUT NOW", "NEW REMIX")
  eyebrow: "NEW SINGLE",

  // Cover - plik leży w tym samym folderze co strona (cover.png)
  cover: "cover.png",

  // Cover w wersji surowej (do og:image - ten sam plik wystarczy)
  coverRaw: "cover.png",

  // Link docelowy przycisku - wprost na Spotify (bez przystanku na fanlink.tv).
  // Oba Twoje Piksele (główny 27127010080316320 i 8169582049794791) są
  // zainicjowane tutaj, na tej stronie, i odpalają PageView + ViewContent
  // z pełnym pokryciem (IP, User Agent, fbp, fbc) - patrz <head> w index.html
  // i handleLinkClick w release.js.
  //
  // Link wczytujemy z osobnego pliku LINK_DO_WKLEJENIA.js (zmienna
  // RELEASE_LINK) - tam go wklejasz, gdy będziesz mieć finalny URL Spotify,
  // bez potrzeby szukania w tym pliku.
  linkUrl: (typeof RELEASE_LINK !== 'undefined') ? RELEASE_LINK : "PLACEHOLDER_WKLEJ_TUTAJ_LINK_SPOTIFY",

  // Nazwa platformy docelowej (do parametru content_name w zdarzeniu Pixela,
  // żeby struktura odpowiadała temu co wysyłał Tonden/fanlink: "spotify",
  // "apple_music", "youtube", "soundcloud" itd.)
  platform: "spotify",

  // Opis do meta tagów (SEO / podgląd linku na Facebooku/Instagramie) - po angielsku
  description: "Listen to \"Hey Hi Hello\", the new single from MagneticMark. Big Room, Hardstyle and Techno with live trumpet."
};
