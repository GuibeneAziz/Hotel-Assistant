# Internationalization (i18n) — Tunisia Hotel Assistant

## 1. Overview

The application supports 6 languages simultaneously:

| Language | Code | Direction |
|---|---|---|
| English | `en` | LTR |
| French | `fr` | LTR |
| Arabic | `ar` | RTL |
| Spanish | `es` | LTR |
| German | `de` | LTR |
| Italian | `it` | LTR |

The language system has **two independent parts**:

1. **UI translation** (`lib/i18n.tsx` + locale files): translates all static text in the interface (buttons, labels, hotel descriptions, page titles)
2. **AI response language** (built into the LLM system prompt): the AI automatically responds in the same language as the guest's message

---

## 2. Architecture

### Files

```
lib/
  i18n.tsx          ← LanguageProvider context + English dictionary (default)
  locales/
    fr.ts           ← French translations
    ar.ts           ← Arabic translations
    es.ts           ← Spanish translations
    de.ts           ← German translations
    it.ts           ← Italian translations
```

### Context (`lib/i18n.tsx`)

The i18n system uses React Context. `LanguageProvider` wraps the entire app in `app/layout.tsx`:

```tsx
<LanguageProvider>
  {children}
</LanguageProvider>
```

This makes the `useLanguage()` hook available in any component.

### Hook usage

```tsx
const { t, language, setLanguage } = useLanguage()

// Translate a key
<h1>{t('welcome_title')}</h1>

// Change language
<button onClick={() => setLanguage('fr')}>Français</button>
```

---

## 3. Translation Keys

### Structure

Each language file exports an object where keys are identifiers and values are translated strings:

```typescript
// lib/locales/fr.ts
export const fr = {
  welcome_title: "Bienvenue en Tunisie",
  select_hotel: "Choisissez votre hôtel",
  chat_placeholder: "Posez votre question...",
  hotel_sindbad-hammamet_desc: "Un hôtel 5 étoiles au bord de la mer...",
  hotel_villa-didon-carthage_desc: "...",
  hotel_belvedere-fourati-tunis_desc: "...",
  // ...
}
```

### Key naming conventions

| Key pattern | Usage |
|---|---|
| `welcome_*` | Landing page text |
| `chat_*` | Chatbot page UI |
| `hotel_<id>_desc` | Hotel description on landing page |
| `dashboard_*` | Admin dashboard labels |
| `nav_*` | Navigation items |
| `error_*` | Error messages |

### Hotel descriptions

A key feature: the hotel card descriptions on the landing page are translated. Keys follow the pattern `hotel_<hotelId>_desc`:

```typescript
// English (lib/i18n.tsx)
'hotel_sindbad-hammamet_desc': 'A 5-star beachfront resort in Hammamet...'

// French (lib/locales/fr.ts)
'hotel_sindbad-hammamet_desc': 'Un resort 5 étoiles en bord de mer à Hammamet...'

// Arabic (lib/locales/ar.ts)
'hotel_sindbad-hammamet_desc': 'منتجع 5 نجوم على شاطئ البحر في الحمامات...'
```

In `app/page.tsx`, the description is rendered as:
```tsx
{t(`hotel_${hotel.id}_desc`) || hotel.description}
```

The `|| hotel.description` fallback ensures the hardcoded English description shows if a translation key is missing.

---

## 4. Language Switcher Component

`app/components/LanguageSwitcher.tsx` renders a language selector in the header. It:
1. Shows the current language flag/code
2. On select: calls `setLanguage(code)` from the i18n context
3. The context re-renders all translated text immediately (no page reload)

---

## 5. RTL Support (Arabic)

When the language is Arabic (`ar`), the UI layout should flip to right-to-left. This is handled by setting `dir="rtl"` on the HTML element:

```tsx
// In app/layout.tsx
<html lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
```

Tailwind CSS provides RTL utility classes (e.g. `rtl:mr-0 rtl:ml-4`) where needed.

---

## 6. AI Language Detection (Independent of UI)

The AI's language behavior is separate from the UI language selector. The system prompt tells the AI:

```
Respond in the SAME LANGUAGE as the user's question
(English, French, Spanish, Arabic, German, Italian, etc.)
```

This means:
- A guest can set the UI to French but type in Arabic → the AI responds in Arabic
- The language detection is based on the message content, not the UI setting
- Detection is handled server-side in `lib/analytics.ts` via `detectLanguage()` (for analytics tracking)
- The LLM itself handles the actual language-aware response generation

### Practical example

```
Guest writes: "قائمة الطعام للفطور؟"  (Arabic: "breakfast menu?")
AI responds: "يقدم مطعم الفندق الإفطار من الساعة 7:00 صباحاً حتى 10:30 صباحاً..."
```

No configuration required — the LLM is natively multilingual.

---

## 7. Adding a New Language

To add a 7th language (e.g. Russian):

1. Create `lib/locales/ru.ts` with all translation keys translated
2. Import it in `lib/i18n.tsx` and add `ru` to the language selector map
3. Add `'ru'` to the language type definition
4. Add the Russian flag/label to `LanguageSwitcher.tsx`
5. Handle RTL direction in `app/layout.tsx` if needed

The AI will automatically respond in Russian to Russian messages — no prompt change needed.
