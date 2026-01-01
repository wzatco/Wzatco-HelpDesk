import { useRouter } from 'next/router';
import { ReportsPageContent } from './index';

import { withAuth } from '../../../lib/withAuth';
const viewToTabMap = {
  overview: 'products',
  performance: 'departments',
  sla: 'tat',
  agents: 'agents',
  customers: 'csat'
};

export default function ReportsViewRouter() {
  const router = useRouter();
  const { view } = router.query;
  const normalizedView = Array.isArray(view) ? view[0] : view;
  const initialTab = viewToTabMap[normalizedView] || 'products';

  return <ReportsPageContent key={initialTab} initialTab={initialTab} />;
}

export const getServerSideProps = withAuth();


