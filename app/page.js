'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import FilterBar from '@/components/FilterBar';
import SearchFilters from '@/components/SearchFilters';
import Toolbar from '@/components/Toolbar';
import SelectionBar from '@/components/SelectionBar';
import ClusterCard from '@/components/ClusterCard';
import ClusterListItem from '@/components/ClusterListItem';
import TodayNews from '@/components/TodayNews';
import AddFeedModal from '@/components/AddFeedModal';
import EditFeedModal from '@/components/EditFeedModal';
import {
  getFeeds,
  getClusters,
  createFeed,
  updateFeed,
  deleteFeed,
  setArticleStatus,
  bulkSetArticleStatus,
  addPick,
  removePick,
} from '@/lib/api';

const VIEW_MODE_KEY = 'jdtimes:viewMode';

function flattenArticles(cluster) {
  return [cluster.primaryArticle, ...cluster.relatedArticles];
}

export default function Home() {
  const [feeds, setFeeds] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const [selected, setSelected] = useState({ type: 'all' });
  const [pageMode, setPageMode] = useState('browse'); // 'browse' | 'today'
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [feedFilter, setFeedFilter] = useState('ALL');

  const [viewMode, setViewMode] = useState('card');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);

  // 저장된 보기 모드 복원 (마운트 후 1회 — SSR과의 하이드레이션 불일치 방지 위해 effect에서 처리)
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'card' || saved === 'list') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 저장된 선호 보기 모드 복원
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const loadData = useCallback(async (force = false) => {
    force ? setRefreshing(true) : setLoading(true);
    setLoadError('');
    try {
      const [feedList, rssData] = await Promise.all([getFeeds(), getClusters({ force })]);
      setFeeds(feedList);
      setClusters(rssData.clusters || []);
      setLastUpdated(rssData.fetchedAt || new Date().toISOString());
    } catch (err) {
      setLoadError(err.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 최초 데이터 로드
    loadData(false);
  }, [loadData]);

  // 카테고리별 미확인(unread) 기사 수 — 사이드바 배지용 (전체 스코프 기준)
  const unreadByCategory = useMemo(() => {
    const map = {};
    for (const cluster of clusters) {
      for (const article of flattenArticles(cluster)) {
        if (!article.isRead) {
          map[article.category] = (map[article.category] || 0) + 1;
        }
      }
    }
    return map;
  }, [clusters]);

  // 1) 사이드바에서 선택한 카테고리/피드로 범위 축소
  const scopedClusters = useMemo(() => {
    if (selected.type === 'category') {
      return clusters.filter((c) => c.primaryArticle.category === selected.value);
    }
    if (selected.type === 'feed') {
      return clusters.filter((c) => c.primaryArticle.feedId === selected.value);
    }
    return clusters;
  }, [clusters, selected]);

  // 2) 검색바의 키워드/기간/카테고리/피드 필터 추가 적용
  const searchFilteredClusters = useMemo(() => {
    let list = scopedClusters;

    if (categoryFilter !== 'ALL') {
      list = list.filter((c) => c.primaryArticle.category === categoryFilter);
    }
    if (feedFilter !== 'ALL') {
      list = list.filter((c) => String(c.primaryArticle.feedId) === feedFilter);
    }
    if (period !== 'ALL') {
      const hours = Number(period);
      // eslint-disable-next-line react-hooks/purity -- 클라이언트 전용 필터 계산, 렌더마다 최신 시각 기준으로 다시 걸러내는 것이 의도된 동작
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      list = list.filter((c) => {
        const t = new Date(c.primaryArticle.pubDate).getTime();
        return !Number.isNaN(t) && t >= cutoff;
      });
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => flattenArticles(c).some((a) => a.title.toLowerCase().includes(q)));
    }

    return list;
  }, [scopedClusters, categoryFilter, feedFilter, period, query]);

  // 3) 필터 탭(전체/읽지않음/읽음/북마크) 카운트 — 검색 필터 적용된 범위 기준
  const tabCounts = useMemo(() => {
    let unread = 0;
    let read = 0;
    let bookmark = 0;
    for (const c of searchFilteredClusters) {
      if (c.primaryArticle.isRead) read += 1;
      else unread += 1;
      if (flattenArticles(c).some((a) => a.isBookmarked)) bookmark += 1;
    }
    return { ALL: searchFilteredClusters.length, UNREAD: unread, READ: read, BOOKMARK: bookmark };
  }, [searchFilteredClusters]);

  // 4) 필터 탭까지 최종 적용된, 실제로 화면에 보여줄 목록
  const visibleClusters = useMemo(() => {
    switch (activeFilter) {
      case 'UNREAD':
        return searchFilteredClusters.filter((c) => !c.primaryArticle.isRead);
      case 'READ':
        return searchFilteredClusters.filter((c) => c.primaryArticle.isRead);
      case 'BOOKMARK':
        return searchFilteredClusters.filter((c) => flattenArticles(c).some((a) => a.isBookmarked));
      default:
        return searchFilteredClusters;
    }
  }, [searchFilteredClusters, activeFilter]);

  const updateArticleInState = useCallback((articleId, patch) => {
    setClusters((prev) =>
      prev.map((cluster) => {
        const updateIfMatch = (a) => (a.articleId === articleId ? { ...a, ...patch } : a);
        return {
          ...cluster,
          primaryArticle: updateIfMatch(cluster.primaryArticle),
          relatedArticles: cluster.relatedArticles.map(updateIfMatch),
        };
      })
    );
  }, []);

  const handleToggleRead = useCallback(
    async (article) => {
      if (article.isRead) return; // 이미 읽음 처리된 기사는 재요청하지 않음
      updateArticleInState(article.articleId, { isRead: true });
      try {
        await setArticleStatus({ articleId: article.articleId, isRead: true });
      } catch {
        updateArticleInState(article.articleId, { isRead: false }); // 실패 시 롤백
      }
    },
    [updateArticleInState]
  );

  const handleToggleBookmark = useCallback(
    async (article) => {
      const next = !article.isBookmarked;
      updateArticleInState(article.articleId, { isBookmarked: next });
      try {
        await setArticleStatus({ articleId: article.articleId, isBookmarked: next });
      } catch {
        updateArticleInState(article.articleId, { isBookmarked: !next }); // 실패 시 롤백
      }
    },
    [updateArticleInState]
  );

  // --- Today News "Pick" ---
  const handleTogglePick = useCallback(
    async (article) => {
      const next = !article.isPicked;
      updateArticleInState(article.articleId, { isPicked: next });
      try {
        if (next) {
          await addPick({
            articleId: article.articleId,
            title: article.title,
            link: article.link,
            source: article.source,
            category: article.category,
            pubDate: article.pubDate,
          });
        } else {
          await removePick(article.articleId);
        }
      } catch {
        updateArticleInState(article.articleId, { isPicked: !next }); // 실패 시 롤백
      }
    },
    [updateArticleInState]
  );

  // Today News 화면 내에서 빼기 — 브라우즈 화면의 핀 상태도 함께 동기화
  const handleRemovePickById = useCallback(
    async (articleId) => {
      updateArticleInState(articleId, { isPicked: false });
      try {
        await removePick(articleId);
      } catch {
        updateArticleInState(articleId, { isPicked: true });
      }
    },
    [updateArticleInState]
  );

  const pickedCount = useMemo(
    () => clusters.reduce((sum, c) => sum + flattenArticles(c).filter((a) => a.isPicked).length, 0),
    [clusters]
  );

  const handleSidebarSelect = useCallback((sel) => {
    setPageMode('browse');
    setSelected(sel);
  }, []);

  // --- 선택(체크박스) & 일괄 읽음/읽지 않음 처리 ---
  const handleToggleSelect = useCallback((cluster) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cluster.clusterId)) next.delete(cluster.clusterId);
      else next.add(cluster.clusterId);
      return next;
    });
  }, []);

  const allSelected = visibleClusters.length > 0 && visibleClusters.every((c) => selectedIds.has(c.clusterId));
  const someSelected = visibleClusters.some((c) => selectedIds.has(c.clusterId));

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleClusters.forEach((c) => next.delete(c.clusterId));
      } else {
        visibleClusters.forEach((c) => next.add(c.clusterId));
      }
      return next;
    });
  }, [allSelected, visibleClusters]);

  const applyBulk = useCallback(
    async (isRead) => {
      const targets = clusters.filter((c) => selectedIds.has(c.clusterId));
      const articleIds = targets.flatMap(flattenArticles).map((a) => a.articleId);
      if (articleIds.length === 0) return;

      setBulkBusy(true);
      // 낙관적 업데이트
      setClusters((prev) =>
        prev.map((cluster) =>
          selectedIds.has(cluster.clusterId)
            ? {
                ...cluster,
                primaryArticle: { ...cluster.primaryArticle, isRead },
                relatedArticles: cluster.relatedArticles.map((a) => ({ ...a, isRead })),
              }
            : cluster
        )
      );
      try {
        await bulkSetArticleStatus({ articleIds, isRead });
        setSelectedIds(new Set());
      } catch {
        await loadData(false); // 실패 시 서버 상태로 재동기화
      } finally {
        setBulkBusy(false);
      }
    },
    [clusters, selectedIds, loadData]
  );

  const handleBulkRead = useCallback(() => applyBulk(true), [applyBulk]);
  const handleBulkUnread = useCallback(() => applyBulk(false), [applyBulk]);

  const handleAddFeed = useCallback(
    async (payload) => {
      await createFeed(payload);
      await loadData(false);
    },
    [loadData]
  );

  const handleUpdateFeed = useCallback(
    async (feedId, payload) => {
      await updateFeed(feedId, payload);
      await loadData(false);
    },
    [loadData]
  );

  const handleDeleteFeed = useCallback(
    async (feedId) => {
      await deleteFeed(feedId);
      setSelected((s) => (s.type === 'feed' && s.value === feedId ? { type: 'all' } : s));
      await loadData(false);
    },
    [loadData]
  );

  const existingCategories = useMemo(
    () => [...new Set(feeds.map((f) => f.category).filter(Boolean))],
    [feeds]
  );

  const scopeLabel =
    selected.type === 'all'
      ? '전체 보기'
      : selected.type === 'category'
        ? selected.value
        : feeds.find((f) => f.id === selected.value)?.title || '피드';

  const ClusterComponent = viewMode === 'list' ? ClusterListItem : ClusterCard;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        feeds={feeds}
        unreadByCategory={unreadByCategory}
        selected={selected}
        onSelect={handleSidebarSelect}
        onAddFeedClick={() => setModalOpen(true)}
        onEditFeedClick={setEditingFeed}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pageMode={pageMode}
        onSelectToday={() => setPageMode('today')}
        pickedCount={pickedCount}
      />

      <main className="flex-1 min-w-0">
        <header className="px-6 pt-6 pb-3 flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="메뉴 열기"
              className="md:hidden text-(--color-ink) text-xl leading-none cursor-pointer"
            >
              ☰
            </button>
            <h2 className="font-(family-name:--font-display) text-2xl font-bold truncate">
              {pageMode === 'today' ? 'Today News' : scopeLabel}
            </h2>
          </div>
          <span className="shrink-0 font-(family-name:--font-mono) text-xs text-(--color-ink-faint)">
            {pageMode === 'today' ? `Pick ${pickedCount}건` : `${visibleClusters.length}건 표시 중`}
          </span>
        </header>

        {pageMode === 'today' ? (
          <TodayNews viewMode={viewMode} onViewModeChange={setViewMode} onRemovePick={handleRemovePickById} />
        ) : (
        <>
        <Toolbar
          onRefresh={() => loadData(true)}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <SearchFilters
          query={query}
          onQueryChange={setQuery}
          period={period}
          onPeriodChange={setPeriod}
          category={categoryFilter}
          onCategoryChange={setCategoryFilter}
          feedId={feedFilter}
          onFeedIdChange={setFeedFilter}
          categories={existingCategories}
          feeds={feeds}
        />

        <FilterBar active={activeFilter} onChange={setActiveFilter} counts={tabCounts} />

        {visibleClusters.length > 0 && (
          <SelectionBar
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={handleToggleAll}
            selectedCount={selectedIds.size}
            onBulkRead={handleBulkRead}
            onBulkUnread={handleBulkUnread}
            busy={bulkBusy}
          />
        )}

        <div className={viewMode === 'list' ? 'px-6 py-3 max-w-3xl' : 'px-6 py-5 space-y-3 max-w-3xl'}>
          {loading && (
            <p className="text-sm text-(--color-ink-soft) py-10 text-center">
              기사를 불러오는 중…
            </p>
          )}

          {!loading && loadError && (
            <div className="rounded border border-(--color-stamp-red)/40 bg-(--color-stamp-red)/5 px-4 py-3">
              <p className="text-sm text-(--color-stamp-red)">{loadError}</p>
              <button
                onClick={() => loadData(false)}
                className="mt-2 text-xs underline text-(--color-stamp-red) cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}

          {!loading && !loadError && feeds.length === 0 && (
            <div className="text-center py-16">
              <p className="font-(family-name:--font-display) text-lg mb-1">
                아직 등록된 피드가 없습니다
              </p>
              <p className="text-sm text-(--color-ink-soft) mb-4">
                왼쪽 메뉴의 &ldquo;피드 추가&rdquo;로 키워드나 언론사를 등록해보세요.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded bg-(--color-ink) text-(--color-paper) px-4 py-2 text-sm cursor-pointer"
              >
                + 피드 추가하기
              </button>
            </div>
          )}

          {!loading && !loadError && feeds.length > 0 && visibleClusters.length === 0 && (
            <p className="text-sm text-(--color-ink-soft) py-10 text-center">
              이 조건에 해당하는 기사가 없습니다.
            </p>
          )}

          {!loading &&
            (viewMode === 'list' ? (
              <div className="rounded border border-(--color-rule) bg-(--color-paper-raised) overflow-hidden">
                {visibleClusters.map((cluster) => (
                  <ClusterComponent
                    key={cluster.clusterId}
                    cluster={cluster}
                    onToggleRead={handleToggleRead}
                    onToggleBookmark={handleToggleBookmark}
                    onTogglePick={handleTogglePick}
                    selected={selectedIds.has(cluster.clusterId)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            ) : (
              visibleClusters.map((cluster) => (
                <ClusterComponent
                  key={cluster.clusterId}
                  cluster={cluster}
                  onToggleRead={handleToggleRead}
                  onToggleBookmark={handleToggleBookmark}
                  onTogglePick={handleTogglePick}
                  selected={selectedIds.has(cluster.clusterId)}
                  onToggleSelect={handleToggleSelect}
                />
              ))
            ))}
        </div>
        </>
        )}
      </main>

      <AddFeedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddFeed}
        existingCategories={existingCategories}
      />

      <EditFeedModal
        key={editingFeed?.id ?? 'none'}
        feed={editingFeed}
        onClose={() => setEditingFeed(null)}
        onSave={handleUpdateFeed}
        onDelete={handleDeleteFeed}
      />
    </div>
  );
}
