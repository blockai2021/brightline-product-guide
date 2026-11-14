# Product iCode — Brand Assets

> Design source: **Product Icode / BINGOBRAND proposal (2026-09-18)**. These are proposed design assets; confirm final brand approval before external use.

## Canonical design source

- [38-page brand design PDF](https://drive.google.com/file/d/1nLPiHdXMx61t0GeUI0pknFbGoN5436J7/view)
- [Extracted Logo asset package — PNG + PDF](https://drive.google.com/file/d/1DN0oGMhIpm4ebWYl_Eq49cPN2hxOdMsg/view)
- [Chinese usage guide](https://docs.google.com/document/d/1UuPR3j6RwUuEf1ij72Bwu3zg-K9ykgguw5o7C-MaWXI/edit)

**This directory currently contains this guidance file only.** The original binary PNG/PDF files must be committed by the website's editor or a Git client with binary upload support. Do not treat Drive URLs as website asset URLs; download the originals and commit them into this repository before using them in UI code.

## Expected versioned files in this directory

```text
public/brand/product-icode/
  README.md
  01_Primary_Horizontal.png
  02_Stacked_Vertical.png
  03_Compact_Lockup.png
  04_Icon_Only.png
  05_Horizontal_TwoLine.png
```

The original ZIP also provides corresponding .pdf derivatives for design/reference. Prefer storing those in `docs/brand/product-icode/source-pdf/` or in Drive, rather than serving 9 MB of PDFs in `public/`.

## Website usage

- Desktop admin header: `/brand/product-icode/01_Primary_Horizontal.png`
- Collapsed/mobile sidebar and favicon source: `/brand/product-icode/04_Icon_Only.png`; create favicon after verifying dimensions and transparency.
- Compact card: `/brand/product-icode/03_Compact_Lockup.png`
- Vertical promotions: `/brand/product-icode/02_Stacked_Vertical.png`
- Alternative narrow layout: `/brand/product-icode/05_Horizontal_TwoLine.png`

Use the **actual original files**, with correct aspect ratio, padding and contrast. Do **not** recreate the mark with AI or emoji. The design features a **blue flag/lighthouse P/I-shaped symbol**, not a blue-green interlocking-link symbol.

Proposal colors: primary blue `#1969FC`, dark blue `#003B97`. Font references: Franie / OPPO Sans — do not commit or distribute font files.

Do not replace a customer's consumer-facing brand logo with the platform logo. Product iCode Connect retains its product name; the Product iCode visual identity is the parent/endorsing mark.

## Integration checklist

1. Download the exact package linked above, extract and inspect files.
2. Commit the five original PNGs to the expected paths (no regeneration). Put PDF originals in the documentation location if needed.
3. Update the admin logo, collapsed icon and favicon in a **separate UI-only PR/commit**.
4. Test desktop/mobile logo clarity, 1x/2x display, accessibility alt text, dark/light backgrounds.
5. Build and check routes. No GTIN/Serial/Digital Link/Printing business logic changes.

**Important:** files referenced above will return 404 until the image files are committed.
