'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const PreviewModal = ({ isOpen, onClose, title, content }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {t('Preview:')} {title || t('Untitled Page')}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6 md:p-10 bg-background">
          <div className="max-w-3xl mx-auto space-y-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-outfit text-balance">
              {title}
            </h1>
            <div 
              className="rich-text-content pb-10"
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewModal;