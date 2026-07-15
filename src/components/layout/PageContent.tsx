import { RefObject } from 'react';
import CatalogPage from '@/pages/CatalogPage';
import ComparePage from '@/pages/ComparePage';
import TreatiesPage from '@/pages/TreatiesPage';
import UnitDetailPage from '@/pages/UnitDetailPage';
import AboutPage from '@/pages/AboutPage';
import AuthPage from '@/pages/AuthPage';
import AdminPage from '@/pages/AdminPage';
import ForumPage from '@/pages/ForumPage';
import TopicPage from '@/pages/TopicPage';
import WhamPage from '@/pages/WhamPage';
import ProfilePage from '@/pages/ProfilePage';
import PublicProfilePage from '@/pages/PublicProfilePage';
import MessagesPage from '@/pages/MessagesPage';
import GuidesPage from '@/pages/GuidesPage';
import GuideDetailPage from '@/pages/GuideDetailPage';
import HousesPage from '@/pages/HousesPage';
import HouseDetailPage from '@/pages/HouseDetailPage';

type Page = 'catalog' | 'compare' | 'treaties' | 'houses' | 'forum' | 'guides' | 'game' | 'about' | 'auth' | 'admin' | 'profile' | 'messages';

interface PageContentProps {
  page: Page;
  mainRef: RefObject<HTMLElement>;
  detailUnitId: string | null;
  forumTopicId: number | null;
  publicProfileUserId: number | null;
  messagesWithUser: { id: number; username: string } | null;
  guideDetailId: number | null;
  houseDetailId: number | null;
  appliedTreaties: Record<string, string[]>;
  onSetDetailUnitId: (id: string | null) => void;
  onSetForumTopicId: (id: number | null) => void;
  onSetPublicProfileUserId: (id: number | null) => void;
  onSetGuideDetailId: (id: number | null) => void;
  onSetHouseDetailId: (id: number | null) => void;
  onApplyTreaty: (unitId: string, treatyId: string) => void;
  onRemoveTreaty: (unitId: string, treatyId: string) => void;
  onOpenPublicProfile: (userId: number) => void;
  onOpenMessages: (userId: number, username: string) => void;
  onNavigateTo: (p: Page) => void;
  onAuthSuccess: () => void;
}

export default function PageContent({
  page,
  mainRef,
  detailUnitId,
  forumTopicId,
  publicProfileUserId,
  messagesWithUser,
  guideDetailId,
  houseDetailId,
  appliedTreaties,
  onSetDetailUnitId,
  onSetForumTopicId,
  onSetPublicProfileUserId,
  onSetGuideDetailId,
  onSetHouseDetailId,
  onApplyTreaty,
  onRemoveTreaty,
  onOpenPublicProfile,
  onOpenMessages,
  onNavigateTo,
  onAuthSuccess,
}: PageContentProps) {
  return (
    <main ref={mainRef} className="flex-1 p-4 lg:p-8 overflow-auto scrollbar-thin">
      {publicProfileUserId ? (
        <PublicProfilePage
          userId={publicProfileUserId}
          onBack={() => onSetPublicProfileUserId(null)}
          onOpenMessages={onOpenMessages}
        />
      ) : detailUnitId ? (
        <UnitDetailPage
          unitId={detailUnitId}
          appliedTreaties={appliedTreaties}
          onBack={() => onSetDetailUnitId(null)}
          onApplyTreaty={onApplyTreaty}
          onRemoveTreaty={onRemoveTreaty}
          onOpenMessages={onOpenMessages}
        />
      ) : page === 'catalog' ? (
        <CatalogPage onSelectUnit={onSetDetailUnitId} onGoGuides={() => onNavigateTo('guides')} />
      ) : page === 'compare' ? (
        <ComparePage
          appliedTreaties={appliedTreaties}
          onApply={onApplyTreaty}
          onRemove={onRemoveTreaty}
        />
      ) : page === 'treaties' ? (
        <TreatiesPage
          appliedTreaties={appliedTreaties}
          onApply={onApplyTreaty}
          onRemove={onRemoveTreaty}
        />
      ) : page === 'houses' ? (
        houseDetailId ? (
          <HouseDetailPage
            houseId={houseDetailId}
            onBack={() => onSetHouseDetailId(null)}
            onOpenProfile={onOpenPublicProfile}
          />
        ) : (
          <HousesPage
            onOpenHouse={id => { onSetHouseDetailId(id); mainRef.current?.scrollTo({ top: 0, behavior: 'instant' }); }}
            onOpenProfile={onOpenPublicProfile}
          />
        )
      ) : page === 'forum' ? (
        forumTopicId ? (
          <TopicPage
            topicId={forumTopicId}
            onBack={() => onSetForumTopicId(null)}
            onOpenProfile={onOpenPublicProfile}
            onOpenMessages={onOpenMessages}
          />
        ) : (
          <ForumPage
            onOpenTopic={onSetForumTopicId}
            onOpenProfile={onOpenPublicProfile}
          />
        )
      ) : page === 'game' ? (
        <WhamPage />
      ) : page === 'about' ? (
        <AboutPage />
      ) : page === 'auth' ? (
        <AuthPage onSuccess={onAuthSuccess} />
      ) : page === 'admin' ? (
        <AdminPage />
      ) : page === 'guides' ? (
        guideDetailId ? (
          <GuideDetailPage
            guideId={guideDetailId}
            onBack={() => onSetGuideDetailId(null)}
            onOpenProfile={onOpenPublicProfile}
          />
        ) : (
          <GuidesPage
            onOpenGuide={id => { onSetGuideDetailId(id); mainRef.current?.scrollTo({ top: 0, behavior: 'instant' }); }}
            onOpenProfile={onOpenPublicProfile}
          />
        )
      ) : page === 'profile' ? (
        <ProfilePage onOpenMessages={onOpenMessages} />
      ) : page === 'messages' ? (
        <MessagesPage
          initialUserId={messagesWithUser?.id}
          initialUsername={messagesWithUser?.username}
          onOpenProfile={onOpenPublicProfile}
        />
      ) : null}
    </main>
  );
}