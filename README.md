# Kerbode gedeelde bezorglijst

De adressenlijst en bezorgvinkjes worden gedeeld via Supabase. Alle bezoekers kunnen de lijst bekijken en de bezorgstatus bijwerken. Alleen een ingelogde beheerder kan adressen beheren.

## Eenmalig instellen

1. Maak een project aan op Supabase en open **SQL Editor**.
2. Plak de inhoud van `supabase-setup.sql` en voer het script één keer uit.
3. Maak in **Authentication → Users** zelf een beheerder-gebruiker aan. Schakel openbare aanmeldingen uit; alleen de beheerder die je zelf toevoegt mag kunnen inloggen.
4. Kopieer de **Project URL** en de **publishable/anon key** uit de API-instellingen van Supabase.
5. Vul die waarden in `supabase-config.js` in. Gebruik nooit de `service_role`-key of een databasewachtwoord in deze website.
6. Upload naar de GitHub-repository: `index.html`, `styles.css`, `script.js`, `supabase-config.js`, `supabase-setup.sql` en de map `assets`. Laat `adressen.js` staan; die levert de startlijst.

## Eerste synchronisatie

Open de website op het apparaat waar de meest complete lokale lijst staat. Meld je aan als beheerder en kies **Startadressen op deze telefoon delen**. Dit zet de lijst en bestaande bezorgvinkjes op Supabase. Open daarna de website op andere apparaten; die halen gedeelde wijzigingen automatisch op (binnen ongeveer tien seconden).

Lokale wijzigingen die op andere apparaten zijn gemaakt vóór de eerste synchronisatie zijn niet automatisch bekend bij de database. Kies daarom voor de eerste synchronisatie het apparaat met de meest complete lijst.

## Toegang en privacy

De website blijft publiek toegankelijk: adressen zijn leesbaar voor iedereen met de link, en iedere bezoeker kan bezorgvinkjes aanpassen. Adressen toevoegen, wijzigen en verwijderen vereist een Supabase-account dat je als beheerder hebt aangemaakt. Gebruik geen Supabase `service_role`-key in bestanden die naar GitHub worden geüpload.

Zonder ingevulde `supabase-config.js` werkt de website alleen lokaal; apparaten synchroniseren dan niet.
