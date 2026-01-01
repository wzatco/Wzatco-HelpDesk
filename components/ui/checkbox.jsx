import * as React from "react"
import { Check } from "lucide-react"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <button
      ref={ref}
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={`peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:focus-visible:ring-slate-300 ${
        checked ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white dark:bg-slate-950'
      } ${className || ''}`}
      {...props}
    >
      {checked && (
        <Check className="h-4 w-4" />
      )}
    </button>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }

