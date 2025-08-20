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
    if (p.get('sort')) setSortBy(p.get('sor

