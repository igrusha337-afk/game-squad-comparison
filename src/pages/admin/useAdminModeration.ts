import { useState, useCallback } from 'react';
import { forumApi, guidesApi } from '@/lib/api';
import { PendingTopic, PendingGuide } from '@/components/admin/AdminTabStatsAndModeration';

export function useAdminModeration(showToast: (msg: string, type?: 'success' | 'error') => void) {
  const [pendingTopics, setPendingTopics] = useState<PendingTopic[]>([]);
  const [pendingGuides, setPendingGuides] = useState<PendingGuide[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setModerationLoading(true);
    try {
      const [t, g] = await Promise.all([forumApi.getPendingTopics(), guidesApi.getPendingGuides()]);
      setPendingTopics(t.topics || []);
      setPendingGuides(g.guides || []);
    } finally {
      setModerationLoading(false);
    }
  }, []);

  const handlePublishTopic = async (id: number, approve: boolean) => {
    const key = `topic-${id}`;
    if (processingId === key) return;
    setProcessingId(key);
    try {
      await forumApi.publishTopic(id, approve);
      showToast(approve ? 'Тема опубликована' : 'Тема отклонена');
      await loadPending();
    } finally {
      setProcessingId(null);
    }
  };

  const handlePublishGuide = async (id: number, approve: boolean) => {
    const key = `guide-${id}`;
    if (processingId === key) return;
    setProcessingId(key);
    try {
      await guidesApi.publishGuide(id, approve);
      showToast(approve ? 'Гайд опубликован' : 'Гайд отклонён');
      await loadPending();
    } finally {
      setProcessingId(null);
    }
  };

  return {
    pendingTopics, pendingGuides, moderationLoading,
    expandedTopic, setExpandedTopic,
    processingId,
    loadPending,
    handlePublishTopic, handlePublishGuide,
  };
}
