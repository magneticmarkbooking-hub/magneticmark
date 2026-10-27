/* ===========================================================
   TUTAJ WKLEJ LINK, JAK BĘDZIESZ GO MIAŁ
   ===========================================================
   Podmień TYLKO fragment WKLEJ_TU_ID_UTWORU na ID utworu
   "A Love That Save Me" ze Spotify. Reszta linku (?context=...) MA ZOSTAĆ
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
const RELEASE_LINK = "https://open.spotify.com/track/4pP3D8jIVGJHv19SBEHr4Y?context=spotify%3Aartist%3A7qnCu8Un2e3gvg1ELX3HNg";

/* ===========================================================
   LINK NA TELEFON (opcjonalny)
   ===========================================================
   Spotify na telefonie przy linku z kontekstem artysty puszcza pierwszy
   utwór z profilu zamiast tego singla (od jesieni 2026, na PC działa).
   Zostaw puste "", a telefon dostanie sam utwór (gra dobry singiel).

   Lepiej: link do utworu w kontekście Twojej playlisty, na której jest ten
   singiel. Wtedy po singlu lecą Twoje kolejne kawałki. Format:

     https://open.spotify.com/track/ID_UTWORU?context=spotify%3Aplaylist%3AID_PLAYLISTY
   =========================================================== */
const RELEASE_LINK_MOBILE = "";
