import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import './styles.css';

const ROLES = ['Treinamento','Aprendiz','Analista','Especialista','Supervisor','Responsável','Responsável Geral'];
const STATUSES = ['Ativo','Inativo','Suspenso','Afastado'];
const ADMIN_ROLES = ['Supervisor','Responsável','Responsável Geral'];
const today = () => new Date().toLocaleDateString('en-CA');
const errText = (e) => e?.message || 'Ocorreu um erro inesperado.';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [page, setPage] = useState('Dashboard');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [goals, setGoals] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const isAdmin = Boolean(profile && ADMIN_ROLES.includes(profile.role));
  const notify = (s) => { setToast(s); window.setTimeout(() => setToast(''), 3200); };

  const loadProfile = useCallback(async (user) => {
    if (!user) { setProfile(null); return; }
    const { data, error } = await supabase.from('staff_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data || data.status !== 'Ativo') {
      await supabase.auth.signOut();
      setProfile(null); setSession(null);
      throw new Error(data ? 'Seu acesso está inativo. Fale com a administração.' : 'Sua conta de login ainda não possui perfil autorizado. Fale com a administração.');
    }
    setProfile(data);
  }, []);

  const loadData = useCallback(async () => {
    if (!session || !profile) return;
    setBusy(true);
    try {
      const results = await Promise.all([
        supabase.from('staff_profiles').select('user_id,staff_id,name,discord,whatsapp,eqpg,role,status,email,created_at').order('name'),
        supabase.from('events').select('*').order('event_date', { ascending: true }),
        supabase.from('team_goals').select('*').order('created_at', { ascending: false }),
        supabase.from('schedules').select('*').order('schedule_date', { ascending: true }),
        supabase.from('availability').select('*').order('available_date', { ascending: true }),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100)
      ]);
      const [m,e,g,s,a,l] = results;
      for (const r of results) if (r.error) throw r.error;
      setMembers(m.data || []); setEvents(e.data || []); setGoals(g.data || []); setSchedules(s.data || []); setAvailability(a.data || []); setLogs(l.data || []);
    } catch (e) { notify(`Não foi possível carregar os dados: ${errText(e)}`); }
    finally { setBusy(false); }
  }, [session, profile]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user);
    }).catch(e => { if (mounted) setLoginError(errText(e)); }).finally(() => { if (mounted) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  useEffect(() => { if (session?.user && profile) loadData(); }, [session, profile, loadData]);

  const writeLog = async (action, detail, entityType = null, entityId = null) => {
    if (!profile || !session?.user) return;
    const { error } = await supabase.from('activity_logs').insert({ actor_id: session.user.id, actor_name: profile.name, action, detail, entity_type: entityType, entity_id: entityId ? String(entityId) : null });
    if (error) console.warn('Não foi possível registrar histórico:', error.message);
  };

  const signIn = async (e) => {
    e.preventDefault(); setLoginError(''); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
      if (error) throw error;
      setSession(data.session);
      await loadProfile(data.user);
      setLoginPassword('');
    } catch (e) { setLoginError(errText(e)); }
    finally { setLoading(false); }
  };
  const signOut = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); setPage('Dashboard'); };

  const saveEvent = async (form) => {
    const payload = { name: form.name.trim(), description: form.description || null, category: form.category || 'Normal', event_date: form.event_date || null, start_time: form.start_time || null, end_time: form.end_time || null, status: form.status || 'Agendado', notes: form.notes || null, responsible_id: form.responsible_id || null, created_by: session.user.id, participants: form.participants || [] };
    const q = form.id ? supabase.from('events').update(payload).eq('id', form.id) : supabase.from('events').insert(payload);
    const { error } = await q; if (error) throw error;
    await writeLog(form.id ? 'Evento atualizado' : 'Evento criado', payload.name, 'events', form.id);
    setModal(null); await loadData(); notify('Evento salvo no banco de dados.');
  };
  const deleteEvent = async (row) => { if (!confirm(`Excluir o evento “${row.name}”?`)) return; const { error } = await supabase.from('events').delete().eq('id', row.id); if (error) return notify(errText(error)); await writeLog('Evento excluído', row.name, 'events', row.id); await loadData(); notify('Evento excluído.'); };

  const saveGoal = async (form) => {
    const payload = { title: form.title.trim(), description: form.description || null, target_quantity: Number(form.target_quantity || 0), period_start: form.period_start || null, period_end: form.period_end || null, responsible_id: form.responsible_id || null, created_by: session.user.id };
    const q = form.id ? supabase.from('team_goals').update(payload).eq('id', form.id) : supabase.from('team_goals').insert(payload);
    const { error } = await q; if (error) throw error; await writeLog(form.id ? 'Meta atualizada' : 'Meta criada', payload.title, 'team_goals', form.id); setModal(null); await loadData(); notify('Meta salva.');
  };
  const deleteGoal = async (row) => { if (!confirm(`Excluir a meta “${row.title}”?`)) return; const { error } = await supabase.from('team_goals').delete().eq('id', row.id); if (error) return notify(errText(error)); await writeLog('Meta excluída', row.title, 'team_goals', row.id); await loadData(); };

  const saveSchedule = async (form) => {
    const payload = { title: form.title.trim(), schedule_date: form.schedule_date, start_time: form.start_time || null, end_time: form.end_time || null, responsible_id: form.responsible_id || null, assigned_members: form.assigned_members || [], notes: form.notes || null, created_by: session.user.id };
    const q = form.id ? supabase.from('schedules').update(payload).eq('id', form.id) : supabase.from('schedules').insert(payload);
    const { error } = await q; if (error) throw error; await writeLog(form.id ? 'Escala atualizada' : 'Escala criada', payload.title, 'schedules', form.id); setModal(null); await loadData(); notify('Escala salva.');
  };
  const deleteSchedule = async (row) => { if (!confirm(`Excluir “${row.title}”?`)) return; const { error } = await supabase.from('schedules').delete().eq('id', row.id); if (error) return notify(errText(error)); await writeLog('Escala excluída', row.title, 'schedules', row.id); await loadData(); };

  const saveAvailability = async (form) => {
    const payload = { user_id: session.user.id, available_date: form.available_date, start_time: form.start_time || null, end_time: form.end_time || null, notes: form.notes || null };
    const { error } = await supabase.from('availability').insert(payload); if (error) throw error; await writeLog('Disponibilidade publicada', payload.available_date, 'availability'); setModal(null); await loadData(); notify('Disponibilidade publicada.');
  };
  const deleteAvailability = async (row) => { const { error } = await supabase.from('availability').delete().eq('id', row.id); if (error) return notify(errText(error)); await loadData(); notify('Disponibilidade removida.'); };

  const saveMember = async (form) => {
    if (!isAdmin) throw new Error('Somente administradores podem alterar perfis.');
    const payload = { staff_id: form.staff_id.trim(), name: form.name.trim(), discord: form.discord || null, whatsapp: form.whatsapp || null, eqpg: form.eqpg || null, role: form.role, status: form.status };
    const { error } = await supabase.from('staff_profiles').update(payload).eq('user_id', form.user_id); if (error) throw error;
    await writeLog('Perfil de membro atualizado', payload.name, 'staff_profiles', form.user_id); setModal(null); await loadData(); notify('Perfil atualizado.');
  };

  const filteredMembers = useMemo(() => members.filter(m => `${m.name} ${m.staff_id} ${m.role} ${m.eqpg || ''}`.toLowerCase().includes(search.toLowerCase())), [members, search]);
  const filteredEvents = useMemo(() => events.filter(e => `${e.name} ${e.category || ''} ${e.status || ''}`.toLowerCase().includes(search.toLowerCase())), [events, search]);

  if (!isSupabaseConfigured) return <SetupError />;
  if (loading && !session) return <div className="center-screen"><div className="spinner"/><p>Conectando ao LISBOA EVENTOS…</p></div>;
  if (!session || !profile) return <main className="login-wrap"><form className="login-card" onSubmit={signIn}><div className="crown">♛</div><p className="eyebrow">ACESSO RESTRITO</p><h1>LISBOA <span>EVENTOS</span></h1><p className="muted">Entre com o e-mail e a senha da sua conta autorizada.</p><label>E-mail<input type="email" autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required /></label><label>Senha<input type="password" autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required /></label>{loginError && <p className="error">{loginError}</p>}<button className="primary full" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button><p className="tiny">Cadastro público desativado. Solicite acesso à administração.</p></form></main>;

  const nav = ['Dashboard','Registrar Eventos','Cronograma','Ranking de Eventos','Metas','Escala do Dia','Membros', ...(isAdmin ? ['Painel ADM'] : [])];
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span>♛</span><div><b>LISBOA</b><small>EVENTOS</small></div></div><div className="side-label">MENU PRINCIPAL</div><nav>{nav.map(n=><button key={n} className={page===n?'nav-active':''} onClick={()=>{setPage(n);setSearch('')}}><span>{({'Dashboard':'◈','Registrar Eventos':'◆','Cronograma':'▦','Ranking de Eventos':'★','Metas':'◎','Escala do Dia':'◷','Membros':'♙','Painel ADM':'♜'})[n]}</span>{n}</button>)}</nav><div className="sidebar-bottom"><div className="avatar">{profile.name?.slice(0,1)?.toUpperCase()}</div><div className="user-meta"><b>{profile.name}</b><small>{profile.role}</small></div><button className="logout" title="Sair" onClick={signOut}>↪</button></div></aside>
    <main className="main-area"><header className="topbar"><div><p className="eyebrow">LISBOA EVENTOS / PAINEL</p><h1>{page}</h1></div><div className="top-actions"><span className="online-dot">● Conectado</span><button className="secondary" onClick={loadData}>{busy?'Atualizando…':'↻ Atualizar'}</button></div></header>
      {page==='Dashboard' && <><div className="welcome"><div><p className="eyebrow">BEM-VINDA(O) DE VOLTA</p><h2>Olá, {profile.name}!</h2><p>Os dados abaixo são carregados do banco compartilhado da equipe.</p></div><div className="welcome-mark">♛</div></div><div className="stats"><Stat title="Membros ativos" value={members.filter(m=>m.status==='Ativo').length} hint="Equipe autorizada"/><Stat title="Eventos" value={events.length} hint="Registros no sistema"/><Stat title="Metas" value={goals.length} hint="Objetivos cadastrados"/><Stat title="Escalas" value={schedules.length} hint="Itens no cronograma"/></div><div className="two-col"><section className="panel"><div className="panel-head"><h2>Próximos eventos</h2><button className="link-button" onClick={()=>setPage('Registrar Eventos')}>Ver todos →</button></div><EventsTable rows={events.slice(0,5)} onEdit={r=>setModal({type:'event',data:r})} onDelete={deleteEvent} admin={isAdmin}/></section><section className="panel"><div className="panel-head"><h2>Atividade recente</h2></div><LogList rows={logs.slice(0,7)}/></section></div></>}
      {page==='Registrar Eventos' && <section className="panel"><div className="panel-head"><div><h2>Gestão de eventos</h2><p>Eventos sincronizados com o banco de dados.</p></div>{isAdmin&&<button className="primary" onClick={()=>setModal({type:'event',data:{event_date:today(),status:'Agendado',category:'Normal'}})}>＋ Novo evento</button>}</div><input className="search" placeholder="Buscar evento…" value={search} onChange={e=>setSearch(e.target.value)}/><EventsTable rows={filteredEvents} onEdit={r=>setModal({type:'event',data:r})} onDelete={deleteEvent} admin={isAdmin}/></section>}
      {page==='Membros' && <section className="panel"><div className="panel-head"><div><h2>Equipe autorizada</h2><p>Contas e cargos registrados no Supabase.</p></div></div><input className="search" placeholder="Buscar por nome, ID, cargo ou EQPG…" value={search} onChange={e=>setSearch(e.target.value)}/><div className="table-wrap"><table><thead><tr><th>MEMBRO</th><th>ID</th><th>EQPG</th><th>CARGO</th><th>STATUS</th>{isAdmin&&<th>AÇÕES</th>}</tr></thead><tbody>{filteredMembers.map(m=><tr key={m.user_id}><td><b>{m.name}</b><small className="subcell">{m.email||'E-mail não informado'}</small></td><td>{m.staff_id}</td><td>{m.eqpg||'—'}</td><td>{m.role}</td><td><span className={`status ${m.status==='Ativo'?'good':'bad'}`}>{m.status}</span></td>{isAdmin&&<td><button className="small-button" onClick={()=>setModal({type:'member',data:m})}>Editar</button></td>}</tr>)}</tbody></table></div>{isAdmin&&<p className="notice">Para adicionar uma nova pessoa, crie primeiro a conta em Supabase → Authentication → Users. Depois o perfil pode ser cadastrado por um fluxo administrativo seguro. Não há cadastro público neste site.</p>}</section>}
      {page==='Metas' && <section className="panel"><div className="panel-head"><div><h2>Metas da equipe</h2><p>Objetivos salvos no banco compartilhado.</p></div>{isAdmin&&<button className="primary" onClick={()=>setModal({type:'goal',data:{target_quantity:1}})}>＋ Nova meta</button>}</div>{goals.length===0?<Empty text="Nenhuma meta cadastrada."/>:<div className="cards-grid">{goals.map(g=><article className="goal-card" key={g.id}><span className="tag">META</span><h3>{g.title}</h3><p>{g.description||'Sem descrição'}</p><div className="goal-target">{g.target_quantity} <small>objetivo</small></div><small>{g.period_start||'Sem início'} — {g.period_end||'Sem fim'}</small>{isAdmin&&<div className="row-actions"><button className="small-button" onClick={()=>setModal({type:'goal',data:g})}>Editar</button><button className="small-button danger-button" onClick={()=>deleteGoal(g)}>Excluir</button></div>}</article>)}</div>}</section>}
      {page==='Cronograma' && <section className="panel"><div className="panel-head"><div><h2>Cronograma</h2><p>Programação e atividades agendadas.</p></div>{isAdmin&&<button className="primary" onClick={()=>setModal({type:'schedule',data:{schedule_date:today()}})}>＋ Adicionar item</button>}</div><SchedulesTable rows={schedules} onEdit={r=>setModal({type:'schedule',data:r})} onDelete={deleteSchedule} admin={isAdmin}/></section>}
      {page==='Escala do Dia' && <div className="two-col"><section className="panel"><div className="panel-head"><div><h2>Disponibilidade</h2><p>Informe quando pode participar.</p></div><button className="primary" onClick={()=>setModal({type:'availability',data:{available_date:today()}})}>＋ Informar</button></div><AvailabilityTable rows={availability.filter(a=>isAdmin||a.user_id===session.user.id)} onDelete={deleteAvailability} currentId={session.user.id}/></section><section className="panel"><div className="panel-head"><h2>Escalas agendadas</h2></div><SchedulesTable rows={schedules} admin={false}/></section></div>}
      {page==='Ranking de Eventos' && <section className="panel"><div className="panel-head"><h2>Ranking de participação</h2></div><p className="notice">O ranking automático por participação depende de registrar participantes e resultados em cada evento. Nesta versão, a tabela abaixo mostra a quantidade de eventos atribuídos a cada responsável.</p><div className="table-wrap"><table><thead><tr><th>POSIÇÃO</th><th>RESPONSÁVEL</th><th>EVENTOS</th></tr></thead><tbody>{members.map(m=>({...m,count:events.filter(e=>e.responsible_id===m.user_id).length})).sort((a,b)=>b.count-a.count).map((m,i)=><tr key={m.user_id}><td>#{i+1}</td><td>{m.name}</td><td>{m.count}</td></tr>)}</tbody></table></div></section>}
      {page==='Painel ADM' && isAdmin && <section className="panel"><div className="panel-head"><div><h2>Administração</h2><p>Controles disponíveis conforme as políticas do banco.</p></div></div><div className="stats"><Stat title="Perfis" value={members.length} hint="Contas cadastradas"/><Stat title="Ativos" value={members.filter(m=>m.status==='Ativo').length} hint="Com acesso permitido"/><Stat title="Histórico" value={logs.length} hint="Últimos registros"/></div><div className="notice"><b>Cadastro controlado</b><p>Não existe auto cadastro no site. Para criar acesso a uma nova pessoa, crie a conta em Supabase Authentication e então adicione o perfil com uma operação administrativa autorizada. Não conceda cargos de liderança a partir de dados enviados por um formulário público.</p></div><div className="panel-head"><h2>Histórico de atividades</h2></div><LogList rows={logs}/></section>}
      <footer>© {new Date().getFullYear()} LISBOA EVENTOS · Dados sincronizados com Supabase</footer>
    </main>
    {modal&&<Modal modal={modal} close={()=>setModal(null)} members={members} session={session} saveEvent={saveEvent} saveGoal={saveGoal} saveSchedule={saveSchedule} saveAvailability={saveAvailability} saveMember={saveMember} notify={notify}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function Stat({title,value,hint}){return <article className="stat"><span>{title}</span><strong>{value}</strong><small>{hint}</small></article>}
function Empty({text}){return <div className="empty">{text||'Nenhum registro encontrado.'}</div>}
function EventsTable({rows,onEdit,onDelete,admin}){if(!rows.length)return <Empty text="Nenhum evento encontrado."/>;return <div className="table-wrap"><table><thead><tr><th>EVENTO</th><th>DATA</th><th>HORÁRIO</th><th>CATEGORIA</th><th>STATUS</th>{admin&&<th>AÇÕES</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.name}</b><small className="subcell">{r.description||r.notes||''}</small></td><td>{r.event_date||'—'}</td><td>{r.start_time?.slice(0,5)||'—'}</td><td>{r.category||'Normal'}</td><td><span className="status good">{r.status}</span></td>{admin&&<td><div className="row-actions"><button className="small-button" onClick={()=>onEdit(r)}>Editar</button><button className="small-button danger-button" onClick={()=>onDelete(r)}>Excluir</button></div></td>}</tr>)}</tbody></table></div>}
function SchedulesTable({rows,onEdit,onDelete,admin}){if(!rows.length)return <Empty text="Nenhum item no cronograma."/>;return <div className="table-wrap"><table><thead><tr><th>ATIVIDADE</th><th>DATA</th><th>HORÁRIO</th><th>OBSERVAÇÕES</th>{admin&&<th>AÇÕES</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.title}</b></td><td>{r.schedule_date}</td><td>{r.start_time?.slice(0,5)||'—'}</td><td>{r.notes||'—'}</td>{admin&&<td><div className="row-actions"><button className="small-button" onClick={()=>onEdit(r)}>Editar</button><button className="small-button danger-button" onClick={()=>onDelete(r)}>Excluir</button></div></td>}</tr>)}</tbody></table></div>}
function AvailabilityTable({rows,onDelete,currentId}){if(!rows.length)return <Empty text="Nenhuma disponibilidade cadastrada."/>;return <div className="table-wrap"><table><thead><tr><th>DATA</th><th>INÍCIO</th><th>FIM</th><th>OBSERVAÇÕES</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.available_date}</td><td>{r.start_time?.slice(0,5)||'—'}</td><td>{r.end_time?.slice(0,5)||'—'}</td><td>{r.notes||'—'}</td><td>{r.user_id===currentId&&<button className="small-button danger-button" onClick={()=>onDelete(r)}>Excluir</button>}</td></tr>)}</tbody></table></div>}
function LogList({rows}){if(!rows.length)return <Empty text="Ainda não há atividades registradas."/>;return <div className="log-list">{rows.map(l=><div className="log-item" key={l.id}><span className="log-dot"/><div><b>{l.action}</b><p>{l.detail||'—'}</p><small>{l.actor_name||'Equipe'} · {new Date(l.created_at).toLocaleString('pt-BR')}</small></div></div>)}</div>}

