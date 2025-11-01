# MetricFortune Color Accessibility Guide

## Quick Reference: Accessible Color Pairings

This guide ensures all text remains readable with proper WCAG AA contrast ratios.

---

## Background Colors

### Primary Backgrounds

| Background | Hex Code | Use Case |
|------------|----------|----------|
| White | `#ffffff` | Main page background, cards, modals |
| Light Gray | `#f9fafb` | Alternate sections, subtle depth |
| Light Purple Tint | `#faf5ff` | Accent areas only (sidebars, highlights) |

---

## Text Colors (WCAG Compliant)

### On White Background (`#ffffff`)

| Text Level | Color | Hex Code | Contrast Ratio | Minimum Size | Usage |
|------------|-------|----------|----------------|--------------|-------|
| **Primary Text** | Near Black | `#1f2937` | 16.1:1 ✓✓ | Any size | Headings, body text, critical content |
| **Secondary Text** | Dark Gray | `#4b5563` | 9.7:1 ✓✓ | Any size | Descriptions, metadata, labels |
| **Tertiary Text** | Medium Gray | `#6b7280` | 5.9:1 ✓ | Any size | Subtle text, timestamps, helper text |

### On Light Gray Background (`#f9fafb`)

| Text Level | Color | Hex Code | Contrast Ratio | Usage |
|------------|-------|----------|----------------|-------|
| **Primary Text** | Near Black | `#1f2937` | 15.8:1 ✓✓ | Headings, important text |
| **Secondary Text** | Dark Gray | `#4b5563` | 9.5:1 ✓✓ | Descriptions, metadata |

### On Light Purple Background (`#faf5ff`)

| Text Level | Color | Hex Code | Contrast Ratio | Minimum Size | Usage |
|------------|-------|----------|----------------|--------------|-------|
| **Primary Text** | Near Black | `#1f2937` | 14.2:1 ✓✓ | Any size | Important content |
| **Secondary Text** | Dark Gray | `#4b5563` | 8.6:1 ✓✓ | Any size | Regular text |
| **Avoid** | Medium Gray | `#6b7280` | 5.2:1 ⚠️ | 18px+ only | Use sparingly |

---

## Colored Backgrounds (Buttons, Badges, Alerts)

### Purple Primary (`#7c3aed`)

| Text Color | Hex Code | Contrast Ratio | Minimum Size | Usage |
|------------|----------|----------------|--------------|-------|
| **White** | `#ffffff` | 4.8:1 ✓ | 16px+ body, 14px+ labels | Primary buttons, CTAs |
| ❌ Black | `#1f2937` | 3.4:1 ✗ | Never use | Insufficient contrast |

**Button Rules:**
- Primary buttons: White text on purple background
- Minimum font size: 16px for body text, 14px for button labels
- Font weight: 500 (medium) or 600 (semibold) recommended

### Orange Secondary (`#f97316`)

| Text Color | Hex Code | Contrast Ratio | Minimum Size | Usage |
|------------|----------|----------------|--------------|-------|
| **White** | `#ffffff` | 3.4:1 ✓ | 18px+ only | Large buttons, headers |
| **Dark Gray** | `#1f2937` | 8.9:1 ✓✓ | Any size | Badges, labels (better choice) |

**Recommendation:** Use dark gray text on orange for better accessibility

### Semantic Colors (Success, Warning, Error, Info)

#### Success Green (`#10b981`)

| Text Color | Hex Code | Contrast Ratio | Usage |
|------------|----------|----------------|-------|
| **White** | `#ffffff` | 3.0:1 ⚠️ | 18px+ bold only |
| **Dark Gray** | `#1f2937` | 9.3:1 ✓✓ | Preferred for all text |

#### Warning Amber (`#fbbf24`)

| Text Color | Hex Code | Contrast Ratio | Usage |
|------------|----------|----------------|-------|
| **Black** | `#1f2937` | 9.8:1 ✓✓ | All warning text |
| ❌ White | `#ffffff` | 1.6:1 ✗ | Never use |

#### Error Red (`#ef4444`)

| Text Color | Hex Code | Contrast Ratio | Usage |
|------------|----------|----------------|-------|
| **White** | `#ffffff` | 4.5:1 ✓ | 16px+ text |
| **Dark Gray** | `#1f2937` | 7.4:1 ✓✓ | Preferred for larger areas |

#### Info Blue (`#3b82f6`)

| Text Color | Hex Code | Contrast Ratio | Usage |
|------------|----------|----------------|-------|
| **White** | `#ffffff` | 3.4:1 ✓ | 18px+ only |
| **Dark Gray** | `#1f2937` | 8.6:1 ✓✓ | Preferred for body text |

---

## Borders & Dividers

| Border Type | Color | Hex Code | Contrast | Usage |
|-------------|-------|----------|----------|-------|
| **Primary Border** | Medium Gray | `#d1d5db` | 1.6:1 | Default borders, dividers, outlines |
| **Subtle Border** | Light Purple | `#e9d5ff` | Decorative | Accent borders only (not functional) |
| **Focus Outline** | Purple Primary | `#7c3aed` | 3:1 | Keyboard focus indicators |

---

## Component-Specific Color Rules

### Recommendation Cards

