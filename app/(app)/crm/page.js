import CrmView from './CrmView';

export default function CrmPage() {
  const trackerConnected = !!process.env.TRACKER_ORG_ID;
  return <CrmView trackerConnected={trackerConnected} />;
}
