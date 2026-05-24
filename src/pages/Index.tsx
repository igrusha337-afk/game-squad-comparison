import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { messagesApi } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import PageContent from '@/components/layout/PageContent';
import PWAInstallBanner from '@/components/PWAInstallBanner';

type Page = 'catalog' | 'compare' | 'treaties' | 'houses' | 'forum' | 'guides' | 'game' | 'about' | 'auth' | 'admin' | 'profile' | 'messages';

export default function Index() {
  const { unitId: unitIdParam } = useParams<{ unitId?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [page, setPage] = useState<Page>(unitIdParam ? 'catalog' : 'catalog');
  const [detailUnitId, setDetailUnitId] = useState<string | null>(unitIdParam ?? null);
  const [forumTopicId, setForumTopicId] = useState<number | null>(null);
  const [publicProfileUserId, setPublicProfileUserId] = useState<number | null>(null);
  const [messagesWithUser, setMessagesWithUser] = useState<{ id: number; username: string } | null>(null);
  const [guideDetailId, setGuideDetailId] = useState<number | null>(null);
  const [houseDetailId, setHouseDetailId] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [appliedTreaties, setAppliedTreaties] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('companion_treaties');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem('companion_treaties', JSON.stringify(appliedTreaties));
  }, [appliedTreaties]);

  useEffect(() => {
    if (detailUnitId) {
      mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      navigate(`/unit/${detailUnitId}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [detailUnitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const d = await messagesApi.getUnreadCount();
      setUnreadMessages(d.count || 0);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setUnreadMessages(0); return; }
    fetchUnread();
  }, [user, fetchUnread]);

  useEffect(() => {
    if (page === 'messages') setUnreadMessages(0);
  }, [page]);

  const handleApplyTreaty = (unitId: string, treatyId: string) => {
    setAppliedTreaties(prev => ({
      ...prev,
      [unitId]: [...(prev[unitId] || []), treatyId],
    }));
  };

  const handleRemoveTreaty = (unitId: string, treatyId: string) => {
    setAppliedTreaties(prev => ({
      ...prev,
      [unitId]: (prev[unitId] || []).filter(id => id !== treatyId),
    }));
  };

  const openPublicProfile = (userId: number) => {
    setPublicProfileUserId(userId);
    setDetailUnitId(null);
    setForumTopicId(null);
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const openMessages = (userId: number, username: string) => {
    setMessagesWithUser({ id: userId, username });
    setPage('messages');
    setDetailUnitId(null);
    setForumTopicId(null);
    setPublicProfileUserId(null);
    setMobileMenuOpen(false);
  };

  const navigateTo = (p: Page) => {
    setPage(p);
    setForumTopicId(null);
    setPublicProfileUserId(null);
    setGuideDetailId(null);
    setHouseDetailId(null);
    setMobileMenuOpen(false);
    if (detailUnitId) {
      setDetailUnitId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    setPage('catalog');
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar
        page={page}
        detailUnitId={detailUnitId}
        mobileMenuOpen={mobileMenuOpen}
        isAdmin={!!user?.is_admin}
        onNavigate={navigateTo}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <PWAInstallBanner />
        <TopBar
          page={page}
          detailUnitId={detailUnitId}
          forumTopicId={forumTopicId}
          mobileMenuOpen={mobileMenuOpen}
          unreadMessages={unreadMessages}
          user={user}
          authLoading={authLoading}
          onNavigate={navigateTo}
          onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)}
          onLogout={handleLogout}
          onResetDetail={() => { setPage('catalog'); setForumTopicId(null); if (detailUnitId) setDetailUnitId(null); else navigate('/'); }}
          onOpenTopic={setForumTopicId}
        />

        <PageContent
          page={page}
          mainRef={mainRef}
          detailUnitId={detailUnitId}
          forumTopicId={forumTopicId}
          publicProfileUserId={publicProfileUserId}
          messagesWithUser={messagesWithUser}
          guideDetailId={guideDetailId}
          houseDetailId={houseDetailId}
          appliedTreaties={appliedTreaties}
          onSetDetailUnitId={setDetailUnitId}
          onSetForumTopicId={setForumTopicId}
          onSetPublicProfileUserId={setPublicProfileUserId}
          onSetGuideDetailId={setGuideDetailId}
          onSetHouseDetailId={setHouseDetailId}
          onApplyTreaty={handleApplyTreaty}
          onRemoveTreaty={handleRemoveTreaty}
          onOpenPublicProfile={openPublicProfile}
          onOpenMessages={openMessages}
          onNavigateTo={navigateTo}
          onAuthSuccess={() => setPage('catalog')}
        />
      </div>
    </div>
  );
}