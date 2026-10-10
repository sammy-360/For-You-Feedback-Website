import { type FormEvent, type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ArrowDownToLine, ArrowRight, Check, ChevronRight, Clock3, MessageSquareText, RefreshCw, Star, UtensilsCrossed } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

interface DashboardData {
  responseCount: number;
  averageOverall: number;
  distribution: { rating: number; count: number }[];
  categoryAverages: { category: string; average: number }[];
  topCategory: string;
  topCategoryAverage: number;
  latestComments: { id: string; overall: number; comment?: string; name?: string; createdAt: string }[];
}

function Home() {
  const [staffMode, setStaffMode] = useState(false);
  const [ratings, setRatings] = useState({ overall: 0, food: 0, service: 0, ambience: 0 });
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch dashboard data directly from Firebase
  const { data: dashboardData, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const total = docs.length;
      const sumOverall = docs.reduce((acc, curr) => acc + (curr.overall || 0), 0);
      const averageOverall = total > 0 ? sumOverall / total : 0;
      
      const distribution = [5, 4, 3, 2, 1].map(rating => ({
        rating,
        count: docs.filter((d: any) => d.overall === rating).length
      }));
      
      const categoryAverages = ['food', 'service', 'ambience'].map(cat => {
        const sum = docs.reduce((acc, curr) => acc + (curr[cat] || 0), 0);
        return { category: cat, average: total > 0 ? sum / total : 0 };
      });
      
      const topCategory = categoryAverages.reduce((prev, current) => (prev.average > current.average) ? prev : current, categoryAverages[0]);

      return {
        responseCount: total,
        averageOverall,
        distribution,
        categoryAverages,
        topCategory: topCategory?.category || '—',
        topCategoryAverage: topCategory?.average || 0,
        latestComments: docs.filter((d: any) => d.comment).slice(0, 10).map((d: any) => ({
          id: d.id,
          overall: d.overall,
          comment: d.comment,
          name: d.name,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt
        }))
      };
    },
    enabled: staffMode,
  });

  // Submit feedback directly to Firebase
  const submitMutation = useMutation({
    mutationFn: async (input: any) => {
      await addDoc(collection(db, 'feedback'), {
        ...input,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const setRating = (category: keyof typeof ratings, value: number) => {
    setRatings((current) => ({ ...current, [category]: value }));
    setFormError('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Object.values(ratings).some((rating) => rating < 1 || rating > 5)) {
      setFormError('Please rate each part of your visit before sending.');
      return;
    }
    setFormError('');
    const input = {
      ...ratings,
      ...(comment.trim() ? { comment: comment.trim() } : {}),
      ...(name.trim() ? { name: name.trim() } : {}),
    };
    submitMutation.mutate(input);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (docs.length === 0) {
        setExportError('No feedback to export.');
        return;
      }
      
      const headers = ['Date', 'Name', 'Overall', 'Food', 'Service', 'Ambience', 'Comment'];
      const csvRows = [headers.join(',')];
      
      docs.forEach((doc: any) => {
        const date = doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleString() : (doc.createdAt || 'Unknown');
        const row = [
          `"${date}"`,
          `"${(doc.name || 'Anonymous').replace(/"/g, '""')}"`,
          doc.overall || 0,
          doc.food || 0,
          doc.service || 0,
          doc.ambience || 0,
          `"${(doc.comment || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      const file = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'for-you-feedback.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Could not prepare the CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="For You Chinese Restaurant">
          <span className="brand-mark"><UtensilsCrossed size={15} strokeWidth={1.7} /></span>
          <span><span className="brand-title">FOR YOU</span><span className="brand-sub">CHINESE RESTAURANT</span></span>
        </div>
        <button className="view-toggle" type="button" data-testid="button-toggle-view" onClick={() => setStaffMode((value) => !value)}>
          {staffMode ? 'Guest view' : 'Staff view'} <ChevronRight size={12} />
        </button>
      </header>
      {staffMode ? (
        <StaffDashboard
          data={dashboardData}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRefresh={() => void refetch()}
          onExport={handleExport}
          isExporting={isExporting}
          exportError={exportError}
        />
      ) : (
        <main className="guest-layout fade-up">
          <section>
            <div className="eyebrow">A quick table check-in</div>
            <h1 className="hero-title">How was your <span>experience?</span></h1>
            <p className="hero-copy">A minute of honest feedback helps us make every plate and every visit better.</p>
            <div className="privacy-chip"><MessageSquareText size={12} /> Anonymous is okay</div>
          </section>
          <section className="feedback-card" aria-label="Share your experience">
            {submitted ? (
              <div className="success-view" role="status" data-testid="status-feedback-success">
                <div className="success-icon"><Check size={21} /></div>
                <div className="eyebrow">Thank you</div>
                <h2>Your voice matters.</h2>
                <p>Your feedback has been shared with our team. We appreciate you taking the time.</p>
                <button className="text-button" type="button" data-testid="button-submit-another" onClick={() => {
                  setSubmitted(false); setRatings({ overall: 0, food: 0, service: 0, ambience: 0 }); setComment(''); setName('');
                }}>Leave another review</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <RatingControl label="Overall experience" field="overall" value={ratings.overall} onChange={setRating} large />
                <div className="subratings">
                  <RatingControl label="Food" field="food" value={ratings.food} onChange={setRating} />
                  <RatingControl label="Service" field="service" value={ratings.service} onChange={setRating} />
                  <RatingControl label="Ambience" field="ambience" value={ratings.ambience} onChange={setRating} />
                </div>
                <div className="form-group">
                  <label htmlFor="feedback-comment" className="form-label">Anything you'd like us to know?</label>
                  <textarea id="feedback-comment" className="text-area" data-testid="input-comment" maxLength={1000} placeholder="A dish you loved, something we can improve..." value={comment} onChange={(event) => setComment(event.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="feedback-name" className="form-label">Name <span style={{ color: '#706b61', fontWeight: 400 }}>(optional)</span></label>
                  <input id="feedback-name" className="text-input" data-testid="input-name" maxLength={60} placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                {formError && <div className="status-message status-error" role="alert" data-testid="status-form-error">{formError}</div>}
                {submitMutation.isError && <div className="status-message status-error" role="alert" data-testid="status-submit-error">We couldn't send your feedback. Please try again.</div>}
                <button className="submit-button" type="submit" data-testid="button-submit-feedback" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Sending your feedback…' : 'Send feedback'} {!submitMutation.isPending && <ArrowRight size={14} />}
                </button>
                <p className="form-hint">Comments and optional names are visible to anyone with this website link.</p>
              </form>
            )}
          </section>
        </main>
      )}
      <footer className="footer-note">Good food is a conversation. Thank you for being part of it.</footer>
    </div>
  );
}

type RatingKey = 'overall' | 'food' | 'service' | 'ambience';
function RatingControl({ label, field, value, onChange, large = false }: {
  label: string; field: RatingKey; value: number;
  onChange: (field: RatingKey, value: number) => void; large?: boolean;
}) {
  const descriptions = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  return (
    <fieldset className={large ? 'rating-block' : 'subrating'} style={{ border: 0, paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0 }}>
      <legend className="field-label">{label}</legend>
      <div className="star-row" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating} type="button" role="radio" aria-checked={value === rating}
            aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'} — ${descriptions[rating - 1]}`}
            className={`star-button ${value >= rating ? 'is-active' : ''}`}
            data-testid={`button-rating-${field}-${rating}`}
            onClick={() => onChange(field, rating)}
          ><Star size={large ? 18 : 15} fill={value >= rating ? 'currentColor' : 'none'} strokeWidth={1.7} /></button>
        ))}
      </div>
    </fieldset>
  );
}

function StaffDashboard({ data, isLoading, isError, error, onRefresh, onExport, isExporting, exportError }: {
  data?: DashboardData; isLoading: boolean; isError: boolean; error: unknown;
  onRefresh: () => void; onExport: () => void; isExporting: boolean; exportError: string;
}) {
  if (isError) {
    const message = error instanceof Error ? error.message : 'Please try again in a moment.';
    return <main className="dashboard-wrap fade-up"><div className="dashboard-head"><div><div className="eyebrow">Team snapshot</div><h1 className="dashboard-title">Customer voice</h1></div></div><section className="panel dashboard-error" role="alert"><div className="eyebrow">Could not load feedback</div><p>{message}</p><button type="button" className="outline-button" data-testid="button-retry-dashboard" onClick={onRefresh}><RefreshCw size={13} /> Try again</button></section></main>;
  }
  const distribution = data?.distribution ?? [];
  const maxCount = Math.max(...distribution.map((item) => item.count), 1);
  const comments = data?.latestComments ?? [];
  const average = data?.averageOverall;
  return (
    <main className="dashboard-wrap fade-up">
      <div className="dashboard-head">
        <div><div className="eyebrow">Team snapshot</div><h1 className="dashboard-title">Customer voice</h1></div>
        <div className="head-actions">
          <button type="button" className="outline-button" data-testid="button-refresh-dashboard" disabled={isLoading} onClick={onRefresh}><RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh</button>
          <button type="button" className="outline-button" data-testid="button-export-csv" disabled={isExporting} onClick={onExport}><ArrowDownToLine size={13} /> {isExporting ? 'Preparing…' : 'Export CSV'}</button>
        </div>
      </div>
      {exportError && <div className="status-message status-error" role="alert" data-testid="status-export-error">{exportError}</div>}
      {isLoading && !data ? (
        <div className="metric-grid" aria-label="Loading dashboard"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
      ) : (
        <>
          <div className="metric-grid">
            <section className="metric-card" data-testid="metric-average">
              <div className="metric-label">Average</div><div className="metric-value">{average == null ? '—' : average.toFixed(1)}<small>/ 5</small></div>
              {average != null && <div className="small-stars" aria-label={`${average.toFixed(1)} out of 5 stars`}>{[1,2,3,4,5].map((x) => <Star key={x} size={11} fill={average >= x - .45 ? 'currentColor' : 'none'} />)}</div>}
            </section>
            <section className="metric-card" data-testid="metric-responses"><div className="metric-label">Responses</div><div className="metric-value">{data?.responseCount ?? 0}</div><div className="metric-caption">Guest feedback received</div></section>
            <section className="metric-card" data-testid="metric-top-category"><div className="metric-label">Top signal</div><div className="metric-value" style={{ fontSize: 29 }}>{data?.topCategory ?? '—'}</div><div className="metric-caption">{data?.topCategoryAverage == null ? 'Highest category average' : `Highest category average · ${data.topCategoryAverage.toFixed(1)}`}</div></section>
          </div>
          <div className="dashboard-lower">
            <section className="panel">
              <div className="panel-heading"><div className="panel-kicker">Rating mix</div><Clock3 size={14} color="#8c877c" /></div>
              <h2 className="panel-title">At a glance</h2>
              {data?.responseCount ? (
                <div className="distribution">{[5,4,3,2,1].map((star) => {
                  const count = distribution.find((entry) => entry.rating === star)?.count ?? 0;
                  return <div className="distribution-row" key={star}><span>{star}★</span><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(count / maxCount * 100, count > 0 ? 3 : 0)}%` }} /></div><span className="dist-count">{count}</span></div>;
                })}</div>
              ) : <div className="empty-comments" data-testid="empty-rating-distribution">Ratings will appear here after the first review.</div>}
            </section>
            <section className="panel">
              <div className="panel-heading"><div className="panel-kicker">Latest comments</div><MessageSquareText size={14} color="#8c877c" /></div>
              <h2 className="panel-title">What guests said</h2>
              {comments.length ? <div className="comments-list">{comments.map((entry) => (
                <article className="comment-item" key={entry.id} data-testid={`comment-entry-${entry.id}`}>
                  <div className="comment-meta"><span className="comment-rating">{entry.overall}/5</span><span>{formatDate(entry.createdAt)}</span>{entry.name && <span className="comment-author">{entry.name}</span>}</div>
                  {entry.comment && <p className="comment-text">{entry.comment}</p>}
                </article>
              ))}</div> : <div className="empty-comments" data-testid="empty-latest-comments">{data?.responseCount ? 'No written comments yet.' : 'Guest comments will appear here after the first review.'}</div>}
            </section>
          </div>
          {data?.categoryAverages?.length ? <section className="panel category-strip" aria-label="Category averages">{data.categoryAverages.map((category) => <div className="category-item" key={category.category}><span>{category.category}</span><strong>{category.average.toFixed(1)} / 5</strong></div>)}</section> : null}
        </>
      )}
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

export default App;
