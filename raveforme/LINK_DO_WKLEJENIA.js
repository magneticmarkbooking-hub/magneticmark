/* ===========================================================
   TUTAJ WKLEJ LINK, JAK BĘDZIESZ GO MIAŁ
   ===========================================================
   Podmień TYLKO fragment WKLEJ_TU_ID_UTWORU na ID utworu
   "Rave For Me" ze Spotify. Reszta linku (?context=...) MA ZOSTAĆ
   - to ona sprawia, że po kliknięciu odpala się piosenka, a słuchacz
   ląduje na profilu artysty MagneticMark, a nie na pustej stronie
   pojedynczego singla.

   Skąd wziąć ID: w Spotify prawy klik na utwór -> Udostępnij ->
   Kopiuj link do utworu. Dostaniesz coś takiego:

     https://open.spotify.com/track/11Dse1nbPerwED98N9W3D3?si=abc123

   ID to ciąg między "/track/" a "?" - czyli tutaj:
   11Dse1nbPerwED98N9W3D3
   (fragment ?si=... pomijasz, jest niepotrzebny)
   =========================================================== */
const RELEASE_LINK = "https://open.spotify.com/track/11Dse1nbPerwED98N9W3D3?context=spotify%3Aartist%3A7qnCu8Un2e3gvg1ELX3HNg";
