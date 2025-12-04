import Head from 'next/head';
import { useSettings } from '../../hooks/useSettings';

/**
 * PageHead component that automatically uses app title from settings
 * Usage: <PageHead title="Dashboard" />
 */
export default function PageHead({ title, description }) {
  const { settings } = useSettings();
  const appTitle = settings.appTitle || 'HelpDesk Pro';
  const fullTitle = title ? `${title} - ${appTitle}` : appTitle;
  const metaDescription = description || `${appTitle} - Professional Support Desk`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
    </Head>
  );
}

