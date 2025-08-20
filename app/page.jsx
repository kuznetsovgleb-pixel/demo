'use client';
import React, {useMemo, useState} from 'react';

const DATA=[
  {id:'ORD-001234',client:'Kusto Logistics',warehouse:'ALA-DC1',items:18,status:'Packed',createdAt:'2025-08-05T09:20:00Z',eta:'2025-08-21T15:00:00Z'},
  {id:'ORD-001235',client:'Altai Foods',warehouse:'ALA-DC1',items:6,status:'Shipped',createdAt:'2025-08-10T10:10:00Z',eta:'2025-08-20T12:00:00Z'},
  {id:'ORD-001236',client:'Nomad Wear',warehouse:'ALA-DC2',items:42,status:'Delivered',createdAt:'2025-08-12T13:00:00Z',eta:'2025-08-19T18:00:00Z'},
  {id:'ORD-001237',client:'Eurasia Pharma',warehouse:'ALA-DC1',items:9,status:'Received',createdAt:'2025-08-16T08:30:00Z',eta:'2025-08-23T10:00:00Z'},
];
const fmt = d => new Date(d).toLocaleString();

export default function Page(){
  const [q,setQ]=useState(''), [st,setSt]=useState('all'), [wh,setWh]=useState('all'), [sort,setSort]=useState('created_desc');
  const warehouses=[...new Set(DATA.map(x=>x.warehouse))], statuses=[...new Set(DATA.map(x=>x.status))];
  const list=useMemo(()=> {
    let r=DATA.filter(o=>(o.id+o.client+o.status+o.warehouse).toLowerCase().includes(q.toLowerCase())
      &&(st==='all'||o.status===st)&&(wh==='all'||o.warehouse===wh));
    r.sort((a,b)=>sort==='eta_asc'? new Date(a.eta)-new Date(b.eta) : new Date(b.createdAt)-new Date(a.createdAt));
    return r;
  },[q,st,wh,sort]);

  return (
    <div style={{padding:24,fontFamily:'system-ui,Segoe UI,Arial'}}>
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:12}}>Client Portal Lite</h1>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
        <input placeholder="Поиск" value={q} onChange={e=>setQ(e.target.value)} style={{padding:'8px 10px',border:'1px solid #ccc',borderRadius:8,minWidth:260}}/>
        <select value={st} onChange={e=>setSt(e.target.value)} style={{padding:8,border:'1px solid #ccc',borderRadius:8}}>
          <option value="all">Все статусы</option>{statuses.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={wh} onChange={e=>setWh(e.target.value)} style={{padding:8,border:'1px solid #ccc',borderRadius:8}}>
          <option value="all">Все склады</option>{warehouses.map(w=><option key={w} value={w}>{w}</option>)}
        </select>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:8,border:'1px solid #ccc',borderRadius:8}}>
          <option value="created_desc">Создан ↓</option><option value="eta_asc">ETA ↑</option>
        </select>
      </div>
      <table style={{width:'100%',fontSize:14,borderCollapse:'collapse'}}>
        <thead style={{background:'#f9fafb',color:'#6b7280',textAlign:'left'}}>
          <tr><th style={{padding:10}}>Номер</th><th style={{padding:10}}>Клиент</th><th style={{padding:10}}>Склад</th>
              <th style={{padding:10}}>Создан</th><th style={{padding:10}}>ETA</th><th style={{padding:10}}>Позиции</th><th style={{padding:10}}>Статус</th></tr>
        </thead>
        <tbody>
          {list.map(o=>(
            <tr key={o.id} style={{borderTop:'1px solid #f3f4f6'}}>
              <td style={{padding:10,fontWeight:600}}>{o.id}</td>
              <td style={{padding:10}}>{o.client}</td>
              <td style={{padding:10}}>{o.warehouse}</td>
              <td style={{padding:10,color:'#6b7280'}}>{fmt(o.createdAt)}</td>
              <td style={{padding:10,color:'#6b7280'}}>{fmt(o.eta)}</td>
              <td style={{padding:10}}>{o.items}</td>
              <td style={{padding:10}}><span style={{border:'1px solid #d1d5db',borderRadius:999,padding:'2px 8px'}}>{o.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
