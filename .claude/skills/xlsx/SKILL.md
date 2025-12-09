---
name: xlsx
description: "Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When Claude needs to work with spreadsheets (.xlsx, .xlsm, .csv, .tsv, etc) for: (1) Creating new spreadsheets with formulas and formatting, (2) Reading or analyzing data, (3) Modify existing spreadsheets while preserving formulas, (4) Data analysis and visualization in spreadsheets"
---

# XLSX Creation, Editing, and Analysis

## CRITICAL: Use Formulas, Not Hardcoded Values

**Always use Excel formulas instead of calculating values in Python and hardcoding them.**

### WRONG
```python
total = df['Sales'].sum()
sheet['B10'] = total  # Hardcodes 5000
```

### CORRECT
```python
sheet['B10'] = '=SUM(B2:B9)'
```

## Reading Data with pandas

```python
import pandas as pd

df = pd.read_excel('file.xlsx')  # Default: first sheet
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)  # All sheets as dict

df.head()      # Preview data
df.info()      # Column info
df.describe()  # Statistics

df.to_excel('output.xlsx', index=False)
```

## Creating Excel Files with openpyxl

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active

# Add data
sheet['A1'] = 'Hello'
sheet['B1'] = 'World'
sheet.append(['Row', 'of', 'data'])

# Add formula
sheet['B2'] = '=SUM(A1:A10)'

# Formatting
sheet['A1'].font = Font(bold=True, color='FF0000')
sheet['A1'].fill = PatternFill('solid', start_color='FFFF00')
sheet['A1'].alignment = Alignment(horizontal='center')

# Column width
sheet.column_dimensions['A'].width = 20

wb.save('output.xlsx')
```

## Editing Existing Files

```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active

# Modify cells
sheet['A1'] = 'New Value'
sheet.insert_rows(2)
sheet.delete_cols(3)

# Add new sheet
new_sheet = wb.create_sheet('NewSheet')
new_sheet['A1'] = 'Data'

wb.save('modified.xlsx')
```

## Financial Model Color Standards

- **Blue text**: Hardcoded inputs
- **Black text**: Formulas and calculations
- **Green text**: Internal worksheet links
- **Red text**: External file links
- **Yellow background**: Key assumptions

## Number Formatting

- **Years**: Format as text ("2024" not "2,024")
- **Currency**: `$#,##0`
- **Zeros**: Display as "-"
- **Percentages**: `0.0%`
- **Negatives**: Use parentheses `(123)`

## Best Practices

- Use **pandas** for data analysis
- Use **openpyxl** for formulas and formatting
- Cell indices are 1-based
- Use `data_only=True` to read calculated values (Warning: saves will lose formulas)
- Always verify zero formula errors (#REF!, #DIV/0!, #VALUE!, #N/A, #NAME?)
