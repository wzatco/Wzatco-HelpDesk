import * as React from "react"

const TooltipProvider = ({ children }) => {
  return <>{children}</>
}

const Tooltip = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <div className="relative inline-block">
      {React.Children.map(children, child =>
        React.cloneElement(child, { open, setOpen })
      )}
    </div>
  )
}

const TooltipTrigger = React.forwardRef(({ children, open, setOpen, asChild, ...props }, ref) => {
  return React.cloneElement(children, {
    ref,
    onMouseEnter: () => setOpen?.(true),
    onMouseLeave: () => setOpen?.(false),
    ...props
  })
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef(({ 
  className, 
  sideOffset = 4,
  children,
  open,
  ...props 
}, ref) => {
  if (!open) return null

  return (
    <div
      ref={ref}
      className={`absolute z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-slate-50 animate-in fade-in-0 zoom-in-95 dark:bg-slate-50 dark:text-slate-900 ${className || ''}`}
      style={{ 
        bottom: '100%', 
        left: '50%', 
        transform: 'translateX(-50%)',
        marginBottom: sideOffset
      }}
      {...props}
    >
      {children}
      <div 
        className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-50"
        style={{ marginTop: '-1px' }}
      />
    </div>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

