# Rio Tinto Tennis - UI Guidelines

This document outlines the design system and UI patterns used in the Rio Tinto Tennis frontend.

## Design Philosophy

- **Dark-first design**: Slate-900 background with high-contrast elements
- **Glass morphism**: Subtle backdrop blur and transparency for elevated surfaces
- **Micro-interactions**: Every interactive element has hover/focus states
- **Accessibility**: Focus rings, semantic HTML, and keyboard navigation support

## Color Palette

### Primary Colors
- **Emerald-500/600**: Primary actions, active states, success indicators
- **Slate-900**: Page background
- **Slate-800**: Card backgrounds
- **Slate-700**: Borders, dividers, secondary backgrounds
- **Slate-400**: Secondary text
- **Slate-100**: Primary text

### Accent Colors
- **Rose-500/600**: Destructive actions, errors, booked slots
- **Teal**: Gradients with emerald
- **White**: High-emphasis text and icons

### Usage Patterns
- Cards: `bg-slate-800` with `border-slate-700/50`
- Primary buttons: `bg-emerald-600 hover:bg-emerald-500`
- Secondary buttons: `bg-slate-700 hover:bg-slate-600`
- Destructive: `bg-rose-600 hover:bg-rose-500`
- Success states: `bg-emerald-500/10 border-emerald-500/30`
- Error states: `bg-rose-500/10 border-rose-500/30`

## Typography

### Scale
- **Page titles**: `text-2xl font-bold text-white`
- **Section headers**: `text-sm font-semibold uppercase tracking-wider text-slate-300`
- **Card titles**: `text-base font-semibold text-white`
- **Body text**: `text-sm text-slate-400`
- **Labels**: `text-xs text-slate-400 font-medium`
- **Helper text**: `text-xs text-slate-500`

### Font Stack
- Default sans-serif stack via Tailwind
- Antialiased rendering enabled
- Font feature settings for better typography

## Spacing System

### Page Layout
- **Page padding**: `p-4` mobile, `p-6` desktop
- **Max-width containers**: `max-w-2xl`, `max-w-3xl`, `max-w-4xl`, `max-w-5xl`
- **Section gaps**: `space-y-6` between major sections
- **Card padding**: `p-4` or `p-5`

### Component Spacing
- **Card internal gaps**: `gap-3` or `gap-4`
- **Form field gaps**: `space-y-4`
- **Button internal padding**: `py-2.5 px-4`
- **Input padding**: `py-2.5 px-3` (left padding increases with icons)

## Components

### Cards

```tsx
// Standard card
<div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 card-hover">
  {/* Content */}
</div>

// Card with accent ring (for active/booked states)
<div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 ring-1 ring-emerald-500/30 card-hover">
  {/* Content */}
</div>

// Empty state card
<div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
  {/* Icon, title, description, action */}
</div>
```

### Buttons

```tsx
// Primary button
<button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-3 transition-all duration-200 btn-press shadow-lg shadow-emerald-500/20">
  Label
</button>

// Secondary button
<button className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-medium transition-all duration-200 btn-press">
  Label
</button>

// Destructive button
<button className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-3 font-medium transition-all duration-200 btn-press shadow-lg shadow-rose-500/20">
  Label
</button>

// Icon button
<button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200 btn-press">
  <Icon className="w-5 h-5" />
</button>
```

### Form Inputs

```tsx
// Text input with icon
<div className="relative">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
    <Icon className="w-4 h-4" />
  </div>
  <input
    className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all duration-200 ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500/50"
    placeholder="Placeholder text"
  />
</div>

// Input with error state
<input
  className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-none ring-2 ring-rose-500/50 focus:ring-rose-500"
/>
```

### Status Badges

```tsx
// Active/Success badge
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
  <CheckIcon className="w-3.5 h-3.5" />
  Ativa
</span>

// Inactive badge
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 text-xs">
  Inativa
</span>

// Today badge
<span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
  Hoje
</span>
```

### Avatars

```tsx
// User avatar (in cards/lists)
<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-emerald-900/20">
  {initial}
</div>

// Large avatar (empty states)
<div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
  <Icon className="w-8 h-8 text-slate-600" />
</div>
```

### Loading States

```tsx
// Skeleton card
<div className="bg-slate-800 rounded-xl p-4 border border-slate-700/30">
  <div className="h-4 bg-slate-700 rounded-lg shimmer w-3/4" />
</div>

// Spinner in button
<button disabled>
  <SpinnerIcon className="w-5 h-5 animate-spin" />
  Loading...
</button>
```

## Layout Patterns

### Page Structure
```tsx
<div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
  {/* Header with title and actions */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-white text-2xl font-bold">Page Title</h1>
      <p className="text-slate-400 text-sm mt-0.5">Subtitle</p>
    </div>
    <button>Action</button>
  </div>

  {/* Section */}
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h2 className="text-slate-300 text-sm font-semibold uppercase tracking-wider">
          Section Title
        </h2>
      </div>
      <Link className="text-emerald-400 text-sm font-medium hover:text-emerald-300">
        Action
      </Link>
    </div>
    
    {/* Content */}
  </section>
</div>
```