function Modal({modal,close,members,session,saveEvent,saveGoal,saveSchedule,saveAvailability,saveMember,notify}){
 const [form,setForm]=useState(modal.data||{}); const [saving,setSaving]=useState(false); const update=(k,v)=>setForm(p=>({...p,[k]:v}));
 const field=(label,key,type='text',required=false)=><label>{label}<input type={type} value={form[key]??''} required={required} onChange={e=>update(key,e.target.value)}/></label>;
 const select=(label,key,opts)=><label>{label}<select value={form[key]??opts[0]} onChange={e=>update(key,e.target.value)}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></label>;
 const area=(label,key)=><label className="wide">{label}<textarea rows="3" value={form[key]??''} onChange={e=>update(key,e.target.value)}/></label>;
 const submit=async e=>{e.preventDefault();setSaving(true);try{if(modal.type==='event')await saveEvent(form);if(modal.type==='goal')await saveGoal(form);if(modal.type==='schedule')await saveSchedule(form);if(modal.type==='availability')await saveAvailability(form);if(modal.type==='member')await saveMember(form);}catch(err){notify(errText(err));}finally{setSaving(false)}};
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal-card" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">LISBOA EVENTOS</p><h2>{{event:form.id?'Editar evento':'Novo evento',goal:form.id?'Editar meta':'Nova meta',schedule:form.id?'Editar escala':'Nova escala',availability:'Informar disponibilidade',member:'Editar perfil'}[modal.type]}</h2></div><button type="button" className="icon-close" onClick={close}>×</button></div><div className="form-grid">
 {modal.type==='event'&&<>{field('Nome do evento','name','text',true)}{select('Categoria','category',['Normal','PvP','Especial','Treinamento'])}{field('Data','event_date','date',true)}{field('Início','start_time','time')}{field('Fim','end_time','time')}{select('Status','status',['Agendado','Em andamento','Concluído','Cancelado'])}{select('Responsável','responsible_id',['',...members.map(m=>m.user_id)])}{area('Descrição / observações','notes')}</>}
 {modal.type==='goal'&&<>{field('Título','title','text',true)}{field('Quantidade alvo','target_quantity','number',true)}{field('Início do período','period_start','date')}{field('Fim do período','period_end','date')}{select('Responsável','responsible_id',['',...members.map(m=>m.user_id)])}{area('Descrição','description')}</>}
 {modal.type==='schedule'&&<>{field('Atividade','title','text',true)}{field('Data','schedule_date','date',true)}{field('Início','start_time','time')}{field('Fim','end_time','time')}{select('Responsável','responsible_id',['',...members.map(m=>m.user_id)])}{area('Observações','notes')}</>}
 {modal.type==='availability'&&<>{field('Data','available_date','date',true)}{field('Início','start_time','time')}{field('Fim','end_time','time')}{area('Observações','notes')}</>}
 {modal.type==='member'&&<>{field('ID do membro','staff_id','text',true)}{field('Nome','name','text',true)}{field('Discord','discord')}{field('WhatsApp','whatsapp','tel')}{field('EQPG','eqpg')}{select('Cargo','role',ROLES)}{select('Status','status',STATUSES)}<p className="wide notice">O e-mail de login é gerenciado pelo Supabase Auth e não pode ser alterado por este formulário.</p></>}
 </div><div className="modal-footer"><button type="button" className="secondary" onClick={close}>Cancelar</button><button className="primary" disabled={saving}>{saving?'Salvando…':'Salvar no banco'}</button></div></form></div>
}
function SetupError(){return <main className="center-screen"><div className="panel setup-card"><h1>Configuração necessária</h1><p>O site ainda não recebeu as variáveis de ambiente do Supabase.</p><p>Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no ambiente de publicação e gere o build novamente.</p></div></main>}

createRoot(document.getElementById('root')).render(<App/>);
