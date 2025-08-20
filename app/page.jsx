'use client';
import React, { useEffect, useMemo, useState } from 'react';

/** ===== Seed data (используется при первом запуске) ===== */
const SEED = [
  {
    id: 'ORD-001234',
    client: 'Kusto Logistics',
    createdAt: '2025-08-05T09:20:00Z',
    eta: '2025-08-21T15:00:00Z',
    items: 18,
    status: 'Packed',
    warehouse: 'ALA-DC1',
    milestones: [
      { key: 'Received', ts: '2025-08-05T09:21:00Z' },
      { key: 'Picked', ts: '2025-08-06T14:00:00Z' },
      { key: 'Packed', ts: '2025-08-06T18:30:00Z' },
      { key: 'Shipped', ts: null },
      { key: 'Delivered', ts: null },
    ],
    files: [{ name: 'invoice_001234.pdf', size: '124 KB' }],
  },
  {
    id: 'ORD-001235',
    client: 'Altai Foods',
    createdAt: '2025-08-10T10:10:00Z',
    eta: '2025-08-20T12:00:00Z',
    items: 6,
    status: 'Shipped',
    warehouse: 'ALA-DC1',
    milestones: [
      { key: 'Received', ts: '2025-08-10T10:15:00Z' },
      { key: 'Picked', ts: '2025-08-11T08:40:00Z' },
      { key: 'Packed', ts: '2025-08-11T11:05:00Z' },
      { key: 'Shipped', ts: '2025-08-12T16:45:00Z' },
      { key: 'Delivered', ts: null },
    ],
    files: [],
  },
  {
    id: 'ORD-001236',
    client: 'Nomad Wear',
    createdAt: '2025-08-12T13:00:00Z',
    eta: '2025-08-19T18:00:00Z',
    items: 42,
    status: 'Delivered',
    warehouse: 'ALA-DC2',
    milestones: [
      { key: 'Received', ts: '2025-08-12T13:10:00Z' },
      { key: 'Picked', ts: '2025-08-13T07:40:00Z' },
      { key: 'Packed', ts: '2025-08-13T12:20:00Z' },
      { key: 'Shipped', ts: '2025-08-14T09:15:00Z' },
      { key: 'Delivered', ts: '2025-08-17T17:35:00Z' },
    ],
    files: [{ name: 'packing_list_001236.pdf', size: '98 KB' }],
  },
  {
    id: 'ORD-001237',
    client: 'Eurasia Pharma',
    createdAt: '2025-08-16T08:30:00Z',
    eta: '2025-08-23T10:00:00Z',
    items: 9,
    status: 'Received',
    warehouse: 'ALA-DC1',
    milestones: [
      { key: 'Received', ts: '2025-08-16T08:35:00Z' },
      { key: 'Picked', ts: null },
      { key: 'Packed', ts: null },
      { key: 'Shipped', ts: null },
      { key: 'Delivered', ts: null },
    ],
    files: [],
  },
];

const STATUS_OPTIONS = ['Received', 'Picked', 'Packed', 'Shipped', 'Delivered'];

const DEFAULT_COLUMNS = {
  id: true,
  client: true,
  warehouse: true,
  createdAt: true,
  eta: true,
  items: true,
  status: true,
  progress: true,
};

const fmt = (d) => new Date(d).toLocaleString();

