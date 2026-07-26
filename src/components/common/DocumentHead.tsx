'use client';

import { useEffect } from 'react';

interface DocumentHeadProps {
  title: string;
  description?: string;
}

export default function DocumentHead({ title, description }: DocumentHeadProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let metaElement: HTMLMetaElement | null = null;
    let previousDescription: string | null = null;
    let createdMeta = false;

    if (description) {
      metaElement = document.querySelector('meta[name="description"]');
      if (!metaElement) {
        metaElement = document.createElement('meta');
        metaElement.name = 'description';
        document.head.appendChild(metaElement);
        createdMeta = true;
      }
      previousDescription = metaElement.getAttribute('content');
      metaElement.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;

      if (!metaElement || !description) return;

      if (createdMeta) {
        metaElement.remove();
        return;
      }

      if (previousDescription) {
        metaElement.setAttribute('content', previousDescription);
      } else {
        metaElement.removeAttribute('content');
      }
    };
  }, [title, description]);

  return null;
}
