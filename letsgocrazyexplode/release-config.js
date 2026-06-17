/* ===========================================================
   KONFIGURACJA WYDANIA
   To jedyny plik, który trzeba zmienić dla nowego wydania.
   Skopiuj cały folder, zmień wartości poniżej, wgraj na GitHub.
   =========================================================== */
const RELEASE = {
  // Tytuł wydania (pojawi się jako nagłówek i w <title>)
  title: "Let's Go Crazy (Explode)",

  // Mały nadtytuł nad tytułem - tekst widoczny na stronie jest po angielsku
  // (np. "NEW SINGLE", "OUT NOW", "NEW REMIX")
  eyebrow: "NEW SINGLE",

  // Cover - oryginalny URL ze Spotify, przepuszczony przez wsrv.nl (jak w tracks.json)
  cover: "https://wsrv.nl/?url=https://i.scdn.co/image/ab67616d0000b2739153cabbc2c9a362b3c3b912",

  // Cover w wersji surowej (do og:image - Facebook/Instagram woli oryginalny URL)
  coverRaw: "https://i.scdn.co/image/ab67616d0000b2739153cabbc2c9a362b3c3b912",

  // Link docelowy przycisku - dokładny URL utworu na Spotify, znaleziony za
  // przyciskiem Play na ToneDen (bez parametru ?si=... - to jednorazowy token
  // atrybucji, nie ma sensu hardkodować go dla wszystkich odwiedzających)
  linkUrl: "https://open.spotify.com/track/4CbsMnurQy5zRvWeMdT5Bk",

  // Opis do meta tagów (SEO / podgląd linku na Facebooku/Instagramie) - po angielsku
  description: "Listen to \"Let's Go Crazy (Explode)\", the new single from MagneticMark. Big Room, Hardstyle and Techno with live trumpet."
};
