# GTM diff: <code>minimal-before.json</code> → <code>minimal-after.json</code>

| | Added | Removed | Modified | Unchanged |
|---|---:|---:|---:|---:|
| Total | 2 | 1 | 2 | 3 |
| tags | 1 | 1 | 1 | 0 |
| triggers | 0 | 0 | 0 | 1 |
| variables | 0 | 0 | 1 | 0 |
| folders | 0 | 0 | 0 | 0 |
| built-in variables | 1 | 0 | 0 | 2 |

## Tags

### Added
- **Meta Pixel** <code>html</code>

### Removed
- **Old Pixel** <code>html</code>

### Modified
<details>
<summary><strong>GA4 - Page View</strong> <code>gaawe</code> — 1 field change</summary>

```diff
+ parameter[2] = {
  "key": "sendPageView",
  "type": "boolean",
  "value": "true"
}
```

</details>

## Variables

### Modified
<details>
<summary><strong>GA4 Config</strong> <code>gtcs</code> — 1 field change</summary>

```diff
~ parameter[0].value: "G-XXXXXX" → "G-YYYYYY"
```

</details>

## Built-in variables

### Added
- **Page Path** <code>pagePath</code>

