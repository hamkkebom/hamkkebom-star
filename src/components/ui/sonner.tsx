"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-2xl dark:group-[.toaster]:bg-slate-900 dark:group-[.toaster]:text-white dark:group-[.toaster]:border-slate-800 rounded-2xl p-4 font-bold max-w-[360px] mx-auto",
          description: "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 text-xs font-medium",
          actionButton: "group-[.toast]:bg-violet-600 group-[.toast]:text-white rounded-xl font-bold px-4 hover:scale-95 transition-transform",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-400 rounded-xl",
          success: "group-[.toaster]:text-emerald-500 dark:group-[.toaster]:text-emerald-400",
          error: "group-[.toaster]:text-rose-500 dark:group-[.toaster]:text-rose-400",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-emerald-500" />,
        info: <InfoIcon className="size-5 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-5 text-amber-500" />,
        error: <OctagonXIcon className="size-5 text-rose-500" />,
        loading: <Loader2Icon className="size-5 animate-spin text-violet-500" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
