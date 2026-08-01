import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const { i18n } = useTranslation()
  const dir = i18n.language?.startsWith("ar") ? "rtl" : "ltr"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={80}
      dir={dir}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:max-w-md",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  );
}

export { Toaster }