### Two-Column Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

## Animation Classes

### Included in index.css
- `.card-hover`: Lift effect on hover with shadow
- `.btn-press`: Scale down on active state
- `.shimmer`: Animated gradient for skeletons
- `.fade-in`: Fade + slide up on mount
- `.scale-in`: Scale up from 0.95 on mount
- `.slide-up`: Slide up animation for forms

### Usage
```tsx
// Card with hover effect
<div className="bg-slate-800 rounded-xl p-4 card-hover">

// Button with press effect
<button className="btn-press">

// Skeleton loading
<div className="h-4 bg-slate-700 rounded shimmer w-1/2" />

// Animated entrance
<div className="fade-in">
```

## Icons

All icons are inline SVG components using Heroicons-style paths:

```tsx
function IconName({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
    </svg>
  );
}
```

### Standard Icon Sizes
- **Navigation**: `w-5 h-5`
- **In buttons**: `w-4 h-4` or `w-5 h-5`
- **In inputs**: `w-4 h-4`
- **Empty states**: `w-8 h-8`
- **Modals**: `w-7 h-7`

## Modal Patterns

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
  
  {/* Modal content */}
  <div className="relative bg-slate-800 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-sm p-6 scale-in border border-slate-700/50">
    {/* Header with icon */}
    <div className="text-center mb-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
        <Icon className="w-7 h-7 text-emerald-400" />
      </div>
      <h2 className="text-white text-xl font-bold">Modal Title</h2>
    </div>
    
    {/* Content */}
    
    {/* Actions */}
    <div className="flex gap-3 pt-2">
      <button className="flex-1 bg-slate-700 hover:bg-slate-600...">Cancel</button>
      <button className="flex-1 bg-emerald-600 hover:bg-emerald-500...">Confirm</button>
    </div>
  </div>
</div>
```

## Responsive Breakpoints

- **Mobile**: Default (< 640px)
- **Tablet/Small Desktop**: `sm:` (≥ 640px)
- **Desktop**: `md:` (≥ 768px) - rarely used
- **Large Desktop**: `lg:` (≥ 1024px) - rarely used

Primary responsive pattern:
```tsx
// Single column mobile, two columns on larger screens
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

// Larger padding on desktop
<div className="p-4 sm:p-6">

// Show/hide elements
<span className="hidden sm:inline">Desktop only text</span>
```

## Result Cards & Lists

### Summary Card
```tsx
<div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
  <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">
    Resumo
  </h3>
  <div className="grid grid-cols-3 gap-4">
    {/* Success stat */}
    <div className="text-center">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
        <CheckIcon className="w-6 h-6 text-emerald-400" />
      </div>
      <div className="text-2xl font-bold text-emerald-400">{count}</div>
      <div className="text-xs text-slate-500">Label</div>
    </div>
    {/* Repeat for other stats */}
  </div>
</div>
```

### Result Item Card
```tsx
// Success result
<div className="bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 transition-all duration-200 flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
    <CheckIcon className="w-5 h-5 text-emerald-400" />
  </div>
  <div className="flex-1 min-w-0">
    <div className="text-white text-sm font-medium truncate">{label}</div>
    <div className="text-emerald-400/70 text-xs">{subtitle}</div>
  </div>
  <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium shrink-0">
    Status
  </span>
</div>

// Warning/Skipped result
<div className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 transition-all duration-200 flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
    <AlertIcon className="w-5 h-5 text-amber-400" />
  </div>
  {/* ... */}
</div>

// Error result (with error message)
<div className="bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 transition-all duration-200 flex items-start gap-3">
  <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
    <CloseIcon className="w-5 h-5 text-rose-400" />
  </div>
  <div className="flex-1 min-w-0">
    <div className="text-white text-sm font-medium truncate">{label}</div>
    <div className="text-rose-400/70 text-xs">{subtitle}</div>
    <div className="text-rose-400/50 text-xs mt-1 italic">
      {errorMessage}
    </div>
  </div>
</div>
```

## Best Practices

1. **Always use transition classes**: `transition-all duration-200` on interactive elements
2. **Consistent border radius**: `rounded-xl` for cards, `rounded-lg` for buttons/inputs
3. **Focus states**: Use `focus:ring-2 focus:ring-emerald-500/50` on focusable elements
4. **Loading states**: Disable buttons and show spinners during async operations
5. **Error handling**: Display errors inline with appropriate styling
6. **Empty states**: Always provide helpful empty states with icons and CTAs
7. **Icons**: Always include icons in section headers and empty states
8. **Shadows**: Use `shadow-lg shadow-emerald-500/20` on primary buttons
9. **Opacity**: Use `/50` for borders, `/10` for subtle backgrounds, `/20` for medium
10. **Truncate**: Use `truncate` on text that might overflow, with `min-w-0` on parent
11. **Flex layouts**: Use `min-w-0` on text containers in flex layouts to enable truncation
12. **Status badges**: Use pill-shaped badges with matching status colors (emerald/amber/rose)
