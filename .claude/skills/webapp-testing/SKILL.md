---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
---

# Web Application Testing

Test local web applications with Python Playwright scripts.

## Basic Playwright Script

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')  # CRITICAL: Wait for JS

    # Take screenshot
    page.screenshot(path='screenshot.png', full_page=True)

    # Interact
    page.click('button[type="submit"]')
    page.fill('input[name="email"]', 'test@example.com')

    # Get content
    content = page.content()
    text = page.locator('.result').text_content()

    browser.close()
```

## Starting Server and Testing

```python
import subprocess
import time
from playwright.sync_api import sync_playwright

server = subprocess.Popen(['npm', 'run', 'dev'], cwd='/path/to/project')
time.sleep(5)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='test-result.png')
        browser.close()
finally:
    server.terminate()
```

## Common Selectors

```python
# By text
page.click('text=Submit')

# By role
page.click('role=button[name="Submit"]')

# By CSS
page.click('.btn-primary')
page.click('#submit-button')
page.click('button[type="submit"]')

# By test ID (recommended)
page.click('[data-testid="submit-btn"]')

# Chained
page.locator('.form').locator('button').click()
```

## Assertions

```python
from playwright.sync_api import expect

expect(page.locator('.success-message')).to_be_visible()
expect(page.locator('h1')).to_have_text('Welcome')
expect(page.locator('.item')).to_have_count(5)
expect(page).to_have_url('http://localhost:5173/dashboard')
```

## Console Logging

```python
page.on('console', lambda msg: print(f'Browser: {msg.text}'))
```

## Decision Tree

```
Is it static HTML?
├─ Yes → Read HTML, write Playwright script
└─ No (dynamic) → Is server running?
    ├─ No → Start server first
    └─ Yes → Reconnaissance-then-action:
        1. Navigate + wait for networkidle
        2. Screenshot/inspect DOM
        3. Identify selectors
        4. Execute actions
```

## Common Pitfall

**Don't** inspect DOM before `networkidle` on dynamic apps
**Do** always `page.wait_for_load_state('networkidle')` first

## Dependencies

```bash
pip install playwright
playwright install chromium
```
