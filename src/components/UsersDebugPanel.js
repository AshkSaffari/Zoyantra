import React, { useMemo, useState } from 'react';
import AccService from '../services/AccService_old';

const normalizeId = (id) => (id || '').replace(/^b\./, '');

const short = (v, n = 120) => {
  try { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > n ? s.slice(0, n) + '…' : s; }
  catch { return String(v); }
};

export default function UsersDebugPanel({ selectedProject, selectedHub, credentials }) {
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const projectIdRaw = selectedProject?.id || selectedProject?.projectId || '';
  const hubIdRaw = selectedHub?.id || selectedHub?.hubId || '';
  const projectIdNoB = normalizeId(projectIdRaw);
  const accountIdNoB = normalizeId(hubIdRaw);
  const actingUserId = credentials?.userInfo?.userId || credentials?.userInfo?.uid || '';

  const append = (entry) => setLog((l) => [{ at: new Date().toISOString(), ...entry }, ...l].slice(0, 200));

  async function safeBody(res) {
    try {
      const text = await res.text();
      try { return JSON.parse(text); } catch { return text; }
    } catch (e) {
      return '<no body>';
    }
  }

  const tests = useMemo(() => ([
    {
      id: 'acc-account-users',
      label: 'GET account users (hq/v1/accounts/{accountId}/users)',
      run: async () => {
        const url = `https://developer.api.autodesk.com/hq/v1/accounts/${accountIdNoB}/users?limit=10`;
        const headers = {
          Authorization: `Bearer ${credentials?.twoLegToken || credentials?.threeLegToken || '<none>'}`,
          'Content-Type': 'application/json'
        };
        const res = await fetch(url, { headers });
        return { url, headers, ok: res.ok, status: res.status, body: await safeBody(res) };
      }
    },
    {
      id: 'admin-project-users',
      label: 'GET project users (construction/admin/v1/projects/{projectId}/users)',
      run: async () => {
        const url = `https://developer.api.autodesk.com/construction/admin/v1/projects/${projectIdNoB}/users?limit=20`;
        const headers = {
          Authorization: `Bearer ${credentials?.twoLegToken || credentials?.threeLegToken || '<none>'}`,
          'Content-Type': 'application/json',
          ...(credentials?.twoLegToken ? { 'User-Id': actingUserId || '<missing-acting-user>' } : {})
        };
        const res = await fetch(url, { headers });
        return { url, headers, ok: res.ok, status: res.status, body: await safeBody(res) };
      }
    },
    {
      id: 'project-v1-users',
      label: 'GET project users (project/v1/projects/{projectId}/users)',
      run: async () => {
        const url = `https://developer.api.autodesk.com/project/v1/projects/${projectIdNoB}/users`;
        const headers = {
          Authorization: `Bearer ${credentials?.twoLegToken || credentials?.threeLegToken || '<none>'}`,
          'Content-Type': 'application/json'
        };
        const res = await fetch(url, { headers });
        return { url, headers, ok: res.ok, status: res.status, body: await safeBody(res) };
      }
    },
    {
      id: 'acc-account-user-detail',
      label: 'GET account user detail (hq/v1/accounts/{accountId}/users/{userId})',
      run: async () => {
        const pre = await fetch(`https://developer.api.autodesk.com/hq/v1/accounts/${accountIdNoB}/users?limit=1`, {
          headers: { Authorization: `Bearer ${credentials?.twoLegToken || credentials?.threeLegToken || ''}` }
        });
        const list = pre.ok ? await pre.json() : [];
        const userId = list?.[0]?.id || '00000000-0000-0000-0000-000000000000';
        const url = `https://developer.api.autodesk.com/hq/v1/accounts/${accountIdNoB}/users/${userId}`;
        const headers = {
          Authorization: `Bearer ${credentials?.twoLegToken || credentials?.threeLegToken || '<none>'}`,
          'Content-Type': 'application/json'
        };
        const res = await fetch(url, { headers });
        return { url, headers, ok: res.ok, status: res.status, body: await safeBody(res), pickedUserId: userId };
      }
    },
    {
      id: 'admin-project-user-detail',
      label: 'GET project user detail (construction/admin/v1/projects/{projectId}/users/{userId})',
      run: async () => {
        const pre = await fetch(`https://developer.api.autodesk.com/construction/admin/v1/projects/${projectIdNoB}/users?limit=1`, {
          headers: {
            Authorization: `Bearer ${credentials?.twoLegToken || credentials?.threeLegToken || ''}`,
            ...(credentials?.twoLegToken ? { 'User-Id': actingUserId || '<missing-acting-user>' } : {})
          }
        });
        const preData = pre.ok ? await pre.json() : { results: [] };
        const userId = preData?.results?.[0]?.id || '00000000-0000-0000-0000-000000000000';
        const url = `https://developer.api.autodesk.com/construction/admin/v1/projects/${projectIdNoB}/users/${userId}`;
        const headers = {
          Authorization: `Bearer ${credentials?.twoLegToken || credentials?.threeLegToken || '<none>'}`,
          'Content-Type': 'application/json',
          ...(credentials?.twoLegToken ? { 'User-Id': actingUserId || '<missing-acting-user>' } : {})
        };
        const res = await fetch(url, { headers });
        return { url, headers, ok: res.ok, status: res.status, body: await safeBody(res), pickedUserId: userId };
      }
    },
    {
      id: 'accservice-reliable',
      label: 'AccService.getProjectUsersReliable()',
      run: async () => {
        const data = await AccService.getProjectUsersReliable(projectIdNoB, hubIdRaw);
        return { url: 'AccService.getProjectUsersReliable()', headers: 'internal', ok: true, status: 'n/a', body: data?.slice?.(0, 3) || data };
      }
    },
    {
      id: 'accservice-account-users',
      label: 'AccService.getAccountUsers(hubId)',
      run: async () => {
        const data = await AccService.getAccountUsers(hubIdRaw, { limit: 10 });
        return { url: `AccService.getAccountUsers(${hubIdRaw})`, headers: 'internal', ok: true, status: 'n/a', body: data?.slice?.(0, 3) || data };
      }
    }
  ]), [projectIdNoB, hubIdRaw, accountIdNoB, credentials, actingUserId]);

  const runOne = async (t) => {
    setBusy(true);
    try {
      append({ type: 'info', msg: `▶ Running: ${t.label}` });
      const out = await t.run();
      append({
        type: out.ok ? 'success' : 'error',
        id: t.id,
        label: t.label,
        status: out.status,
        url: out.url,
        headers: out.headers,
        pickedUserId: out.pickedUserId,
        preview: short(out.body)
      });
      // eslint-disable-next-line no-console
      console.log('UsersDebug result', t.id, out);
    } catch (e) {
      append({ type: 'error', id: t.id, label: t.label, error: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  const runAll = async () => {
    for (const t of tests) {
      // eslint-disable-next-line no-await-in-loop
      await runOne(t);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3 mt-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Users Debugger</div>
        <div className="text-xs text-gray-500">
          projectId raw: {projectIdRaw} / no-b: {projectIdNoB} • hubId: {hubIdRaw} • acting user: {actingUserId || 'n/a'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={runAll} disabled={busy} className="px-3 py-1.5 border rounded-md bg-purple-600 text-white disabled:opacity-50">
          Run All
        </button>
        {tests.map(t => (
          <button key={t.id} onClick={() => runOne(t)} disabled={busy} className="px-3 py-1.5 border rounded-md">
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-72 overflow-auto border-t pt-2">
        {log.length === 0 ? (
          <div className="text-sm text-gray-500">No runs yet.</div>
        ) : (
          <ul className="text-xs space-y-2">
            {log.map((e, i) => (
              <li key={i} className={`p-2 rounded border ${e.type === 'error' ? 'border-red-300 bg-red-50' : e.type === 'success' ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <div className="font-medium">{e.at} — {e.label} {e.status ? `(status: ${e.status})` : ''}</div>
                {e.url && <div className="mt-1"><span className="text-gray-500">URL:</span> <span className="break-all">{e.url}</span></div>}
                {e.pickedUserId && <div className="mt-1"><span className="text-gray-500">pickedUserId:</span> {e.pickedUserId}</div>}
                {e.headers && <div className="mt-1"><span className="text-gray-500">Headers:</span> <code className="break-all">{short(e.headers, 200)}</code></div>}
                {e.preview && <div className="mt-1"><span className="text-gray-500">Preview:</span> <code className="break-all">{short(e.preview, 400)}</code></div>}
                {e.error && <div className="mt-1 text-red-600">{e.error}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


