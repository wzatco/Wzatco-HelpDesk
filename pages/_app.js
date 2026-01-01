import '../styles/globals.css';
import '../styles/reactflow-custom.css';
import { AuthProvider } from '../contexts/AuthContext';
import { AgentAuthProvider } from '../contexts/AgentAuthContext';
import { AgentGlobalProvider } from '../contexts/AgentGlobalData';
import { AgentChatProvider } from '../contexts/AgentChatContext';
import { AgentNotificationsProvider } from '../contexts/AgentNotificationsContext';
import { AgentPresenceProvider } from '../contexts/AgentPresenceContext';

export default function App({ Component, pageProps }) {
  return (
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
  );
}
