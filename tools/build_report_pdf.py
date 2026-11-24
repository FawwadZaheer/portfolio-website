"""Optional: rebuild docs/report/Fawwad_Portfolio_Report.pdf from report.html with headless Chrome.
(Without Python/Playwright: open report.html in Chrome, Ctrl+P, Save as PDF.)"""
import asyncio, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'docs' / 'report' / 'report.html'
OUT = ROOT / 'docs' / 'report' / 'Fawwad_Portfolio_Report.pdf'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME') or None)
        pg = await b.new_page()
        await pg.goto(SRC.as_uri())
        await pg.evaluate('document.fonts.ready')
        await pg.pdf(path=str(OUT), format='A4', print_background=True, prefer_css_page_size=True,
                     display_header_footer=True, header_template='<span></span>',
                     footer_template='<div style="font-size:8px;width:100%;text-align:center;font-family:monospace">'
                                     'Fawwad Zaheer Rizvi · Interactive 3D Web Portfolio · <span class="pageNumber"></span></div>')
        await b.close()
    print('wrote', OUT)

asyncio.run(main())
