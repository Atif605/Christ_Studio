import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface SeoHeadProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: 'website' | 'article' | 'video.other' | 'music.song';
  keywords?: string;
  author?: string;
  publishedTime?: string;
  videoDuration?: string;
  jsonLd?: Record<string, unknown>;
}

const DEFAULT_TITLE = 'Christ Studio | Christian Worship, Sermons, Shorts & Bible Hub';
const DEFAULT_DESCRIPTION = 'Christ Studio is an ad-free Christian workspace and YouTube creators hub. Share, watch, and promote gospel sermons, worship, devotionals, and read Urdu/English Bible.';
const DEFAULT_URL = 'https://christ-studio-hub.web.app/';
const DEFAULT_IMAGE = 'https://christ-studio-hub.web.app/apple-touch-icon.png';
const DEFAULT_KEYWORDS = 'Christ Studio, Christian Youtube Creators, Christian Fellowship, Urdu Bible, English NIV Bible, Ad-free Sermons, Daily Devotionals, Bible Trivia, Prayer Wall, Christian Workspace, Gospel, Atif Azeem';

export const SeoHead: React.FC<SeoHeadProps> = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  url = DEFAULT_URL,
  image = DEFAULT_IMAGE,
  type = 'website',
  keywords = DEFAULT_KEYWORDS,
  author = 'Atif Azeem',
  publishedTime,
  videoDuration,
  jsonLd,
}) => {
  const formattedTitle = title.includes('Christ Studio') 
    ? title 
    : `${title} | Christ Studio`;

  const canonicalUrl = url.split('?')[0] || DEFAULT_URL;

  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Christ Studio',
    url: DEFAULT_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: ['en', 'ur'],
    author: {
      '@type': 'Person',
      name: author,
      url: DEFAULT_URL
    },
    creator: {
      '@type': 'Person',
      name: author,
      url: DEFAULT_URL
    },
    publisher: {
      '@type': 'Organization',
      name: 'Christ Studio',
      url: DEFAULT_URL,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_IMAGE
      }
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${DEFAULT_URL}?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const schemaData = jsonLd || defaultSchema;

  return (
    <Helmet prioritizeSeoTags>
      {/* Primary Meta Tags */}
      <title>{formattedTitle}</title>
      <meta name="title" content={formattedTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="creator" content={author} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={formattedTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={formattedTitle} />
      <meta property="og:site_name" content="Christ Studio" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={formattedTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@AtifAzeem" />

      {/* Video specifics for social preview cards if available */}
      {type === 'video.other' && videoDuration && (
        <meta property="video:duration" content={videoDuration} />
      )}

      {/* JSON-LD Structured Data for Google Search */}
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
};

export default SeoHead;