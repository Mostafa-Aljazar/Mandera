'use client';

import { Eye } from 'lucide-react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  content?: string;
  dir?: 'ltr' | 'rtl';
}

const previewLabels = {
  en: {
    heading: 'Preview',
    badge: 'English',
    untitled: 'Untitled Page',
  },
  ar: {
    heading: 'معاينة',
    badge: 'العربية',
    untitled: 'صفحة بدون عنوان',
  },
} as const;

export default function PreviewModal({
  isOpen,
  onClose,
  title,
  content,
  dir = 'ltr',
}: PreviewModalProps) {
  const isRtl = dir === 'rtl';
  const labels = previewLabels[isRtl ? 'ar' : 'en'];

  return (
    <DirectionProvider dir={dir}>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          dir={dir}
          lang={isRtl ? 'ar' : 'en'}
          className={cn(
            'flex flex-col gap-0 p-0 max-w-4xl h-[min(85vh,900px)] overflow-hidden',
            isRtl ? 'font-[Cairo,sans-serif]' : 'font-outfit',
          )}
        >
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 pe-14 border-b bg-muted/30">
            <span className="flex justify-center items-center bg-primary/10 rounded-lg w-9 h-9 text-primary shrink-0">
              <Eye className="w-4 h-4" />
            </span>
            <div className="min-w-0 text-start">
              <p className="font-semibold text-sm">{labels.heading}</p>
              <p className="text-muted-foreground text-xs">{labels.badge}</p>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-background">
            <article
              dir={dir}
              lang={isRtl ? 'ar' : 'en'}
              className={cn(
                'preview-modal-content mx-auto px-5 sm:px-8 md:px-10 py-8 md:py-10 max-w-3xl text-start',
                isRtl ? 'font-[Cairo,sans-serif]' : 'font-outfit',
              )}
            >
              <h1 className="mb-6 font-extrabold text-foreground text-3xl sm:text-4xl md:text-5xl tracking-tight text-start">
                {title || labels.untitled}
              </h1>
              <div
                dir={dir}
                className="preview-rich-text rich-text-content pb-6 text-start"
                dangerouslySetInnerHTML={{ __html: content ?? '' }}
              />
            </article>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DirectionProvider>
  );
}
