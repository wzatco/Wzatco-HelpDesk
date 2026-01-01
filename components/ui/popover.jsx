import * as React from "react"

const Popover = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <div className="relative inline-block">
      {React.Children.map(children, child =>
        React.cloneElement(child, { open, setOpen })
      )}
    </div>
  )
}

const PopoverTrigger = React.forwardRef(({ children, open, setOpen, asChild, ...props }, ref) => {
  return React.cloneElement(children, {
    ref,
    onClick: (e) => {
      e.stopPropagation()
      setOpen?.(!open)
      children.props.onClick?.(e)
    },
    ...props
  })
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef(({ 
  className, 
  align = "center",
  sideOffset = 4,
  children,
  open,
  setOpen,
  ...props 
}, ref) => {
  const contentRef = React.useRef(null)

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        setOpen?.(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen?.(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 w-72 rounded-md border border-slate-200 bg-white p-4 text-slate-950 shadow-md outline-none animate-in fade-in-0 zoom-in-95 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 ${
        align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2'
      } ${className || ''}`}
      style={{ top: `calc(100% + ${sideOffset}px)` }}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }

