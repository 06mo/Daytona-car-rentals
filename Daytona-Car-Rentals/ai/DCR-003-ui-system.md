# DCR-003 — UI Component System

**Owner:** Claude
**Status:** Complete
**Depends on:** DCR-001

---

## Design Tokens

All tokens are defined as Tailwind CSS custom values in `tailwind.config.ts`.

### Colors

```ts
colors: {
  brand: {
    50:  '#fff7ed',
    100: '#ffedd5',
    400: '#fb923c',
    500: '#f97316',   // Primary CTA
    600: '#ea580c',   // Hover state
    700: '#c2410c',   // Active / pressed
  },
  neutral: {
    50:  '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  success: { 100: '#dcfce7', 700: '#15803d' },
  warning: { 100: '#fef9c3', 700: '#a16207' },
  error:   { 100: '#fee2e2', 700: '#b91c1c' },
  info:    { 100: '#dbeafe', 700: '#1d4ed8' },
}
```

### Typography

```ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
}
fontSize: {
  xs:   ['0.75rem',  { lineHeight: '1rem' }],
  sm:   ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem',     { lineHeight: '1.5rem' }],
  lg:   ['1.125rem', { lineHeight: '1.75rem' }],
  xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
  '2xl':['1.5rem',   { lineHeight: '2rem' }],
  '3xl':['1.875rem', { lineHeight: '2.25rem' }],
  '4xl':['2.25rem',  { lineHeight: '2.5rem' }],
}
```

### Spacing / Radius / Shadow

```ts
borderRadius: {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
}
boxShadow: {
  sm:  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md:  '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg:  '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  card:'0 2px 8px 0 rgb(0 0 0 / 0.08)',
}
```

---

## Component Catalogue

### `Button`

**File:** `components/ui/Button.tsx`

```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}
```

| Variant | Base classes |
|---|---|
| `primary` | `bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700` |
| `secondary` | `bg-neutral-100 text-neutral-800 hover:bg-neutral-200` |
| `ghost` | `bg-transparent text-brand-600 hover:bg-brand-50` |
| `danger` | `bg-error-700 text-white hover:bg-red-800` |
| `outline` | `border border-neutral-300 text-neutral-700 hover:bg-neutral-50` |

- `loading` shows a `Spinner` and sets `disabled`
- `fullWidth` applies `w-full`
- All variants: `rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-500`

---

### `Input`

**File:** `components/ui/Input.tsx`

```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
}
```

- Wraps `<label>` + `<input>` + optional error/hint message
- Error state: `border-error-700 focus:ring-error-700`
- Default: `border-neutral-300 focus:ring-brand-500`
- Use `react-hook-form` `{...register('field')}` spread pattern

---

### `Select`

**File:** `components/ui/Select.tsx`

```ts
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}
```

---

### `Card`

**File:** `components/ui/Card.tsx`

```ts
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean   // adds hover:shadow-md transition
  onClick?: () => void
}
```

- Default: `bg-white rounded-xl shadow-card`
- `hover` adds cursor-pointer + shadow transition

---

### `Modal`

**File:** `components/ui/Modal.tsx`

```ts
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  footer?: React.ReactNode
}
```

- Uses `@headlessui/react` `Dialog` for a11y (focus trap, Escape key)
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Panel: `bg-white rounded-xl shadow-lg`

---

### `Badge`

**File:** `components/ui/Badge.tsx`

```ts
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}
```

Used for booking status, verification status, vehicle category labels.

| Variant | Classes |
|---|---|
| `default` | `bg-neutral-100 text-neutral-700` |
| `success` | `bg-success-100 text-success-700` |
| `warning` | `bg-warning-100 text-warning-700` |
| `error` | `bg-error-100 text-error-700` |
| `info` | `bg-info-100 text-info-700` |

---

### `Spinner`

**File:** `components/ui/Spinner.tsx`

```ts
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'brand' | 'white' | 'neutral'
}
```

SVG-based animated ring. `sm` = 16px, `md` = 24px, `lg` = 40px.

---

### `Toast`

**File:** `components/ui/Toast.tsx` + `components/providers/ToastProvider.tsx`

```ts
// Hook usage
const { toast } = useToast()
toast.success('Booking confirmed!')
toast.error('Payment failed. Please try again.')
toast.info('Documents under review.')
```

- Renders in a portal at `bottom-right`
- Auto-dismisses after 4s; hover pauses timer
- Powered by `react-hot-toast` or custom context — keep API identical

---

## Usage Rules

1. **Never hardcode colors.** Always use Tailwind token classes or `brand-*` / `neutral-*` utilities.
2. **`className` prop is always last** in the merge order — consumer overrides win. Use `clsx` + `tailwind-merge` via a `cn()` utility in `lib/utils/cn.ts`.
3. **All interactive elements** must have visible focus rings (`focus-visible:ring-2`).
4. **Loading states** block double-submission: Button `loading` prop disables the element.
5. **Error messages** on form fields are always associated with the input via `aria-describedby`.
6. **No inline styles.** No `style={{}}` except for dynamic values that cannot be expressed as Tailwind classes (e.g., upload progress bar width).
7. **Server Components by default.** Only add `'use client'` when the component needs state, effects, or event handlers.

---

## cn() utility

**File:** `lib/utils/cn.ts`

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Install: `npm install clsx tailwind-merge`

---

## Dependencies to install

```bash
npm install @headlessui/react react-hook-form zod @hookform/resolvers clsx tailwind-merge react-hot-toast
```
