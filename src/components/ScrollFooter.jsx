// Sits under an infinite-scroll list: it is the element the list watches,
// and it tells the admin what is happening.
export default function ScrollFooter({ list, noun }) {
  const { items, total, loading, loadingMore, moreError, hasMore, sentinelRef, retryMore } = list;
  const name = total === 1 ? noun.replace(/s$/, '') : noun; // "1 order", "2 orders"

  let content = null;
  if (loadingMore) {
    content = (<><span className="spinner" aria-hidden="true" /> Loading more…</>);
  } else if (moreError) {
    content = (
      <>
        Couldn’t load more {noun}.
        <button className="btn small" onClick={retryMore}>Try again</button>
      </>
    );
  } else if (!loading && total > 0 && !hasMore) {
    content = `That’s everything — ${total.toLocaleString('en-IN')} ${name}`;
  } else if (!loading && hasMore) {
    content = `Showing ${items.length.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')} — scroll for more`;
  }

  return (
    <div className="scroll-footer" ref={sentinelRef} role="status" aria-live="polite">
      {content}
    </div>
  );
}
