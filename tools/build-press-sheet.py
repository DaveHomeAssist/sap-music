"""Build the public press PDF and text bio from the shared, verified copy."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
PRESS = ROOT / 'erosyn/02-press-kit'
data = json.loads((PRESS / 'press-copy.json').read_text())
output = PRESS / 'one-sheet/erosyn-one-sheet-press-v01.pdf'
c = canvas.Canvas(str(output), pagesize=(612, 792), invariant=1)
c.setTitle('Erosyn | Artist press sheet')
c.setAuthor('Erosyn')
c.setSubject('Biography, Scorcher release links, and booking contact')
white, muted, red = map(HexColor, ['#f4efe7', '#b9b5b0', '#ff3434'])
c.setFillColor(HexColor('#09090b')); c.rect(0, 0, 612, 792, fill=1, stroke=0)
c.setFillColor(red); c.rect(40, 756, 532, 3, fill=1, stroke=0)

def text(value, x, y, size=12, color=white, bold=False):
    c.setFillColor(color); c.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    c.drawString(x, y, value)

def paragraph(value, x, top, width, size=12, leading=17):
    style = ParagraphStyle('copy', fontName='Helvetica', fontSize=size, leading=leading, textColor=white)
    p = Paragraph(escape(value), style); _, height = p.wrap(width, 500)
    p.drawOn(c, x, top-height)
    return top-height

def link(label, url, x, y, size=12):
    text(label, x, y, size, white, True)
    w=c.stringWidth(label, 'Helvetica-Bold', size)
    c.setStrokeColor(red); c.line(x, y-4, x+w, y-4)
    c.linkURL(url, (x, y-5, x+w, y+size), relative=0, thickness=0)

text('ARTIST / PRESS SHEET', 40, 735, 10, red, True)
text(data['artist'].upper(), 40, 679, 48, white, True)
text(data['tagline'], 40, 652, 15, muted)
text('PRODUCER + DJ  /  MIAMI, FL', 40, 625, 10, red, True)
text('BIO', 40, 584, 10, red, True)
bottom=paragraph(data['bio'], 40, 568, 330)
assert bottom > 435, 'Bio exceeds its text area'
photo=ImageReader(str(ROOT/'erosyn/web/erosyn-press-photo-square-1000.jpg'))
c.drawImage(photo, 416, 486, width=156, height=156, preserveAspectRatio=True, mask='auto')
c.setStrokeColor(HexColor('#4b151b')); c.rect(416, 486, 156, 156, fill=0, stroke=1)
text('LATEST RELEASE', 40, 435, 10, red, True)
c.setFillColor(HexColor('#181214')); c.roundRect(40, 273, 532, 147, 8, fill=1, stroke=0)
c.drawImage(ImageReader(str(ROOT/'erosyn/web/releases/scorcher.jpg')), 54, 287, width=119, height=119)
text(data['release']['title'], 192, 376, 30, white, True)
text('Single  /  November 5, 2026', 192, 353, 12, muted)
text('Dubstep  /  3:30', 192, 334, 12, muted)
link('Spotify', data['release']['spotify'], 192, 300, 12)
link('Apple Music', data['release']['appleMusic'], 262, 300, 12)
link('SoundCloud', data['release']['soundcloud'], 367, 300, 12)
text('BOOKING + PRESS', 40, 240, 10, red, True)
bottom=paragraph(data['booking'], 40, 223, 532, 12, 17)
assert bottom > 150, 'Booking copy exceeds its text area'
link(data['email'], 'mailto:'+data['email'], 40, 137, 18)
link('erosynmusic.com', data['website'], 40, 102, 18)
text('ARTIST PROFILES', 40, 63, 9, muted, True)
link('SoundCloud', 'https://soundcloud.com/erosynmusic', 40, 42, 10)
link('Spotify', 'https://open.spotify.com/artist/4wR3loMCdXnWA2GJBjaBfP', 137, 42, 10)
link('Apple Music', 'https://music.apple.com/us/artist/erosyn/6821129153', 203, 42, 10)
text('UPDATED NOVEMBER 6, 2026', 422, 42, 8, muted)
c.showPage(); c.save()
(PRESS/'press-bio.md').write_text(f"# {data['artist']}\n\n{data['tagline']}\n\n## Biography\n\n{data['bio']}\n\n## Booking and press\n\n{data['booking']}\n\nEmail: [{data['email']}](mailto:{data['email']})\n\nWebsite: [erosynmusic.com]({data['website']})\n\n## Scorcher\n\nReleased November 5, 2026. Dubstep. 3:30.\n\n- [Spotify]({data['release']['spotify']})\n- [Apple Music]({data['release']['appleMusic']})\n- [SoundCloud]({data['release']['soundcloud']})\n")
print(output)
