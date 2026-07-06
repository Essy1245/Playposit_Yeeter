import glob
from bs4 import BeautifulSoup
import json

for f in glob.glob('playposit_frame_*.html'):
    try:
        with open(f, encoding='utf-8') as file:
            soup = BeautifulSoup(file.read(), 'html.parser')
    except Exception:
        continue
    
    for el in soup.find_all(lambda tag: tag.name == 'i' or tag.name == 'span' or tag.name == 'p'):
        text = el.text.lower()
        cls = ' '.join(el.get('class', [])).lower()
        if 'correct' in cls or 'correct' in text or 'check' in cls or 'check' in text:
            print(f"File {f} -> <{el.name} class='{cls}'> {text[:50].strip()} </{el.name}>")
