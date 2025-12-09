---
name: pptx
description: "Presentation creation, editing, and analysis. When Claude needs to work with presentations (.pptx files) for: (1) Creating new presentations, (2) Modifying or editing content, (3) Working with layouts, (4) Adding comments or speaker notes"
---

# PPTX Creation, Editing, and Analysis

## Text Extraction

```bash
python -m markitdown path-to-file.pptx
```

## Creating Presentations with python-pptx

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RgbColor
from pptx.enum.text import PP_ALIGN

# Create presentation (16:9)
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Add blank slide
slide_layout = prs.slide_layouts[6]
slide = prs.slides.add_slide(slide_layout)

# Add title
title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(12), Inches(1))
title_frame = title_box.text_frame
title_para = title_frame.paragraphs[0]
title_para.text = "Presentation Title"
title_para.font.size = Pt(44)
title_para.font.bold = True
title_para.alignment = PP_ALIGN.CENTER

prs.save('presentation.pptx')
```

## Adding Content

```python
from pptx.enum.shapes import MSO_SHAPE

# Add rectangle
shape = slide.shapes.add_shape(
    MSO_SHAPE.RECTANGLE,
    Inches(1), Inches(2),
    Inches(4), Inches(3)
)
shape.fill.solid()
shape.fill.fore_color.rgb = RgbColor(0x1C, 0x28, 0x33)

# Add image
slide.shapes.add_picture('image.png', Inches(5), Inches(2), width=Inches(4))

# Add table
table = slide.shapes.add_table(
    rows=3, cols=4,
    left=Inches(1), top=Inches(3),
    width=Inches(10), height=Inches(2)
).table
table.cell(0, 0).text = "Header 1"
```

## Editing Existing Presentations

```python
from pptx import Presentation

prs = Presentation('existing.pptx')

for slide in prs.slides:
    for shape in slide.shapes:
        if shape.has_text_frame:
            for paragraph in shape.text_frame.paragraphs:
                for run in paragraph.runs:
                    if "old text" in run.text:
                        run.text = run.text.replace("old text", "new text")

prs.save('modified.pptx')
```

## Design Guidelines

### Color Palettes
1. **Classic Blue**: #1C2833, #2E4053, #AAB7B8, #F4F6F6
2. **Teal & Coral**: #5EA8A7, #277884, #FE4447, #FFFFFF
3. **Black & Gold**: #BF9A4A, #000000, #F4F6F6
4. **Forest Green**: #191A19, #4E9F3D, #1E5128, #FFFFFF

### Web-Safe Fonts
Arial, Helvetica, Times New Roman, Georgia, Courier New, Verdana, Tahoma, Trebuchet MS, Impact

### Layout Tips
- **Two-column layout (PREFERRED)** for charts/tables
- **Full-slide layout** for maximum impact
- **NEVER vertically stack** charts below text

## PPTX File Structure

```
ppt/
├── presentation.xml    # Main metadata
├── slides/            # Slide contents
├── notesSlides/       # Speaker notes
├── slideLayouts/      # Layout templates
├── slideMasters/      # Master templates
├── theme/             # Styling
└── media/             # Images
```

## Dependencies

```bash
pip install python-pptx
pip install "markitdown[pptx]"
```
