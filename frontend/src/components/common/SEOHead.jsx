import { useEffect } from 'react';

/**
 * SEOHead Component
 * Manages dynamic document title, meta tags, canonical links, Open Graph,
 * Twitter cards, and structured JSON-LD schemas for React 19 SPA routes.
 */
export function SEOHead({
  title,
  description,
  keywords,
  canonicalUrl = 'https://theaquasphere.org/',
  ogImage = 'https://res.cloudinary.com/dcbdne09h/image/upload/v1791915156/Aqua_Sphere_Water_Leaf_Logo_am7t4i.png',
  ogType = 'website',
  structuredData,
  robots = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
}) {
  useEffect(() => {
    // 1. Dynamic Document Title
    if (title) {
      document.title = title;
    }

    // Helper function to safely update or append meta tags
    const setMetaTag = (attrName, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);
    if (keywords) setMetaTag('name', 'keywords', keywords);
    setMetaTag('name', 'robots', robots);

    // 3. Open Graph Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'AquaSphere Mineral Water & Empty Bottles');

    // 4. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 5. Canonical Link
    if (canonicalUrl) {
      let canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', canonicalUrl);
    }

    // 6. Route-Specific JSON-LD Schema
    if (structuredData) {
      const scriptId = 'route-dynamic-jsonld';
      let scriptEl = document.getElementById(scriptId);
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = typeof structuredData === 'string' 
        ? structuredData 
        : JSON.stringify(structuredData);
    }

    return () => {
      // Optional cleanup on route change
    };
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, structuredData, robots]);

  // React 19 native metadata hoisting
  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {robots && <meta name="robots" content={robots} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogType && <meta property="og:type" content={ogType} />}
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </>
  );
}

export default SEOHead;
