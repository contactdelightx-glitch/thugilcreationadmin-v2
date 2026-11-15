import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Infinite-scroll list.
 *
 *   const list = useInfiniteList(({ offset, limit, signal }) => fetchX({ ..., offset, limit, signal }),
 *                                [filters...], 30, (row) => row.id);
 *
 * - Loads the first batch whenever `deps` change (and scrolls back to the top).
 * - Loads the next batch when the footer element (list.sentinelRef) scrolls near the bottom of `.content`.
 * - Uses offset = number of rows already loaded, so rows removed locally never cause skips or repeats.
 */
// the element that scrolls: a nested box marked data-scroll-root, otherwise the page content area
const scrollRootOf = (el) => el?.closest('[data-scroll-root]') || el?.closest('.content') || null;

export default function useInfiniteList(fetchPage, deps, limit, getKey) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true); // first batch of a (re)load
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const sentinelRef = useRef(null);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const keyRef = useRef(getKey);
  keyRef.current = getKey;
  const live = useRef({ items: [], total: 0, busy: false, loading: true, ctrl: null });
  live.current.items = items;
  live.current.total = total;

  // first batch: runs on mount, when deps change, and on reload()
  useEffect(() => {
    const ctrl = new AbortController();
    live.current.ctrl?.abort();
    live.current.ctrl = ctrl;
    live.current.busy = false;
    live.current.loading = true;
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setMoreError('');
    scrollRootOf(sentinelRef.current)?.scrollTo({ top: 0 });

    fetchRef.current({ offset: 0, limit, signal: ctrl.signal })
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setItems(r.data);
        setTotal(r.total);
      })
      .catch((e) => {
        if (e.name === 'AbortError' || ctrl.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(e.message);
      })
      .finally(() => {
        if (ctrl.signal.aborted) return;
        live.current.loading = false;
        setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey, limit]);

  const loadMore = useCallback(async () => {
    const s = live.current;
    if (s.busy || s.loading || s.items.length >= s.total) return;
    const ctrl = s.ctrl;
    s.busy = true;
    setLoadingMore(true);
    setMoreError('');
    try {
      const r = await fetchRef.current({ offset: s.items.length, limit, signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setItems((prev) => {
        const seen = new Set(prev.map((x) => keyRef.current(x)));
        return [...prev, ...r.data.filter((x) => !seen.has(keyRef.current(x)))];
      });
      setTotal(r.total);
    } catch (e) {
      if (e.name !== 'AbortError' && !ctrl.signal.aborted) setMoreError(e.message);
    } finally {
      s.busy = false;
      if (!ctrl.signal.aborted) setLoadingMore(false);
    }
  }, [limit]);

  // watch the footer; re-created after every batch so it fires again if the footer is still in view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading || loadingMore || moreError || items.length >= total) return undefined;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && loadMore(),
      { root: scrollRootOf(el), rootMargin: '0px 0px 600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, total, loading, loadingMore, moreError, loadMore]);

  const removeWhere = useCallback((pred) => {
    const cur = live.current.items;
    const next = cur.filter((x) => !pred(x));
    setItems(next);
    setTotal((t) => Math.max(t - (cur.length - next.length), 0));
  }, []);

  const updateWhere = useCallback((pred, change) => {
    setItems((prev) => prev.map((x) => (pred(x) ? { ...x, ...change } : x)));
  }, []);

  return {
    items,
    total,
    loading,
    loadingMore,
    error,
    moreError,
    hasMore: items.length < total,
    sentinelRef,
    reload: () => setReloadKey((n) => n + 1),
    retryMore: loadMore,
    removeWhere,
    updateWhere,
  };
}
