"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-[80] bg-black/40", className)}
      {...props}
    />
  )
}

// The design's dialog: a bottom sheet on phones, a centred panel from sm up.
function DialogContent({
  className,
  wide = false,
  ...props
}: DialogPrimitive.Popup.Props & { wide?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed bottom-0 left-1/2 z-[80] max-h-[92vh] w-full -translate-x-1/2 overflow-y-auto rounded-t-xl border bg-card shadow-2xl outline-none sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
          className
        )}
        {...props}
      />
    </DialogPortal>
  )
}

// Header block with a round icon, the title, a line of help and a close button.
function DialogHead({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div data-slot="dialog-head" className="flex items-start gap-3 border-b p-5">
      {icon && (
        <span className="grid size-9 flex-none place-items-center rounded-full bg-space-soft text-space-ink" aria-hidden>
          {icon}
        </span>
      )}
      <div className="flex-1">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
      </div>
      <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" className="-mt-1 -mr-2" aria-label="Close" />}>
        <XIcon />
      </DialogPrimitive.Close>
    </div>
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex justify-end gap-2", className)} {...props} />
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-base font-semibold", className)} {...props} />
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHead,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