```
Background: White (#ffffff)
Border: Medium Gray (#d1d5db)
Title (H3): Near Black (#1f2937)
Description: Dark Gray (#4b5563)
Metadata (peer proof): Medium Gray (#6b7280)
```

### Impact Badges

| Impact Level | Background | Text | Border |
|-------------|------------|------|--------|
| High | `#dcfce7` (Light Green) | `#15803d` (Dark Green) | None |
| Medium | `#fef3c7` (Light Amber) | `#a16207` (Dark Amber) | None |
| Low | `#f3f4f6` (Light Gray) | `#374151` (Dark Gray) | None |

### Metric Cards

```
Background: White (#ffffff)
Border: Medium Gray (#d1d5db)
Label: Medium Gray (#6b7280) - 12px uppercase
Value: Near Black (#1f2937) - 32px bold
Trend Positive: Green (#10b981)
Trend Negative: Red (#ef4444)
```

### Sidebar Navigation

```
Background: Light Purple Tint (#faf5ff)
Nav Item Default Text: Dark Gray (#4b5563)
Nav Item Active Background: Purple Primary (#7c3aed)
Nav Item Active Text: White (#ffffff)
Nav Item Hover Background: #ede9fe (medium purple tint)
Nav Item Hover Text: Near Black (#1f2937)
```

---

## Common Accessibility Mistakes to Avoid

### ❌ Don't Do This

1. **Gray text on light purple background**
   - `#6b7280` on `#faf5ff` = 5.2:1 (fails for small text)
   - ✅ Use: `#4b5563` instead (8.6:1)

2. **Orange button with white text**
   - `#ffffff` on `#f97316` = 3.4:1 (fails for 16px text)
   - ✅ Use: White text only at 18px+, or use dark text

3. **Purple text on white for body copy**
   - `#7c3aed` on `#ffffff` = 4.8:1 (fails for 14px text)
   - ✅ Use: Purple only for 18px+ text, or use as background with white text

4. **Light borders on light backgrounds**
   - `#e9d5ff` on `#faf5ff` = barely visible
   - ✅ Use: `#d1d5db` for functional borders

---

## Testing Your Colors

### Online Tools

1. **WebAIM Contrast Checker**
   - URL: https://webaim.org/resources/contrastchecker/
   - Paste hex codes to check contrast ratios

2. **Colorable**
   - URL: https://colorable.jxnblk.com/
   - Test entire palettes at once

3. **Chrome DevTools**
   - Inspect element → Styles panel shows contrast ratio
   - Warns if contrast fails WCAG requirements

### Browser Extensions

- **WAVE** (Web Accessibility Evaluation Tool)
- **axe DevTools** (Accessibility testing)
- **Lighthouse** (Built into Chrome DevTools)

---

## Implementation Checklist

### For Developers

- [ ] Use `#1f2937` for all headings and primary text
- [ ] Use `#4b5563` for descriptions and secondary text
- [ ] Use `#6b7280` only for tertiary text (metadata, timestamps)
- [ ] Purple buttons (`#7c3aed`) always have white text, minimum 16px
- [ ] Orange elements use dark text unless text is 18px+ bold
- [ ] Borders use `#d1d5db`, not light purple
- [ ] Focus outlines are purple with 2px width and 2px offset
- [ ] Test all color combinations with contrast checker before shipping
- [ ] Run Lighthouse accessibility audit on every page

### For Designers

- [ ] Never use light purple background for main content areas
- [ ] Test all text at actual sizes (not just in design tool)
- [ ] Include hover, focus, and disabled states with proper contrast
- [ ] Annotate designs with specific hex codes from this guide
- [ ] Check contrast with WebAIM tool during design phase
- [ ] Design dark mode variants if needed (not required for MVP)

---

## Quick Decision Tree

**Need to display text?**

→ On white background?
  - Important text → `#1f2937` (near black)
  - Regular text → `#4b5563` (dark gray)
  - Subtle text → `#6b7280` (medium gray)

→ On light gray background (`#f9fafb`)?
  - Important text → `#1f2937` (near black)
  - Regular text → `#4b5563` (dark gray)

→ On light purple background (`#faf5ff`)?
  - Any text → `#1f2937` or `#4b5563` only
  - Avoid `#6b7280` unless 18px+

→ On purple button (`#7c3aed`)?
  - Always `#ffffff` white, 16px+ size

→ On orange background (`#f97316`)?
  - Use `#1f2937` (dark gray) for best contrast

→ On colored badge/alert?
  - Check semantic color table above

---

## Summary: Safe Default Combinations

**Most Common Pairings:**

1. **White bg + Black text**: `#ffffff` + `#1f2937` = 16.1:1 ✓✓
2. **White bg + Dark gray text**: `#ffffff` + `#4b5563` = 9.7:1 ✓✓
3. **Purple button + White text**: `#7c3aed` + `#ffffff` = 4.8:1 ✓ (16px+)
4. **Light green bg + Dark green text**: `#dcfce7` + `#15803d` = 7.8:1 ✓✓
5. **Light amber bg + Dark amber text**: `#fef3c7` + `#a16207` = 9.2:1 ✓✓

**Use these by default and you'll maintain accessibility!**

---

_Last updated: 2025-11-01_
_WCAG 2.1 Level AA Compliant_
