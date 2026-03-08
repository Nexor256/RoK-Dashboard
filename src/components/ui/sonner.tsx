import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-white/[0.08] group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-white/[0.06] group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:border-white/[0.08]",
          success: "group-[.toaster]:!border-emerald-500/20 group-[.toaster]:!text-emerald-400",
          error: "group-[.toaster]:!border-destructive/20 group-[.toaster]:!text-destructive",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
