export interface SeoMetadataOptions {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  type?: 'website' | 'video.other' | 'article' | 'music.song';
  videoUrl?: string;
  author?: string;
  publishedTime?: string;
  keywords?: string[];
  schemaType?: 'VideoObject' | 'Article' | 'WebSite' | 'Movie';
}

const DEFAULT_IMAGE = 'https://christ-studio-hub.web.app/apple-touch-icon.png';
const DEFAULT_SITE_NAME = 'Christ Studio Hub';

/**
 * Safely sets or creates meta tags in document.head
 */
const setMetaAttribute = (nameOrProperty: string, attr: 'name' | 'property', value: string) => {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, nameOrProperty);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
};

/**
 * Injects or updates Canonical Link tag
 */
const setCanonicalUrl = (url: string) => {
  if (typeof document === 'undefined') return;

  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
};

/**
 * Injects or updates Schema.org JSON-LD Structured Data for Google Search
 */
export const injectJsonLd = (schemaData: Record<string, unknown>) => {
  if (typeof document === 'undefined') return;

  let script = document.querySelector('script[type="application/ld+json"]');
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaData);
};

/**
 * Main SEO updater function for SPAs and Mobile WebViews
 */
export function updateMetadata(
  titleOrOptions: string | SeoMetadataOptions,
  description?: string,
  imageUrl?: string
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const options: SeoMetadataOptions =
    typeof titleOrOptions === 'string'
      ? {
          title: titleOrOptions,
          description: description || 'Watch Christian Sermons, Worship, Shorts, Movies and Read Urdu/English Bible.',
          imageUrl: imageUrl || DEFAULT_IMAGE,
          url: window.location.href,
          type: 'website',
        }
      : {
          ...titleOrOptions,
          imageUrl: titleOrOptions.imageUrl || DEFAULT_IMAGE,
          url: titleOrOptions.url || window.location.href,
          type: titleOrOptions.type || 'website',
        };

  const formattedTitle = options.title.includes(DEFAULT_SITE_NAME)
    ? options.title
    : `${options.title} | ${DEFAULT_SITE_NAME}`;

  // 1. Update Document Title
  document.title = formattedTitle;

  // 2. Standard HTML Meta Tags
  setMetaAttribute('description', 'name', options.description);
  if (options.keywords && options.keywords.length > 0) {
    setMetaAttribute('keywords', 'name', options.keywords.join(', '));
  }
  if (options.author) {
    setMetaAttribute('author', 'name', options.author);
  }

  // 3. Open Graph (Facebook, WhatsApp, LinkedIn)
  setMetaAttribute('og:site_name', 'property', DEFAULT_SITE_NAME);
  setMetaAttribute('og:title', 'property', formattedTitle);
  setMetaAttribute('og:description', 'property', options.description);
  setMetaAttribute('og:type', 'property', options.type || 'website');
  setMetaAttribute('og:url', 'property', options.url || window.location.href);
  setMetaAttribute('og:image', 'property', options.imageUrl || DEFAULT_IMAGE);
  setMetaAttribute('og:image:alt', 'property', options.title);

  // 4. Twitter Card Previews
  setMetaAttribute('twitter:card', 'name', 'summary_large_image');
  setMetaAttribute('twitter:title', 'name', formattedTitle);
  setMetaAttribute('twitter:description', 'name', options.description);
  setMetaAttribute('twitter:image', 'name', options.imageUrl || DEFAULT_IMAGE);

  // 5. Canonical Link
  setCanonicalUrl(options.url || window.location.href);

  // 6. Automatic Structured Data (JSON-LD)
  if (options.schemaType === 'VideoObject' && options.videoUrl) {
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: options.title,
      description: options.description,
      thumbnailUrl: [options.imageUrl || DEFAULT_IMAGE],
      uploadDate: options.publishedTime || new Date().toISOString(),
      contentUrl: options.videoUrl,
      embedUrl: options.videoUrl,
    });
  } else if (options.schemaType === 'Article') {
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: options.title,
      description: options.description,
      image: [options.imageUrl || DEFAULT_IMAGE],
      datePublished: options.publishedTime || new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: options.author || DEFAULT_SITE_NAME,
      },
    });
  }
}