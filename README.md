# Meine Vorratskammer – kostenlose PWA

## Was enthalten ist
- Lebensmittel mit Menge, Kategorie und Mindesthaltbarkeitsdatum erfassen
- Suche und Filter für bald fällige / abgelaufene Produkte
- Einkaufsliste mit Abhaken
- einfache regelbasierte Rezeptideen
- lokaler Speicher im Browser
- PWA-Manifest und Service Worker für Installation und Offline-Start

## Lokal starten
Ein lokaler Webserver ist erforderlich (nicht direkt `file://` öffnen). Zum Beispiel:
```bash
python -m http.server 8000
```
Dann `http://localhost:8000` öffnen.

## Kostenlos veröffentlichen
Die Dateien können z. B. über GitHub Pages veröffentlicht werden. Für eine Installation auf Smartphones muss die Seite über HTTPS erreichbar sein. GitHub Pages bietet für öffentliche Repositories einen kostenlosen statischen Hosting-Weg. Die genauen Kontobedingungen bitte vor dem Veröffentlichen prüfen.

## Wichtige Grenzen dieser ersten Version
- Daten liegen nur im Browser des jeweiligen Geräts (localStorage). Es gibt noch keine Benutzerkonten, Haushalte, Einladungscodes oder Synchronisierung.
- Es gibt In-App-Hinweise beim Öffnen der App, aber noch keine zuverlässigen Hintergrund-Push-Nachrichten 7 / 3 / 1 Tage vor Ablauf.
- Rezeptideen sind einfache lokale Vorschläge, keine KI-Rezeptanalyse.
- Es gibt noch keinen Store-Build. Die PWA wird über den Browser installiert.

## Nächster Schritt für gemeinsame Nutzung
Ein kostenloses Cloud-Backend (z. B. Supabase Free) muss eingerichtet werden. Danach sind Authentifizierung, Haushaltsmitgliedschaften, sichere Datenbankregeln, Echtzeit-Synchronisierung und serverseitig geplante Push-Nachrichten zu implementieren und zu testen.
