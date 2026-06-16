from pypdf import PdfReader
import re

path = r"c:\Users\Vespaaaa\Downloads\main (7).pdf"
reader = PdfReader(path)
pages = [p.extract_text() or "" for p in reader.pages]
text = "\n".join(pages)

keywords = [
    "Groq", "Ollama", "Prisma", "pgAdmin", "NeonDB", "Redis", "Upstash",
    "validateAndSanitize", "docker", "Nginx", "Cloudflare", "survey-flow",
    "conclusion", "perspectives", "optimisation", "sécurité", "K-Means",
    "chapitre 3", "chapitre 4", "chapitre 5", "introduction générale",
]
print("=== KEYWORD HITS ===")
for kw in keywords:
    hits = [i + 1 for i, p in enumerate(pages) if kw.lower() in p.lower()]
    if hits:
        print(f"{kw}: pages {hits[:15]}{'...' if len(hits)>15 else ''} ({len(hits)} total)")

print("\n=== CHAPTER INTROS (first lines) ===")
for i, p in enumerate(pages):
    if re.search(r"^(Chapitre|CHAPITRE|\d+\s+[A-ZÀ-Ü])", p.strip()[:80]):
        first = p.strip().split("\n")[0][:100]
        print(f"p{i+1}: {first}")

print("\n=== CONCLUSION / PERSPECTIVES ===")
for i, p in enumerate(pages):
    if re.search(r"conclusion|perspectives", p, re.I):
        print(f"--- page {i+1} ---")
        print(p[:2500])
        print()

# deployment section
print("\n=== DEPLOYMENT SECTION SAMPLE ===")
for i, p in enumerate(pages):
    if "5.4" in p or "déploiement" in p.lower() or "deploiement" in p.lower():
        if "5.4" in p or "Docker" in p:
            print(f"--- page {i+1} ---")
            print(p[:3000])
            print()