/** Simple progress component */
function Progress({ milestones }) {
  const total = milestones.length;
  const done = milestones.filter((m) => !!m.ts).length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-gray-200">
      <div className="h-2 rounded-full bg-black" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Dumb modal (без зависимостей) */
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-w-3xl w-full rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function Page() {
  /** ===== STATE ===== */
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [warehouse, setWarehouse] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [role, setRole] = useState('viewer'); // 'viewer' | 'admin'
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [checked, setChecked] = useState({}); // для массовых действий

  /** ===== INIT (seed + URL-параметры + localStorage) ===== */
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('orders') : null;
    setOrders(saved ? JSON.parse(saved) : SEED);

    const p = new URLSearchParams(window.location.search);
    if (p.get('q')) setQuery(p.get('q') || '');
    if (p.get('status')) setStatuses(p.get('status').split(',').filter(Boolean));
    if (p.get('wh')) setWarehouse(p.get('wh') || 'all');
    if (p.get('sort')) setSortBy(p.get('sort') || 'createdAt_desc');
    if (p.get('df')) setDateFrom(p.get('df') || '');
    if (p.get('dt')) setDateTo(p.get('dt') || '');
    if (p.get('ps')) setPageSize(Number(p.get('ps')));
    if (p.get('cols')) {
      try {
        const parsed = JSON.parse(p.get('cols'));
        setColumns({ ...DEFAULT_COLUMNS, ...parsed });
      } catch {}
    }
  }, []);

  /** persist orders */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orders', JSON.stringify(orders));
    }
  }, [orders]);

  /** ===== DERIVED ===== */
  const warehouses = useMemo(() => Array.from(new Set(orders.map((o) => o.warehouse))), [orders]);

  const filteredBase = useMemo(() => {
    let list = [...orders];
    const q = query.trim().toLowerCase();

    if (q) list = list.filter((o) => [o.id, o.client, o.status, o.warehouse].some((v) => String(v).toLowerCase().includes(q)));
    if (statuses.length) list = list.filter((o) => statuses.includes(o.status));
    if (warehouse !== 'all') list = list.filter((o) => o.warehouse === warehouse);
    if (dateFrom) list = list.filter((o) => new Date(o.createdAt) >= new Date(dateFrom));
    if (dateTo) list = list.filter((o) => new Date(o.createdAt) <= new Date(`${dateTo}T23:59:59`));

    list.sort((a, b) => {
      const map = {
        createdAt_desc: +new Date(b.createdAt) - +new Date(a.createdAt),
        createdAt_asc: +new Date(a.createdAt) - +new Date(b.createdAt),
        eta_asc: +new Date(a.eta) - +new Date(b.eta),
        eta_desc: +new Date(b.eta) - +new Date(a.eta),
        client_asc: a.client.localeCompare(b.client),
        client_desc: b.client.localeCompare(a.client),
      };
      return map[sortBy] ?? 0;
    });
    return list;
  }, [orders, query, statuses, warehouse, dateFrom, dateTo, sortBy]);

  const total = filteredBase.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filteredBase.slice(start, start + pageSize);
  }, [filteredBase, pageSafe, pageSize]);

  const kpis = useMemo(() => {
    const today = new Date();
    const shippedToday = filteredBase.filter((o) => o.milestones?.find((m) => m.key === 'Shipped' && m.ts && new Date(m.ts).toDateString() === today.toDateString())).length;
    const delivered = filteredBase.filter((o) => o.status === 'Delivered');
    const slaOk = delivered.filter((o) => new Date(o.milestones?.find((m) => m.key === 'Delivered')?.ts || 0) <= new Date(o.eta)).length;
    const sla = delivered.length ? Math.round((slaOk / delivered.length) * 100) : 0;
    return {
      total: filteredBase.length,
      inProgress: filteredBase.filter((o) => ['Received', 'Picked', 'Packed', 'Shipped'].includes(o.status)).length,
      shippedToday,
      sla,
    };
  }, [filteredBase]);

  /** ===== HELPERS ===== */
  function toggleStatus(s) {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setPage(1);
  }

  function exportCSV() {
    const cols = Object.entries(columns).filter(([, v]) => v).map(([k]) => k);
    const headerMap = { id: 'Номер', client: 'Клиент', warehouse: 'Склад', createdAt: 'Создан', eta: 'ETA', items: 'Позиции', status: 'Статус', progress: 'Прогресс' };
    const header = cols.map((c) => headerMap[c] || c);
    const rows = filteredBase.map((o) =>
      cols.map((c) => {
        switch (c) {
          case 'createdAt':
            return fmt(o.createdAt);
          case 'eta':
            return fmt(o.eta);
          case 'progress':
            return `${Math.round(((o.milestones || []).filter((m) => !!m.ts).length / (o.milestones || []).length) * 100)}%`;
          default:
            return String(o[c]);
        }
      }),
    );
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function shareLink() {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (statuses.length) p.set('status', statuses.join(','));
    if (warehouse !== 'all') p.set('wh', warehouse);
    if (sortBy) p.set('sort', sortBy);
    if (dateFrom) p.set('df', dateFrom);
    if (dateTo) p.set('dt', dateTo);
    if (pageSize) p.set('ps', String(pageSize));
    const changedCols = Object.fromEntries(Object.entries(columns).filter(([k, v]) => DEFAULT_COLUMNS[k] !== v));
    if (Object.keys(changedCols).length) p.set('cols', JSON.stringify(changedCols));
    const url = `${window.location.origin}${window.location.pathname}?${p.toString()}`;
    navigator.clipboard.writeText(url);
    alert('Ссылка с текущими фильтрами скопирована');
  }

  function openOrder(o) {
    setSelected(o);
    setActiveTab('info');
    setOpen(true);
  }

  /** Импорт CSV: колонки id,client,warehouse,items,status,createdAt,eta (порядок не важен) */
  function importCSV(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
      const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const idx = (name) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
      const add = [];
      for (const line of lines) {
        const cols = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
        const val = (i) => (cols[i] || '').replace(/^"|"$/g, '').replace(/""/g, '"');
        const rec = {
          id: val(idx('id')) || `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          client: val(idx('client')) || 'Unknown',
          warehouse: val(idx('warehouse')) || 'DC',
          items: Number(val(idx('items')) || 0),
          status: val(idx('status')) || 'Received',
          createdAt: val(idx('createdAt')) || new Date().toISOString(),
          eta: val(idx('eta')) || new Date(Date.now() + 3 * 86400000).toISOString(),
          milestones: [
            { key: 'Received', ts: new Date().toISOString() },
            { key: 'Picked', ts: null },
            { key: 'Packed', ts: null },
            { key: 'Shipped', ts: null },
            { key: 'Delivered', ts: null },
          ],
          files: [],
        };
        add.push(rec);
      }
      setOrders((prev) => [...add, ...prev]);
      alert(`Импортировано записей: ${add.length}`);
    };
    reader.readAsText(file);
  }

  /** Массовые действия (Admin) */
  function bulkMarkShipped() {
    const ids = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!ids.length) return;
    setOrders((prev) =>
      prev.map((o) => {
        if (!ids.includes(o.id)) return o;
        const milestones = (o.milestones || []).map((m) => (m.key === 'Shipped' ? { ...m, ts: new Date().toISOString() } : m));
        return { ...o, status: 'Shipped', milestones };
      }),
    );
    setChecked({});
  }

  function bulkDelete() {
    const ids = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!ids.length) return;
    if (!confirm(`Удалить ${ids.length} записей?`)) return;
    setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
    setChecked({});
  }

  /** ===== UI ===== */
  return (
    <div className="min-h-screen p-6 bg-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">Client Portal Lite</h1>
            <p className="text-sm text-gray-500 -mt-1">Прозрачность статусов • Документы • Уведомления</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">Сегодня: {new Date().toLocaleDateString()}</div>

          {/* Импорт CSV */}
          <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm">
            Импорт CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
          </label>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-4 pt-4 text-base font-semibold">Всего заказов</div>
          <div className="px-4 pb-4 pt-2 text-2xl font-semibold">{kpis.total}</div>
        </div>
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-4 pt-4 text-base font-semibold">В процессе</div>
          <div className="px-4 pb-4 pt-2 text-2xl font-semibold">{kpis.inProgress}</div>
        </div>
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-4 pt-4 text-base font-semibold">Отгружено сегодня</div>
          <div className="px-4 pb-4 pt-2 text-2xl font-semibold">{kpis.shippedToday}</div>
        </div>
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-4 pt-4 text-base font-semibold">SLA (в срок)</div>
          <div className="px-4 pb-4 pt-2">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="text-gray-500">On-time</div>
              <div>{kpis.sla}%</div>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-black" style={{ width: `${kpis.sla}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-white shadow-sm mb-4">
        <div className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="flex-1 flex gap-2">
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Поиск по заказам, клиентам, складу, статусу…"
              />
            </div>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
              <option value="all">Все склады</option>
              {warehouses.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="createdAt_desc">Создан ↓</option>
              <option value="createdAt_asc">Создан ↑</option>
              <option value="eta_asc">ETA ↑</option>
              <option value="eta_desc">ETA ↓</option>
              <option value="client_asc">Клиент A→Z</option>
              <option value="client_desc">Клиент Z→A</option>
            </select>
            <div className="flex items-center gap-2">
              <button onClick={shareLink} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                Поделиться
              </button>
              <button onClick={exportCSV} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                CSV
              </button>

              {/* Колонки */}
              <details className="relative">
                <summary className="list-none cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm">Колонки</summary>
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border bg-white p-2 shadow">
                  {Object.keys(DEFAULT_COLUMNS).map((k) => (
                    <label key={k} className="flex items-center gap-2 py-1 text-sm">
                      <input type="checkbox" checked={columns[k]} onChange={() => setColumns((prev) => ({ ...prev, [k]: !prev[k] }))} />
                      <span className="capitalize">{k}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </div>

          {/* Toggle statuses + dates */}
          <div className="flex flex-wrap gap-2 items-center">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} className={`rounded-lg border px-3 py-1 text-sm ${statuses.includes(s) ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-300'}`} onClick={() => toggleStatus(s)}>
                {s}
              </button>
            ))}
            <div className="ms-auto flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-[160px]" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-[160px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin bulk actions */}
      {role === 'admin' && (
        <div className="flex items-center gap-2 mb-2">
          <button onClick={bulkMarkShipped} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            Mark selected as Shipped
          </button>
          <button onClick={bulkDelete} className="rounded-lg border border-red-300 text-red-700 px-3 py-2 text-sm">
            Delete selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="px-4 pt-4 text-lg font-semibold">Заказы</div>
        <div className="p-4">
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  {role === 'admin' && <th className="p-3 w-10">✓</th>}
                  {columns.id && <th className="p-3">Номер</th>}
                  {columns.client && <th className="p-3">Клиент</th>}
                  {columns.warehouse && <th className="p-3">Склад</th>}
                  {columns.createdAt && <th className="p-3">Создан</th>}
                  {columns.eta && <th className="p-3">ETA</th>}
                  {columns.items && <th className="p-3">Позиции</th>}
                  {columns.status && <th className="p-3">Статус</th>}
                  {columns.progress && <th className="p-3">Прогресс</th>}
                </tr>
              </thead>
              <tbody>
                {paged.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    {role === 'admin' && (
                      <td className="p-3">
                        <input type="checkbox" checked={!!checked[o.id]} onChange={(e) => setChecked((c) => ({ ...c, [o.id]: e.target.checked }))} />
                      </td>
                    )}
                    {columns.id && (
                      <td className="p-3 font-medium cursor-pointer" onClick={() => openOrder(o)}>
                        {o.id}
                      </td>
                    )}
                    {columns.client && <td className="p-3">{o.client}</td>}
                    {columns.warehouse && <td className="p-3"><span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs border-gray-300 text-gray-700">{o.warehouse}</span></td>}
                    {columns.createdAt && <td className="p-3 text-gray-500">{fmt(o.createdAt)}</td>}
                    {columns.eta && <td className="p-3 text-gray-500">{fmt(o.eta)}</td>}
                    {columns.items && <td className="p-3">{o.items}</td>}
                    {columns.status && (
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${o.status === 'Delivered' ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-gray-300 text-gray-700'}`}>
                          {o.status}
                        </span>
                      </td>
                    )}
                    {columns.progress && (
                      <td className="p-3 w-56">
                        <Progress milestones={o.milestones || []} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-500">
              Показано {paged.length} из {total}
            </div>
            <div className="flex items-center gap-3">
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-[110px]" value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
              <div className="flex items-center gap-1">
                <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm" disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</button>
                <div className="text-sm w-16 text-center">{pageSafe}/{totalPages}</div>
                <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm" disabled={pageSafe >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>→</button>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">Клик по номеру заказа — откроет детали.</p>
        </div>
      </div>

      {/* Dialog */}
      <Modal open={open} onClose={() => setOpen(false)}>
        {selected && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Детали заказа {selected.id}</div>

            {/* Tabs */}
            <div className="flex gap-2">
              {['info', 'timeline', 'files'].map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} className={`rounded-lg border px-3 py-1 text-sm ${activeTab === t ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-300'}`}>
                  {t === 'info' ? 'Инфо' : t === 'timeline' ? 'Таймлайн' : 'Файлы'}
                </button>
              ))}
            </div>

            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Row label="Клиент" value={selected.client} />
                  <Row label="Склад" value={<span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs border-gray-300 text-gray-700">{selected.warehouse}</span>} />
                  <Row label="Создан" value={fmt(selected.createdAt)} />
                  <Row label="ETA" value={fmt(selected.eta)} />
                  <Row label="Позиции" value={String(selected.items)} />
                  <Row
                    label="Статус"
                    value={<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${selected.status === 'Delivered' ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-gray-300 text-gray-700'}`}>{selected.status}</span>}
                  />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button className="rounded-lg border border-black bg-black px-3 py-2 text-sm font-medium text-white" onClick={() => alert('Демо: скачивание PDF накладной')}>Скачать накладную (PDF)</button>
                    {role === 'admin' ? (
                      <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm" onClick={() => alert('Демо: смена статуса на Shipped')}>Mark as Shipped</button>
                    ) : (
                      <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm" disabled>Mark as Shipped</button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-2">Прогресс</div>
                  <Progress milestones={selected.milestones || []} />
                  <p className="text-xs text-gray-500 mt-2">Расчёт на основе закрытых этапов.</p>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <ol className="relative border-s pl-6 space-y-3">
                {(selected.milestones || []).map((m, idx) => (
                  <li key={idx}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{m.key}</div>
                      <div className="text-sm text-gray-500">{m.ts ? fmt(m.ts) : '—'}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {activeTab === 'files' && (
              <div className="space-y-2">
                {selected.files?.length ? (
                  selected.files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between border rounded-md p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs border-gray-300 text-gray-700">PDF</span>
                        {f.name}
                      </div>
                      <div className="text-gray-500">{f.size}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Файлы не прикреплены</div>
                )}
                <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full" onClick={() => alert('Демо: загрузка файла в Storage')}>
                  Загрузить файл
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <div className="mt-6 text-xs text-gray-500 text-center">
        Демо: данные фиктивные. Интеграции (1С/WMS/CSV/Webhooks/Telegram/Supabase) включаются по проекту. Поделиться фильтрами → кнопка «Поделиться».
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

