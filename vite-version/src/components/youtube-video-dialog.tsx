import { cloneElement, useState, type MouseEventHandler, type ReactElement } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

export function youtubeThumbnail(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
}

export function YouTubeVideoDialog({
  videoId,
  title,
  children,
}: {
  videoId: string
  title: string
  children: ReactElement<{ onClick?: MouseEventHandler }>
}) {
  const [open, setOpen] = useState(false)
  const trigger = cloneElement(children, {
    onClick: (event) => {
      event.stopPropagation()
      children.props.onClick?.(event)
      setOpen(true)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="w-[min(96vw,72rem)] max-w-none border-white/15 bg-black p-0 text-white">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          YouTube video player for {title}
        </DialogDescription>
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            className="size-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}