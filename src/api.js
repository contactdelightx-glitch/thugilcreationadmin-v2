// Where the backend lives.
// Left empty (the default), calls go to the same address the page was loaded from, which in development
// is the Vite proxy (see vite.config.js). For a deployed site, set VITE_API_URL to the backend's address,
// e.g. VITE_API_URL=https://your-backend.onrender.com  (no trailing slash needed).
const API = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const apiFetch = (path, options) => fetch(`${API}${path}`, options);

export async function fetchUsers({ offset, limit, search, status, signal }) {
  const qs = new URLSearchParams({ offset, limit, status });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/users?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function send(url, options) {
  const res = await apiFetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const updateUserStatus = (id, status) =>
  send(`/api/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

export const deleteUser = (id) => send(`/api/users/${id}`, { method: 'DELETE' });

export async function fetchDesignCategories() {
  const res = await apiFetch('/api/designs/categories');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchDesigns({ category, label, search, offset, limit, signal }) {
  const qs = new URLSearchParams({ category, label, offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/designs?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function updateDesignLabel(category, id, label) {
  const res = await apiFetch(`/api/designs/${category}/${id}/label`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchDesign(category, id) {
  const res = await apiFetch(`/api/designs/${category}/${id}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function updateDesign(category, id, body) {
  const res = await apiFetch(`/api/designs/${category}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.fields = data.fields || {};
    throw err;
  }
  return data;
}

export async function deleteDesign(category, id) {
  const res = await apiFetch(`/api/designs/${category}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
}

export async function createDesign(category, body) {
  const res = await apiFetch(`/api/designs/${category}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.fields = data.fields || {};
    throw err;
  }
  return data;
}

export async function fetchImages({ search, offset, limit, refresh, signal }) {
  const qs = new URLSearchParams({ offset, limit });
  if (search) qs.set('search', search);
  if (refresh) qs.set('refresh', 'true');
  const res = await apiFetch(`/api/images?${qs}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function uploadImage(file) {
  const form = new FormData();
  form.append('files', file);
  const res = await apiFetch('/api/images', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
  return body.uploaded[0];
}

export async function fetchDesigners({ status, signal } = {}) {
  const qs = status ? `?status=${status}` : '';
  const res = await apiFetch(`/api/designers${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

// the designs one client has uploaded: just each design's name and picture
export async function fetchDesignerDesigns(id, { search, offset, limit, signal }) {
  const qs = new URLSearchParams({ offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/designers/${id}/designs?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function sendDesigner(url, options) {
  const res = await apiFetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const updateDesignerStatus = (id, status) =>
  sendDesigner(`/api/designers/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

export const deleteDesigner = (id) => sendDesigner(`/api/designers/${id}`, { method: 'DELETE' });

export async function createDesigner({ email, password, status }) {
  const res = await apiFetch('/api/designers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.fields = data.fields || {};
    throw err;
  }
  return data;
}

export async function fetchOrders({ search, status, offset, limit, signal }) {
  const qs = new URLSearchParams({ status, offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/orders?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchOrderSummary() {
  const res = await apiFetch('/api/orders/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchOrderItems(id) {
  const res = await apiFetch(`/api/orders/${id}/items`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).data;
}

export async function fetchOrderTrends(month) {
  const res = await apiFetch(`/api/orders/trends${month ? `?month=${month}` : ''}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchStudents({ search, filter, offset, limit, signal }) {
  const qs = new URLSearchParams({ filter, offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/students?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchStudentSummary() {
  const res = await apiFetch('/api/students/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchStudentEnrollments(id) {
  const res = await apiFetch(`/api/students/${id}/enrollments`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).data;
}

export async function fetchCoursePayments({ search, status, offset, limit, signal }) {
  const qs = new URLSearchParams({ status, offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/course-payments?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCoursePaymentSummary() {
  const res = await apiFetch('/api/course-payments/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCoursePaymentTrends(month) {
  const res = await apiFetch(`/api/course-payments/trends${month ? `?month=${month}` : ''}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCourses() {
  const res = await apiFetch('/api/courses');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).data;
}

export async function fetchCourseSummary() {
  const res = await apiFetch('/api/courses/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCourse(id) {
  const res = await apiFetch(`/api/courses/${id}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCourseCategories() {
  const res = await apiFetch('/api/course-categories');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).data;
}

export async function createCourse(body) {
  const res = await apiFetch('/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.fields = data.fields || {};
    throw err;
  }
  return data;
}

export async function uploadCourseThumbnail(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch('/api/courses/thumbnail', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
  return body.url;
}

export async function fetchCertificates({ search, status, offset, limit, signal }) {
  const qs = new URLSearchParams({ status, offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/certificates?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCertificateSummary() {
  const res = await apiFetch('/api/certificates/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchRatings({ search, filter, offset, limit, signal }) {
  const qs = new URLSearchParams({ filter, offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/ratings?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchRatingSummary() {
  const res = await apiFetch('/api/ratings/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchDoubts({ search, status, offset, limit, signal }) {
  const qs = new URLSearchParams({ status, offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/doubts?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchDoubtSummary() {
  const res = await apiFetch('/api/doubts/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function answerDoubt(id, answer) {
  const res = await apiFetch(`/api/doubts/${id}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.fields && data.fields.answer && `Answer ${data.fields.answer}`) || data.error || `Request failed (${res.status})`);
  return data;
}

// Approves a request by uploading the certificate (PDF or image) from the admin's device.
// `replace` swaps the file of a certificate that was already issued.
export async function issueCertificate(enrollmentId, file, { replace = false } = {}) {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch(`/api/certificates/${enrollmentId}/${replace ? 'file' : 'issue'}`, { method: 'PUT', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
export const certificateFileUrl = (enrollmentId) => `${API}/api/certificates/${enrollmentId}/file`;

async function sendCourse(url, options) {
  const res = await apiFetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.fields = data.fields || {};
    throw err;
  }
  return data;
}

export const updateCourse = (id, body) =>
  sendCourse(`/api/courses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const setCourseStatus = (id, status) =>
  sendCourse(`/api/courses/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });

export async function fetchCourseCurriculum(id) {
  const res = await apiFetch(`/api/courses/${id}/curriculum`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchDashboard() {
  const res = await apiFetch('/api/dashboard');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

// ---- design requests ("Contact designer" messages from the website and the app)
export async function fetchDesignRequests({ search, status, offset, limit, signal }) {
  const qs = new URLSearchParams({ status, offset, limit });
  if (search) qs.set('search', search);
  const res = await apiFetch(`/api/design-requests?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchDesignRequestSummary() {
  const res = await apiFetch('/api/design-requests/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export const updateDesignRequest = (id, change) =>
  send(`/api/design-requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(change),
  });

export const deleteDesignRequest = (id) => send(`/api/design-requests/${id}`, { method: 'DELETE' });

// the address of a picture the visitor attached (n = 1 or 2); the backend serves it
export const designRequestImageUrl = (id, n) => `${API}/api/design-requests/${id}/images/${n}`;

// downloads a design's original file (a Full Set with several files comes as one zip)
export const designDownloadUrl = (category, id) => `${API}/api/designs/${category}/${id}/download`;

// ---- course video upload (to Bunny). The file goes from the browser straight to Bunny; this server only prepares and checks it.
async function videoSend(url, options) {
  const res = await apiFetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}
export const startVideoUpload = (title) =>
  videoSend('/api/courses/videos/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
export const fetchVideoStatus = (id, { signal } = {}) => videoSend(`/api/courses/videos/bunny/${id}`, { signal });

// where to play a course video (its stream link and picture), for the preview on the course page
export async function fetchVideoSource(id) {
  const res = await apiFetch(`/api/courses/videos/${id}/source`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}
