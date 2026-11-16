import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Tip } from "@/components/Tip"

// The design's buttons: rounded-md, text-sm medium, colour transitions only.
// `space` takes the colour of the current Study Space.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors select-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground enabled:hover:bg-primary/90",
        space: "bg-space text-white enabled:hover:bg-space-ink",
        outline: "border border-input bg-card enabled:hover:bg-muted",
        ghost: "enabled:hover:bg-muted",
        secondary: "bg-muted enabled:hover:bg-border/60",
        destructive: "bg-destructive text-white enabled:hover:bg-destructive/90",
        link: "px-0 text-space underline-offset-4 enabled:hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        default: "h-9 px-4",
        lg: "h-10 px-5",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// A tooltip names what an icon button does (its aria-label) and, while any button is
// disabled, says why (`disabledReason`), so the Student can see what is missing or
// what the app is waiting for.
function Button({
  className,
  variant = "default",
  size = "default",
  disabledReason,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { disabledReason?: string }) {
  return (
    <Tip
      text={props.disabled ? disabledReason : size === "icon" || size === "icon-sm" ? props["aria-label"] : undefined}
      fill={typeof className === "string" && className.includes("w-full")}
    >
      <ButtonPrimitive
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    </Tip>
  )
}

export { Button, buttonVariants }
