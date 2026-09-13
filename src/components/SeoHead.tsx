import React, { useEffect } from 'react';
import type { SiteSettings } from '../types.ts';

interface SeoHeadProps {
  settings: SiteSettings;
}

export const SeoHead: React.FC<SeoHeadProps> = ({ settings }) => {
  useEffect(() => {
    if (settings.seoTitle) {
      document.title = settings.seoTitle;
    }

    if (settings.seoDescription) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', settings.seoDescription);

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        document.head.appendChild(ogDesc);
      }
      ogDesc.setAttribute('content', settings.seoDescription);
    }

    if (settings.seoTitle) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', settings.seoTitle);
    }

    if (settings.canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', settings.canonicalUrl);
    }
  }, [settings]);

  return null;
};
