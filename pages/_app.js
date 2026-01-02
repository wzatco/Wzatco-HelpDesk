import '../styles/globals.css';
import '../styles/reactflow-custom.css';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import { AgentAuthProvider } from '../contexts/AgentAuthContext';
import { AgentGlobalProvider } from '../contexts/AgentGlobalData';
import { AgentChatProvider } from '../contexts/AgentChatContext';
import { AgentNotificationsProvider } from '../contexts/AgentNotificationsContext';
import { AgentPresenceProvider } from '../contexts/AgentPresenceContext';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </Head>
      <AuthProvider>
        <AgentAuthProvider>
          <AgentGlobalProvider>
            <AgentPresenceProvider>
              <AgentChatProvider>
                <AgentNotificationsProvider>
                  <Component {...pageProps} />
                </AgentNotificationsProvider>
              </AgentChatProvider>
            </AgentPresenceProvider>
          </AgentGlobalProvider>
        </AgentAuthProvider>
      </AuthProvider>
    </>
  );
}
