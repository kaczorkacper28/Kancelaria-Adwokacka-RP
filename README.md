# Kancelaria Adwokacka RP

System kancelarii do serwera Discord RolePlay: bot, panel Prezesa, rejestr spraw, pracownicy i dokumenty.

## Wymagania
- Node.js 20 lub nowszy
- Aplikacja Discord utworzona w Discord Developer Portal
- Serwer Discord, na którym bot ma uprawnienia do odczytu i wysyłania wiadomości

## Instalacja
1. Sklonuj repozytorium.
2. Uruchom `npm install`.
3. Skopiuj `.env.example` do `.env` i uzupełnij zmienne.
4. Uruchom `npm start`.
5. Panel będzie dostępny pod adresem `/login`.

## Konfiguracja Discord
Włącz aplikację bota w Discord Developer Portal i zaproś ją na serwer z uprawnieniami `applications.commands` oraz `bot`. Uzupełnij `DISCORD_TOKEN`, `CLIENT_ID` i `GUILD_ID`.

Role Discord:
- `PRESIDENT_ROLE_ID` – Prezes / zarząd
- `STAFF_ROLE_ID` – personel kancelarii
- `CASES_CHANNEL_ID` – opcjonalny kanał rejestru spraw

## Panel
Dane logowania panelu ustawia się przez `PANEL_USER` i `PANEL_PASSWORD`. Zmień domyślne wartości przed uruchomieniem publicznym. Ustaw długi losowy `SESSION_SECRET`.

## Render
Ustaw Build Command: `npm install`, Start Command: `npm start`. Dodaj Persistent Disk i zamontuj go w katalogu `/opt/render/project/src/data`, aby baza JSON przetrwała wdrożenia. Nie umieszczaj pliku `.env` w repozytorium.

## Ważne
To system fikcyjny przeznaczony do RolePlay. Wzory dokumentów nie są dokumentami urzędowymi ani poradą prawną. Ogranicz dostęp do akt i nie zapisuj prawdziwych danych wrażliwych.
