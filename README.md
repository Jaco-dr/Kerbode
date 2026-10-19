# Kerkbode bezorglijst — installatie

De adressenlijst en bezorgvinkjes worden gedeeld via Supabase. Iedereen moet inloggen om adressen te zien. Ingelogde bezorgers kunnen bezorgvinkjes wijzigen; alleen accounts die als beheerder zijn aangewezen kunnen adressen toevoegen, aanpassen of verwijderen.

## Supabase instellen

1. Maak een Supabase-project en voer `supabase-setup.sql` uit in **SQL Editor**.
2. Schakel in **Authentication → Providers → Email** openbare aanmeldingen uit. Maak daarna in **Authentication → Users** zelf accounts aan voor de beheerder en iedere bezorger. Gebruikers delen geen wachtwoord.
3. Maak het beheerdersaccount eerst aan en kopieer diens UUID uit **Authentication → Users**.
4. Voer in SQL Editor uit, met de UUID van jouw beheerder:

   ```sql
   insert into public.managers (user_id) values ('VUL-HIER-DE-UUID-IN');
   ```

5. Kopieer de **Project URL** en de **publishable key** (of legacy `anon`-key) uit de API-instellingen van Supabase naar `supabase-config.js`. Gebruik nooit een `service_role`-key of databasewachtwoord in de website.

## Naar GitHub uploaden

Upload de bestanden uit deze bundel naar de hoofdmap van de bestaande GitHub-repository. Verwijder daar ook `adressen.js` en `adressen.json` als die nog in de repository staan. Die bestanden bevatten de adreslijst en mogen niet langer publiek via de website worden geladen.

GitHub Pages kan na de commit een paar minuten nodig hebben om de website bij te werken. De adressenpagina blijft gesloten totdat Supabase is ingesteld en iemand inlogt.

## Adressenlijst eenmalig overzetten

1. Bewaar eerst een privé kopie van het oude `adressen.js`-bestand op je computer.
2. Log op de website in als beheerder. Als de gedeelde lijst nog leeg is, verschijnt **Startadressen delen**.
3. Staat de lijst nog in de lokale opslag van dit apparaat, dan wordt die gebruikt. Anders vraagt de knop om het oude `adressen.js`-bestand te kiezen. De app leest dat bestand lokaal in en stuurt de adressen na jouw actie naar Supabase.
4. Controleer na het overzetten de lijst en bezorgvinkjes. Verwijder de privé migratiekopie pas als je zeker weet dat de gedeelde lijst compleet is.

Upload de migratiekopie nooit naar GitHub. Adressen die eerder in een openbare GitHub-commit stonden, kunnen nog in de commitgeschiedenis zitten, ook nadat het bestand uit de huidige versie is verwijderd. Maak de repository privé als die historische gegevens ook niet meer openbaar mogen zijn; het opschonen van de commitgeschiedenis is een aparte, ingrijpende stap.

Zonder ingevulde Supabase-configuratie blijven de adressen afgeschermd en kan niemand de lijst gebruiken.
