'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  getMe,
  getSessionToken,
  loginWithGoogle,
  logout as logoutRequest,
  setSessionToken,
  UNAUTHORIZED_EVENT,
} from '@/lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

/** Google Identity Services 스크립트를 한 번만 로드 */
let gsiLoadPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoadPromise) {
    gsiLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gsiLoadPromise = null;
        reject(new Error('Google 로그인 스크립트를 불러오지 못했습니다.'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiLoadPromise;
}

function Masthead() {
  return (
    <div className="mb-6 text-center">
      <h1 className="font-(family-name:--font-display) text-3xl font-bold tracking-tight">JD Times</h1>
      <p className="font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint) mt-1">multi-source news wire</p>
      <div className="mx-auto mt-3 h-[3px] w-24 border-y border-(--color-stamp-red)" />
    </div>
  );
}

function CenteredCard({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-(--color-paper)">
      <div className="w-full max-w-sm rounded-lg border border-(--color-rule) bg-(--color-paper-raised) px-6 py-8 shadow-sm">
        <Masthead />
        {children}
      </div>
    </div>
  );
}

function LoginScreen({ onCredential }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            setBusy(true);
            setError('');
            try {
              await onCredential(credential);
            } catch (err) {
              setError(err.message || '로그인에 실패했습니다.');
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'ko',
          width: 280,
        });
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  return (
    <CenteredCard>
      <p className="text-sm text-(--color-ink-soft) text-center mb-5">
        관심 키워드와 언론사 뉴스를 모아 비슷한 기사끼리 묶어 보여드립니다.
      </p>
      {GOOGLE_CLIENT_ID ? (
        <div className="flex justify-center min-h-[44px]">
          {busy ? <p className="text-sm text-(--color-ink-soft)">로그인 중…</p> : <div ref={buttonRef} />}
        </div>
      ) : (
        <p className="text-xs text-(--color-stamp-red) text-center">
          NEXT_PUBLIC_GOOGLE_CLIENT_ID가 설정되지 않아 로그인할 수 없습니다.
        </p>
      )}
      {error && <p className="mt-4 text-xs text-(--color-stamp-red) text-center">{error}</p>}
      <p className="mt-6 text-[11px] text-(--color-ink-faint) text-center">
        처음 로그인하면 가입 신청이 접수되고, 어드민 승인 후 이용할 수 있습니다.
      </p>
    </CenteredCard>
  );
}

function StatusScreen({ user, title, message, onRefresh, onLogout }) {
  const [checking, setChecking] = useState(false);
  return (
    <CenteredCard>
      <h2 className="text-base font-semibold text-center mb-2">{title}</h2>
      <p className="text-sm text-(--color-ink-soft) text-center">{message}</p>
      {user?.email && (
        <p className="mt-4 text-center font-(family-name:--font-mono) text-xs text-(--color-ink-faint)">{user.email}</p>
      )}
      <div className="mt-6 flex gap-2">
        {onRefresh && (
          <button
            onClick={async () => {
              setChecking(true);
              await onRefresh();
              setChecking(false);
            }}
            disabled={checking}
            className="flex-1 rounded bg-(--color-ink) text-(--color-paper) py-2 text-sm font-medium cursor-pointer disabled:opacity-50"
          >
            {checking ? '확인 중…' : '승인 여부 다시 확인'}
          </button>
        )}
        <button
          onClick={onLogout}
          className="flex-1 rounded border border-(--color-rule) py-2 text-sm text-(--color-ink-soft) hover:bg-(--color-ink)/5 cursor-pointer"
        >
          로그아웃
        </button>
      </div>
    </CenteredCard>
  );
}

/**
 * 로그인 상태를 관리하고, 승인된(active) 사용자에게만 앱 화면(children)을 보여준다.
 * - 세션 토큰은 localStorage에 보관, 백엔드가 401(LOGIN_REQUIRED)을 주면 lib/api가 이벤트를 쏘고 여기서 로그인 화면으로 전환
 * - 가입 직후(pending)나 정지(suspended) 계정은 안내 화면만 보여준다
 */
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  const refresh = useCallback(async () => {
    if (!getSessionToken()) {
      setState({ status: 'anonymous', user: null });
      return;
    }
    try {
      const user = await getMe();
      setState({ status: 'authenticated', user });
    } catch (err) {
      if (err.status === 401) setState({ status: 'anonymous', user: null });
      else setState((s) => (s.status === 'loading' ? { status: 'error', user: null, error: err.message } : s));
    }
  }, []);

  useEffect(() => {
    // 마운트 시 저장된 세션으로 로그인 상태 복원
    refresh();
    const onUnauthorized = () => setState({ status: 'anonymous', user: null });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [refresh]);

  const login = useCallback(async (credential) => {
    const { token, user } = await loginWithGoogle(credential);
    setSessionToken(token);
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // 이미 만료된 세션이어도 로컬에서는 로그아웃 처리
    }
    setSessionToken(null);
    window.google?.accounts?.id?.disableAutoSelect?.();
    setState({ status: 'anonymous', user: null });
  }, []);

  const { status, user } = state;

  let content;
  if (status === 'loading') {
    content = (
      <div className="min-h-screen flex items-center justify-center text-sm text-(--color-ink-soft)">불러오는 중…</div>
    );
  } else if (status === 'error') {
    content = (
      <StatusScreen
        title="서버에 연결할 수 없습니다"
        message={state.error || '잠시 후 다시 시도해주세요.'}
        onRefresh={refresh}
        onLogout={logout}
      />
    );
  } else if (status === 'anonymous') {
    content = <LoginScreen onCredential={login} />;
  } else if (user.status === 'pending') {
    content = (
      <StatusScreen
        user={user}
        title="가입 신청이 접수되었습니다"
        message="어드민이 승인하면 바로 이용할 수 있습니다."
        onRefresh={refresh}
        onLogout={logout}
      />
    );
  } else if (user.status === 'suspended') {
    content = (
      <StatusScreen
        user={user}
        title="이용이 정지된 계정입니다"
        message="문의가 필요하면 운영자에게 연락해주세요."
        onLogout={logout}
      />
    );
  } else {
    content = children;
  }

  return <AuthContext.Provider value={{ user, logout, refresh }}>{content}</AuthContext.Provider>;
}
