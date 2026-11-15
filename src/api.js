export async function fetchUsers({ offset, limit, search, status, signal }) {
  const qs = new URLSearchParams({ offset, limit, status });
  if (search) qs.set('search', search);
  const res = await fetch(`/api/users?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function send(url, options) {
  const res = await fetch(url, options);
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
  const res = await fetch('/api/designs/categories');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchDesigns({ category, label, search, offset, limit, signal }) {
  const qs = new URLSearchParams({ category, label, offset, limit });
  if (search) qs.set('search', search);
  const res = await fetch(`/api/designs?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function updateDesignLabel(category, id, label) {
  const res = await fetch(`/api/designs/${category}/${id}/label`, {
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
  const res = await fetch(`/api/designs/${category}/${id}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function updateDesign(category, id, body) {
  const res = await fetch(`/api/designs/${category}/${id}`, {
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
  const res = await fetch(`/api/designs/${category}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
}

export async function createDesign(category, body) {
  const res = await fetch(`/api/designs/${category}`, {
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
  const res = await fetch(`/api/images?${qs}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function uploadImage(file) {
  const form = new FormData();
  form.append('files', file);
  const res = await fetch('/api/images', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
  return body.uploaded[0];
}

export async function fetchDesigners({ status, signal } = {}) {
  const qs = status ? `?status=${status}` : '';
  const res = await fetch(`/api/designers${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function sendDesigner(url, options) {
  const res = await fetch(url, options);
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
  const res = await fetch('/api/designers', {
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
  const res = await fetch(`/api/orders?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchOrderSummary() {
  const res = await fetch('/api/orders/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchOrderItems(id) {
  const res = await fetch(`/api/orders/${id}/items`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).data;
}

export async function fetchOrderTrends(month) {
  const res = await fetch(`/api/orders/trends${month ? `?month=${month}` : ''}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchStudents({ search, filter, offset, limit, signal }) {
  const qs = new URLSearchParams({ filter, offset, limit });
  if (search) qs.set('search', search);
  const res = await fetch(`/api/students?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchStudentSummary() {
  const res = await fetch('/api/students/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchStudentEnrollments(id) {
  const res = await fetch(`/api/students/${id}/enrollments`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).data;
}

export async function fetchCoursePayments({ search, status, offset, limit, signal }) {
  const qs = new URLSearchParams({ status, offset, limit });
  if (search) qs.set('search', search);
  const res = await fetch(`/api/course-payments?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCoursePaymentSummary() {
  const res = await fetch('/api/course-payments/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCoursePaymentTrends(month) {
  const res = await fetch(`/api/course-payments/trends${month ? `?month=${month}` : ''}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCourses() {
  const res = await fetch('/api/courses');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).data;
}

export async function fetchCourseSummary() {
  const res = await fetch('/api/courses/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCourse(id) {
  const res = await fetch(`/api/courses/${id}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCourseCategories() {
  const res = await fetch('/api/course-categories');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()).data;
}

export async function createCourse(body) {
  const res = await fetch('/api/courses', {
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
  const res = await fetch('/api/courses/thumbnail', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
  return body.url;
}

export async function fetchCertificates({ search, status, offset, limit, signal }) {
  const qs = new URLSearchParams({ status, offset, limit });
  if (search) qs.set('search', search);
  const res = await fetch(`/api/certificates?${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCertificateSummary() {
  const res = await fetch('/api/certificates/summary');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
