/* ===========================================================
   KONFIGURACJA WYDANIA
   To jedyny plik, który trzeba zmienić dla nowego wydania.
   Skopiuj cały folder, zmień wartości poniżej, wgraj na GitHub.
   =========================================================== */
const RELEASE = {
  // Tytuł wydania (pojawi się jako nagłówek i w <title>)
  title: "Let's Go Crazy (Explode)",

  // Mały nadtytuł nad tytułem (np. "NOWY SINGIEL", "OUT NOW", "REMIX")
  eyebrow: "NOWY SINGIEL",

  // Cover - oryginalny URL ze Spotify, przepuszczony przez wsrv.nl (jak w tracks.json)
  cover: "https://wsrv.nl/?url=https://i.scdn.co/image/ab67616d0000b2739153cabbc2c9a362b3c3b912",

  // Cover w wersji surowej (do og:image - Facebook/Instagram woli oryginalny URL)
  coverRaw: "https://i.scdn.co/image/ab67616d0000b2739153cabbc2c9a362b3c3b912",

  // Link Spotify - web (otwiera się w przeglądarce / jako fallback)
  spotifyWeb: "https://open.spotify.com/album/0x5uiZ0g6gd9EZOof6Zs9r",

  // Link Spotify - app (deep link, próbuje otworzyć appkę na telefonie)
  // Format: zamień open.spotify.com/album/XXXX na spotify:album:XXXX
  spotifyApp: "spotify:album:0x5uiZ0g6gd9EZOof6Zs9r",

  // Opis do meta tagów (SEO / podgląd linku na Facebooku/Instagramie)
  description: "Posłuchaj \"Let's Go Crazy (Explode)\" - nowego singla MagneticMark. Big Room, Hardstyle, Techno z trąbką na żywo."
};
