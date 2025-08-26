import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Tag from '../components/ui/Tag';
import Table from '../components/ui/Table';
import Progress from '../components/ui/Progress';

export default function Withdraw({ onBack }: { onBack?: () => void }) {
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [type, setType] = useState<'alipay'|'bank'|'usdt'>('alipay');
  const [loading, setLoading] = useState(false);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [rows, setRows] = useState<React.ReactNode[][]>([]);

  useEffect(() => {
    invoke<{cashBalance:number}>('get_balance').then(b => setCashBalance(b?.cashBalance || 0));
    invoke<{ total:number; list:any[] }>('get_withdraw_history', { page:1, size:10 }).then(h => {
      const r = (h.list || []).map(item => ([
        `#${item.withdrawId ?? item.withdraw_id}`,
        `¥ ${(item.amount ?? 0).toFixed(2)}`,
        `${item.accountType ?? item.account_type} / ${item.account}`,
        <Tag key={item.withdrawId ?? item.withdraw_id} variant={
          (item.status===1)?'success':(item.status===2)?'danger':'warning'
        }>{(item.status===1)?'已完成':(item.status===2)?'已拒绝':'申请中'}</Tag>,
        new Date(item.createTime ?? item.create_time).toLocaleString()
      ]));
      setRows(r);
    });
  }, []);

  const submit = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      await invoke('apply_withdraw', { amount: Number(amount), accountType: type, account });
      setAmount(''); setAccount('');
      const h: any = await invoke('get_withdraw_history', { page:1, size:10 });
      const r = (h.list || []).map((item:any) => ([
        `#${item.withdrawId ?? item.withdraw_id}`,
        `¥ ${(item.amount ?? 0).toFixed(2)}`,
        `${item.accountType ?? item.account_type} / ${item.account}`,
        <Tag key={item.withdrawId ?? item.withdraw_id} variant={
          (item.status===1)?'success':(item.status===2)?'danger':'warning'
        }>{(item.status===1)?'已完成':(item.status===2)?'已拒绝':'申请中'}</Tag>,
        new Date(item.createTime ?? item.create_time).toLocaleString()
      ]));
      setRows(r);
      alert('提现申请已提交');
    } catch(e:any) {
      alert(e?.message || '提交失败');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="h-fluid-1 font-bold text-slate-900 dark:text-white">提现</h1>
          <p className="text-slate-600 dark:text-slate-300 text-fluid-sm">当前可提现余额：<b>¥ {cashBalance.toFixed(2)}</b></p>
        </div>
        {onBack && <button className="btn-secondary" onClick={onBack}>返回</button>}
      </header>

      <section className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-fluid-sm text-slate-500 dark:text-slate-300">到账方式</label>
            <select value={type} onChange={e=>setType(e.target.value as any)} className="input mt-1">
              <option value="alipay">支付宝</option>
              <option value="bank">银行卡</option>
              <option value="usdt">USDT</option>
            </select>
          </div>
          <div>
            <label className="text-fluid-sm text-slate-500 dark:text-slate-300">收款账号</label>
            <input className="input mt-1" value={account} onChange={e=>setAccount(e.target.value)} placeholder="手机号 / 卡号 / 钱包地址" />
          </div>
          <div>
            <label className="text-fluid-sm text-slate-500 dark:text-slate-300">提现金额（¥）</label>
            <input className="input mt-1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="最小 1.00" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={submit} disabled={loading} className="btn-primary">{loading?'提交中…':'申请提现'}</button>
          <div className="w-40"><Progress value={Math.min(100, (Number(amount)||0)/(cashBalance||1)*100)} /></div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">提现记录</h2>
        <Table headers={['编号','金额','账户','状态','时间']} rows={rows} />
      </section>
    </div>
  );
}
