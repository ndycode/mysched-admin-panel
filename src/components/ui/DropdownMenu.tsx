'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, Circle } from 'lucide-react'

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
        inset?: boolean
    }
>(({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
            'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus-visible:shadow-none focus:shadow-none data-[state=open]:bg-accent',
            inset && 'pl-8',
            className,
        )}
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
    DropdownMenuPrimitive.SubTrigger.displayName

import { ReactLenis } from 'lenis/react'

const DropdownMenuSubContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, children, style, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const transition = prefersReducedMotion
        ? { duration: 0.18, ease: 'easeOut' as const }
        : { type: 'spring' as const, stiffness: 360, damping: 22, mass: 1 }

    return (
        <DropdownMenuPrimitive.SubContent asChild ref={ref} sideOffset={10} {...props}>
            <motion.div
                initial={{
                    opacity: 0,
                    scale: 0.95,
                    filter: 'blur(4px)',
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                }}
                exit={{
                    opacity: 0,
                    scale: 0.95,
                    filter: 'blur(4px)',
                }}
                transition={transition}
                className={cn(
                    'z-[10000] min-w-[9.5rem] overflow-hidden rounded-2xl border border-border/70 bg-background/98 text-popover-foreground ring-1 ring-border/40 backdrop-blur-sm',
                    className,
                )}
                style={{
                    minWidth: 'max(var(--radix-dropdown-menu-trigger-width), 10rem)',
                    willChange: 'transform, opacity',
                    transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
                    ...style,
                }}
            >
                <ReactLenis
                    root={false}
                    options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}
                    className="max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto p-2"
                >
                    {children as any}
                </ReactLenis>
            </motion.div>
        </DropdownMenuPrimitive.SubContent>
    )
})
DropdownMenuSubContent.displayName =
    DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, children, sideOffset = 10, style, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const transition = prefersReducedMotion
        ? { duration: 0.18, ease: 'easeOut' as const }
        : { type: 'spring' as const, stiffness: 360, damping: 22, mass: 1 }

    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content asChild ref={ref} sideOffset={sideOffset} {...props}>
                <motion.div
                    initial={{
                        opacity: 0,
                        scale: 0.95,
                        filter: 'blur(4px)',
                    }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        filter: 'blur(0px)',
                    }}
                    exit={{
                        opacity: 0,
                        scale: 0.95,
                        filter: 'blur(4px)',
                    }}
                    transition={transition}
                    data-lenis-prevent
                    className={cn(
                        'z-[10000] min-w-[9.5rem] overflow-hidden rounded-2xl border border-border/70 bg-background/80 text-popover-foreground ring-1 ring-border/40 backdrop-blur-xl',
                        className,
                    )}
                    style={{
                        minWidth: 'max(var(--radix-dropdown-menu-trigger-width), 10rem)',
                        willChange: 'transform, opacity',
                        transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
                        ...style,
                    }}
                >
                    <ReactLenis
                        root={false}
                        options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}
                        className="max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto p-2"
                    >
                        {children as any}
                    </ReactLenis>
                </motion.div>
            </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
    )
})
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
        inset?: boolean
    }
>(({ className, inset, children, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const itemTransition = prefersReducedMotion
        ? { duration: 0.12, ease: 'easeOut' as const }
        : { type: 'spring' as const, stiffness: 360, damping: 22, mass: 0.8 }

    return (
        <DropdownMenuPrimitive.Item asChild {...props}>
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={itemTransition}
                className={cn(
                    'relative flex cursor-default select-none items-center rounded-lg px-3.5 py-2.5 text-sm font-medium outline-none transition-colors hover:bg-muted/70 focus:bg-accent focus:text-accent-foreground focus-visible:shadow-none focus:shadow-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    inset && 'pl-8',
                    className,
                )}
            >
                {children}
            </motion.div>
        </DropdownMenuPrimitive.Item>
    )
})
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground focus-visible:shadow-none focus:shadow-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className,
        )}
        checked={checked}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Check className="h-4 w-4" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
    DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground focus-visible:shadow-none focus:shadow-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className,
        )}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Circle className="h-2 w-2 fill-current" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
        inset?: boolean
    }
>(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
        ref={ref}
        className={cn(
            'px-2 py-1.5 text-sm font-semibold',
            inset && 'pl-8',
            className,
        )}
        {...props}
    />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-muted', className)}
        {...props}
    />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
    return (
        <span
            className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
            {...props}
        />
    )
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuGroup,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuRadioGroup,
}
