import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import './styles.css';

const ROLES = ['Treinamento','Aprendiz','Analista','Especialista','Supervisor','Responsável','Responsável Geral'];
const STATUSES = ['Pendente','Ativo','Inativo','Suspenso','Afastado'];
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
  const [loginNotice, setLoginNotice] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupId, setSignupId] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDiscord, setSignupDiscord] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupMessage, setSignupMessage] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [page, setPage] = useState('Dashboard');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventCredits, setEventCredits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [scheduleResponses,setScheduleResponses] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedLogCategory, setSelectedLogCategory] = useState('events');
  const [agendaEntries, setAgendaEntries] = useState([]);
  const [dailySchedule, setDailySchedule] = useState([]);
  const [agendaSelectedTime,setAgendaSelectedTime]=useState('');
  const [agendaDraft,setAgendaDraft]=useState({event:'',host_id:'',text:''});
  const [agendaSaving,setAgendaSaving]=useState(false);
  const [logPage,setLogPage]=useState(0);
  const [agendaMonth, setAgendaMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(today());
  const [rankingPeriod, setRankingPeriod] = useState('weekly');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const canRegister = Boolean(profile && profile.status === 'Ativo');
  const canEditMemberData = ['Supervisor','Responsável','Responsável Geral'].includes(profile?.role);
  const canApproveMembers = ADMIN_ROLES.includes(profile?.role);
  const canAddEventCredits = ['Responsável','Responsável Geral'].includes(profile?.role);
  const canManageRoles = ['Responsável','Responsável Geral'].includes(profile?.role);
  const canReadLogs = ['Responsável','Responsável Geral'].includes(profile?.role);
  const canRemoveMembers = profile?.role === 'Responsável Geral';
  const canAccessAgenda = ADMIN_ROLES.includes(profile?.role);
  const canViewTeam = ['Supervisor','Responsável','Responsável Geral'].includes(profile?.role);
  const canViewAdmin = ['Responsável','Responsável Geral'].includes(profile?.role);
  const canManageDailySchedule = ['Responsável','Responsável Geral'].includes(profile?.role);

  const isAdmin = Boolean(profile && ADMIN_ROLES.includes(profile.role));
  const notify = (s) => { setToast(s); window.setTimeout(() => setToast(''), 3200); };

  const loadProfile = useCallback(async (user) => {
    if (!user) { setProfile(null); return; }
    const { data, error } = await supabase.from('staff_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data || data.status !== 'Ativo') {
      await supabase.auth.signOut();
      setProfile(null); setSession(null);
      const message = !data ? 'Sua conta ainda não possui um perfil autorizado. Fale com a administração.' : data.status === 'Pendente' ? 'Seu cadastro está aguardando aprovação da administração.' : 'Seu acesso está inativo. Fale com a administração.';
      throw new Error(message);
    }
    setProfile(data);
  }, []);

  const loadData = useCallback(async () => {
    if (!session || !profile) return;
    setBusy(true);
    try {
      const results = await Promise.all([
        supabase.from('staff_profiles').select('user_id,staff_id,name,discord,whatsapp,phone,eqpg,role,status,avatar_url,created_at').order('name'),
        supabase.from('events').select('*').order('event_date', { ascending: true }),
        supabase.from('member_event_credits').select('*').order('created_at', { ascending: false }),
        supabase.from('team_goals').select('*').order('created_at', { ascending: false }),
        supabase.from('schedules').select('*').order('schedule_date', { ascending: true }),
        supabase.from('schedule_responses').select('*'),
        supabase.from('availability').select('*').order('available_date', { ascending: true }),
        (canReadLogs ? supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({data:[],error:null})),
        supabase.from('agenda_entries').select('*').order('agenda_date').order('time_slot'),
        supabase.from('daily_schedule_items').select('*').eq('schedule_date',today()).order('event_time')
      ]);
      const [m,e,ec,g,s,sr,a,l,ag,ds] = results;
      for (const r of results) if (r.error) throw r.error;
      setMembers(m.data || []); setEvents(e.data || []); setEventCredits(ec.data || []); setGoals(g.data || []); setSchedules(s.data || []); setScheduleResponses(sr.data || []); setAvailability(a.data || []); setLogs(l.data || []); setAgendaEntries(ag.data || []); setDailySchedule(ds.data || []);
    } catch (e) { notify(`Não foi possível carregar os dados: ${errText(e)}`); }
    finally { setBusy(false); }
  }, [session, profile, canAccessAgenda, canReadLogs]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user);
    }).catch(e => { if (mounted) setLoginError(errText(e)); }).finally(() => { if (mounted) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update-password');
        setRecoveryError('');
        setRecoveryMessage('');
      }
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
  const requestSignup = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupMessage('');
    if (signupPassword.length < 8) { setSignupError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(), password: signupPassword,
        options: { data: { name: signupName.trim(), staff_id: signupId.trim(), discord: signupDiscord.trim(), phone: signupPhone.trim() } }
      });
      if (error) throw error;
      if (data.session) await supabase.auth.signOut();
      setSignupPassword('');
      setLoginEmail(signupEmail.trim());
      setAuthMode('login');
      setLoginNotice('Solicitação enviada! Seu cadastro ficará Pendente até a administração aprovar e liberar seu acesso.');
    } catch (e) { setSignupError(errText(e)); }
    finally { setLoading(false); }
  };

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryMessage('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: 'https://lisboaeventos.netlify.app/'
      });
      if (error) throw error;
      setRecoveryMessage('Se existir uma conta com esse e-mail, você receberá uma mensagem com o link para criar uma nova senha. Verifique também a caixa de spam.');
    } catch (e) {
      setRecoveryError(errText(e));
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    if (newPassword.length < 8) {
      setRecoveryError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setNewPassword('');
      setConfirmPassword('');
      setLoginPassword('');
      setAuthMode('login');
      setLoginNotice('Senha alterada com sucesso. Entre usando sua nova senha.');
    } catch (e) {
      setRecoveryError(errText(e));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); setPage('Dashboard'); setAuthMode('login'); };

  const uploadMedia = async (file, folder) => { if (!file) return null; if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Envie JPG, PNG ou WEBP.'); if(file.size>5*1024*1024) throw new Error('Imagem deve ter até 5 MB.'); const ext=file.name.split('.').pop().toLowerCase(); const path=`${session.user.id}/${folder}-${Date.now()}.${ext}`; const {error}=await supabase.storage.from('lisboa-media').upload(path,file,{upsert:true,contentType:file.type}); if(error) throw error; return path; };
  const saveEvent = async (form) => {
    if (!canRegister) throw new Error('Seu cargo não pode registrar eventos.');
    const chosen=[...new Set(form.staff_ids||[])];
    const senior=chosen.filter(id=>members.find(m=>m.user_id===id)?.role!=='Treinamento');
    if(senior.length>4) throw new Error('Máximo de 4 staffs com cargo de Aprendiz ou superior.');
    const event_image_path=form.event_image_file?await uploadMedia(form.event_image_file,'event'):null;
    const winner_image_path=form.winner_image_file?await uploadMedia(form.winner_image_file,'winner'):null;
    const payload={name:form.name.trim(),event_date:form.event_date,start_time:form.start_time||null,end_time:null,status:'Concluído',category:'Normal',notes:null,description:null,responsible_id:null,created_by:session.user.id,participants:[],staff_ids:chosen,winners:(form.winner_id||'').split(',').map(v=>v.trim()).filter(Boolean).map((staff_id,i)=>({staff_id,discord:(form.winner_discord||'').split(',').map(v=>v.trim())[i]||''})),event_image_path,winner_image_path};
    const {error}=await supabase.from('events').insert(payload); if(error) throw error;
    await writeLog('Evento registrado',buildWinnerAnnouncement(payload.name,payload.winners),'events');
    setModal(null); await loadData(); notify('Evento registrado com sucesso.');
  };
  const deleteEvent = async (row) => { if (!confirm(`Excluir o evento “${row.name}”?`)) return; const { error } = await supabase.from('events').delete().eq('id', row.id); if (error) return notify(errText(error)); await writeLog('Evento excluído', row.name, 'events', row.id); await loadData(); notify('Evento excluído.'); };

  const saveEventCredit = async (form) => {
    if (!canAddEventCredits) throw new Error('Somente Responsável ou Responsável Geral pode ajustar eventos.');
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error('Informe uma quantidade inteira entre 1 e 10.000.');
    const operation = form.operation || 'add';
    const { error } = await supabase.rpc('adjust_member_event_credits', { p_user_id: form.user_id, p_quantity: quantity, p_operation: operation });
    if (error) throw error;
    await writeLog(operation==='add'?'Eventos adicionados':'Eventos removidos', quantity+' evento(s) '+(operation==='add'?'adicionado(s) para ':'removido(s) de ')+form.member_name, 'member_event_credits', form.user_id);
    setModal(null); await loadData(); notify(operation==='add'?'Eventos adicionados com sucesso.':'Eventos removidos com sucesso.');
  };

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

  const saveAgendaEntry = async (date,time,values) => {
    if(!canAccessAgenda) throw new Error('Você não tem permissão para editar a Agenda.');
    const payload={agenda_date:date,time_slot:time,event:values.event||'',host_id:values.host_id||'',text:values.text||'',created_by:session.user.id,updated_at:new Date().toISOString()};
    const {data,error}=await supabase.from('agenda_entries').upsert(payload,{onConflict:'agenda_date,time_slot'}).select().single();
    if(error) throw error;
    setAgendaEntries(old=>[...old.filter(x=>!(x.agenda_date===date&&x.time_slot===time)),data]);
    await writeLog('Agenda publicada/atualizada',date+' '+time+' · '+(values.event||'Evento')+' · Anfitrião '+(values.host_id||'—'),'agenda_entries',data.id);
  };
  const saveDailySchedule=async(form)=>{if(!canManageDailySchedule)throw new Error('Sem permissão.');const payload={schedule_date:today(),category:form.category,event_name:form.event_name.trim(),event_time:form.event_time,created_by:session.user.id,updated_by:session.user.id,updated_at:new Date().toISOString()};const q=form.id?supabase.from('daily_schedule_items').update(payload).eq('id',form.id):supabase.from('daily_schedule_items').insert(payload);const {error}=await q;if(error)throw error;await writeLog(form.id?'Cronograma editado':'Cronograma publicado',payload.category+' · '+payload.event_name+' · '+payload.event_time,'daily_schedule_items',form.id);setModal(null);await loadData();notify('Cronograma salvo.');};
  const saveAvailability = async (form) => {
    const payload = { user_id: session.user.id, available_date: form.available_date, start_time: form.start_time || null, end_time: form.end_time || null, notes: form.notes || null };
    const { error } = await supabase.from('availability').insert(payload); if (error) throw error; await writeLog('Disponibilidade publicada', payload.available_date, 'availability'); setModal(null); await loadData(); notify('Disponibilidade publicada.');
  };
  const deleteAvailability = async (row) => { const { error } = await supabase.from('availability').delete().eq('id', row.id); if (error) return notify(errText(error)); await loadData(); notify('Disponibilidade removida.'); };

  const approveMember = async (member) => { const {error}=await supabase.rpc('approve_staff_member',{p_user_id:member.user_id}); if(error) return notify(errText(error)); await writeLog('Cadastro aprovado',member.name,'staff_profiles',member.user_id); await loadData(); notify('Membro aprovado e acesso liberado.'); };

  const removeMember = async (member) => { if(!canRemoveMembers) return notify('Somente o Responsável Geral pode remover membros.'); if(!confirm(`Remover definitivamente o membro ${member.name}? Esta ação não pode ser desfeita.`)) return; const {error}=await supabase.rpc('delete_staff_member',{p_user_id:member.user_id}); if(error) return notify(errText(error)); await loadData(); notify('Membro removido.'); };

  const saveMember = async (form) => {
    if(form.mode==='role'){const {error}=await supabase.rpc('update_staff_role',{p_user_id:form.user_id,p_role:form.role});if(error)throw error;}
    else {if(!canEditMemberData)throw new Error('Sem permissão para editar dados.');const {error}=await supabase.rpc('update_staff_details',{p_user_id:form.user_id,p_staff_id:form.staff_id.trim(),p_name:form.name.trim(),p_discord:form.discord||null,p_whatsapp:form.whatsapp||null,p_phone:form.phone||null,p_eqpg:form.eqpg||null,p_status:form.status});if(error)throw error;}
    await writeLog('Perfil de membro atualizado',form.name||form.role,'staff_profiles',form.user_id);setModal(null);await loadData();notify('Perfil atualizado.');
  };
  const saveAvatar = async (file) => {if(!file)return;const path=await uploadMedia(file,'avatar');const {error}=await supabase.from('staff_profiles').update({avatar_url:path}).eq('user_id',session.user.id);if(error)throw error;await loadProfile(session.user);await writeLog('Foto de perfil atualizada','Foto de perfil');notify('Foto atualizada.');};
  const markAbsence = async (scheduleId,checked,reason='') => {const {error}=await supabase.from('schedule_responses').upsert({schedule_id:scheduleId,user_id:session.user.id,is_absent:checked,absence_reason:checked?reason:null,updated_at:new Date().toISOString()},{onConflict:'schedule_id,user_id'});if(error)notify(errText(error));else{await writeLog(checked?'Ausência marcada':'Ausência removida','Escala do dia','schedule_responses',scheduleId);await loadData();}};
  const roleOrder={'Responsável Geral':0,'Responsável':1,'Supervisor':2,'Especialista':3,'Analista':4,'Aprendiz':5,'Treinamento':6};
  const filteredMembers = useMemo(() => members.filter(m => `${m.name} ${m.staff_id} ${m.role} ${m.eqpg || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(roleOrder[a.role]??99)-(roleOrder[b.role]??99)||a.name.localeCompare(b.name)), [members, search]);
  const filteredEvents = useMemo(() => events.filter(e => `${e.name} ${e.category || ''} ${e.status || ''}`.toLowerCase().includes(search.toLowerCase())), [events, search]);
  const weekStart=new Date();weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));weekStart.setHours(0,0,0,0);const weekEnd=new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+7);
  const weeklyEvents=events.filter(e=>e.status==='Concluído'&&e.event_date&&new Date(e.event_date+'T00:00:00')>=weekStart&&new Date(e.event_date+'T00:00:00')<weekEnd);
  const eventCountForMember=(id,start=null,end=null)=>{const startDate=start?(start instanceof Date?start.toLocaleDateString('en-CA'):start):null;const endDate=end?(end instanceof Date?end.toLocaleDateString('en-CA'):end):null;return events.filter(e=>e.status==='Concluído'&&((e.staff_ids||[]).includes(id)||e.responsible_id===id)&&(!startDate||e.event_date>=startDate)&&(!endDate||e.event_date<endDate)).length + eventCredits.filter(x=>x.user_id===id&&(!start||x.created_at>=start.toISOString())&&(!end||x.created_at<end.toISOString())).reduce((sum,x)=>sum+x.quantity,0);};
  const memberEventCount=id=>eventCountForMember(id);
  const currentAvatar=profile?.avatar_url?supabase.storage.from('lisboa-media').getPublicUrl(profile.avatar_url).data.publicUrl:null;

  if (!isSupabaseConfigured) return <SetupError />;
  if (authMode === 'update-password') return <main className="login-wrap"><form className="login-card" onSubmit={updatePassword}><div className="crown">♛</div><p className="eyebrow">RECUPERAÇÃO DE ACESSO</p><h1>CRIAR NOVA <span>SENHA</span></h1><p className="muted">Defina uma nova senha para sua conta do LISBOA EVENTOS.</p><label>Nova senha<input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={8} required /></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={8} required /></label>{recoveryError && <p className="error">{recoveryError}</p>}<button className="primary full" disabled={loading}>{loading ? 'Salvando…' : 'Salvar nova senha'}</button></form></main>;
  if (authMode === 'signup') return <main className="login-wrap"><form className="login-card" onSubmit={requestSignup}><div className="crown">♛</div><p className="eyebrow">SOLICITAÇÃO DE ACESSO</p><h1>CADASTRAR-<span>SE</span></h1><p className="muted">Preencha seus dados. A administração analisará e aprovará seu acesso antes de liberar a entrada no sistema.</p><label>Nome<input type="text" autoComplete="name" value={signupName} onChange={e=>setSignupName(e.target.value)} required /></label><label>ID<input type="text" value={signupId} onChange={e=>setSignupId(e.target.value)} required /></label><label>Senha<input type="password" autoComplete="new-password" minLength={8} value={signupPassword} onChange={e=>setSignupPassword(e.target.value)} required /></label><label>Discord<input type="text" value={signupDiscord} onChange={e=>setSignupDiscord(e.target.value)} placeholder="Usuário ou ID do Discord" /></label><label>E-mail<input type="email" autoComplete="email" value={signupEmail} onChange={e=>setSignupEmail(e.target.value)} required /></label><label>Telefone<input type="tel" autoComplete="tel" value={signupPhone} onChange={e=>setSignupPhone(e.target.value)} required /></label>{signupError && <p className="error">{signupError}</p>}<button className="primary full" disabled={loading}>{loading ? 'Enviando…' : 'Enviar solicitação'}</button><button type="button" className="link-button full" onClick={()=>{setAuthMode('login');setSignupError('')}}>Voltar ao login</button><p className="tiny">O cadastro não libera acesso automaticamente. Seu cargo inicial será Treinamento e seu status ficará Pendente.</p></form></main>;
  if (authMode === 'forgot-password') return <main className="login-wrap"><form className="login-card" onSubmit={requestPasswordReset}><div className="crown">♛</div><p className="eyebrow">RECUPERAÇÃO DE ACESSO</p><h1>ESQUECI A <span>SENHA</span></h1><p className="muted">Informe o e-mail cadastrado na sua conta. Enviaremos um link para criar uma nova senha.</p><label>E-mail<input type="email" autoComplete="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required /></label>{recoveryError && <p className="error">{recoveryError}</p>}{recoveryMessage && <p className="notice">{recoveryMessage}</p>}<button className="primary full" disabled={loading}>{loading ? 'Enviando…' : 'Enviar link de recuperação'}</button><button type="button" className="link-button full" onClick={()=>{setAuthMode('login');setRecoveryError('');setRecoveryMessage('')}}>Voltar ao login</button></form></main>;
  if (loading && !session) return <div className="center-screen"><div className="spinner"/><p>Conectando ao LISBOA EVENTOS…</p></div>;
  if (!session || !profile) return <main className="login-wrap"><form className="login-card" onSubmit={signIn}><div className="crown">♛</div><p className="eyebrow">ACESSO RESTRITO</p><h1>LISBOA <span>EVENTOS</span></h1><p className="muted">Entre com o e-mail e a senha da sua conta autorizada.</p><label>E-mail<input type="email" autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required /></label><label>Senha<input type="password" autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required /></label>{loginError && <p className="error">{loginError}</p>}{loginNotice && <p className="notice">{loginNotice}</p>}<button className="primary full" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button><button type="button" className="link-button full" onClick={()=>{setAuthMode('forgot-password');setLoginError('');setRecoveryError('');setRecoveryMessage('')}}>Esqueci minha senha</button><button type="button" className="link-button full" onClick={()=>{setAuthMode('signup');setSignupError('');setSignupMessage('')}}>Cadastrar-se</button><p className="tiny">O acesso só é liberado após aprovação da administração.</p></form></main>;

  const nav = ['Dashboard', 'Registrar Eventos', ...(canManageDailySchedule?['Cronograma']:[]),'Ranking de Eventos','Metas','Escala do Dia',...(canViewTeam?['Equipe']:[]),'Perfil','Agenda', ...(canViewAdmin ? ['Painel ADM'] : [])];
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span>♛</span><div><b>LISBOA</b><small>EVENTOS</small></div></div><div className="side-label">MENU PRINCIPAL</div><nav>{nav.map(n=><button key={n} className={page===n?'nav-active':''} onClick={()=>{setPage(n);setSearch('')}}><span>{({'Dashboard':'◈','Registrar Eventos':'◆','Cronograma':'▦','Ranking de Eventos':'★','Metas':'◎','Escala do Dia':'◷','Membros':'♙','Equipe':'♙','Perfil':'◉','Agenda':'▦','Painel ADM':'♜'})[n]}</span>{n}</button>)}</nav><div className="sidebar-bottom"><div className="avatar">{currentAvatar?<img src={currentAvatar} alt="Foto"/>:profile.name?.slice(0,1)?.toUpperCase()}</div><div className="user-meta"><b>{profile.name}</b><small>{profile.role}</small></div><button className="logout" title="Sair" onClick={signOut}>↪</button></div></aside>
    <main className="main-area"><header className="topbar"><div><p className="eyebrow">LISBOA EVENTOS / PAINEL</p><h1>{page}</h1></div><div className="top-actions"><span className="online-dot">● Conectado</span><button className="secondary" onClick={loadData}>{busy?'Atualizando…':'↻ Atualizar'}</button></div></header>
      {page==='Dashboard' && <><section className="panel"><div className="panel-head"><h2>Eventos de hoje</h2></div><div className="today-events">{events.filter(e=>e.event_date===today()).sort((a,b)=>(b.start_time||'').localeCompare(a.start_time||'')).map(e=><div className="today-event" key={e.id}><b>{e.name}</b><span>{e.event_date}</span><strong>{e.start_time?.slice(0,5)||'—'}</strong></div>)}{!events.some(e=>e.event_date===today())&&<Empty text="Nenhum evento registrado hoje."/>}</div></section><section className="panel"><div className="panel-head"><h2>Pódio do dia anterior</h2></div><Podium rows={rankMembersForDay(members,events,eventCredits,new Date(Date.now()-86400000))}/></section></>}
      {page==='Registrar Eventos' && canRegister && <section className="panel"><div className="panel-head"><div><h2>Registrar eventos</h2><p>Informe os dados do evento, equipe e vencedor.</p></div><button className="primary" onClick={()=>setModal({type:'event',data:{event_date:today(),staff_ids:[]}})}>＋ Registrar evento</button></div><input className="search" placeholder="Buscar evento…" value={search} onChange={e=>setSearch(e.target.value)}/><EventsTable rows={filteredEvents} onEdit={()=>{}} onDelete={deleteEvent} admin={profile.role==='Responsável Geral'}/></section>}
      {page==='Equipe' && canViewTeam && <section className="panel"><div className="panel-head"><div><h2>Equipe</h2></div></div><input className="search" placeholder="Buscar por nome, ID ou cargo…" value={search} onChange={e=>setSearch(e.target.value)}/><div className="table-wrap"><table><thead><tr><th>MEMBRO</th><th>ID</th><th>CARGO</th><th>EVENTOS</th><th>STATUS</th>{canViewTeam&&<th>AÇÕES</th>}</tr></thead><tbody>{filteredMembers.map(m=><tr key={m.user_id}><td><div className="member-cell">{m.avatar_url?<img className="member-avatar" src={supabase.storage.from('lisboa-media').getPublicUrl(m.avatar_url).data.publicUrl} alt={'Foto de '+m.name}/>:<span className="member-avatar placeholder">{m.name?.slice(0,1)?.toUpperCase()}</span>}<b>{m.name}</b></div></td><td>{m.staff_id}</td><td>{m.role}</td><td>{memberEventCount(m.user_id)}</td><td><span className={`status ${m.status==='Ativo'?'good':'bad'}`}>{m.status}</span></td>{canViewTeam&&<td>{canApproveMembers&&m.status==='Pendente'&&<button className="small-button" onClick={()=>approveMember(m)}>Aprovar</button>}{canEditMemberData&&<button className="small-button" onClick={()=>setModal({type:'member',data:{...m,mode:'details'}})}>Dados</button>}{canManageRoles&&<button className="small-button" onClick={()=>setModal({type:'member',data:{...m,mode:'role'}})}>Cargo</button>}{canAddEventCredits&&<button className="small-button" onClick={()=>setModal({type:'event_credit',data:{user_id:m.user_id,member_name:m.name,quantity:1,operation:'add'}})}>Eventos</button>}{canRemoveMembers&&m.user_id!==session.user.id&&<button className="small-button danger-button" onClick={()=>removeMember(m)}>Remover</button>}</td>}</tr>)}</tbody></table></div>{isAdmin&&<p className="notice">Novos cadastros aparecem com status Pendente e cargo Treinamento. Confira os dados e altere o status para Ativo somente após autorizar o acesso; ajuste o cargo conforme a permissão concedida.</p>}</section>}
      {page==='Metas' && <section className="panel"><div className="panel-head"><div><h2>Metas da equipe</h2><p>Objetivos salvos no banco compartilhado.</p></div>{isAdmin&&<button className="primary" onClick={()=>setModal({type:'goal',data:{target_quantity:1}})}>＋ Nova meta</button>}</div>{goals.length===0?<Empty text="Nenhuma meta cadastrada."/>:<div className="goal-list">{goals.map(g=><article className="goal-card" key={g.id}><span className="tag">META</span><h3>{g.title}</h3><div className="goal-description" dangerouslySetInnerHTML={{__html:safeGoalHtml(g.description||'')}}/>{g.responsible_id&&<p><b>Membro:</b> {members.find(m=>m.user_id===g.responsible_id)?.name||'Membro'}</p>}<div className="goal-target">{g.target_quantity} <small>objetivo</small></div>{g.responsible_id&&<p><b>Progresso:</b> {eventCountForMember(g.responsible_id,g.period_start?new Date(g.period_start+'T00:00:00'):null,g.period_end?new Date(new Date(g.period_end+'T00:00:00').getTime()+86400000):null)} / {g.target_quantity} eventos</p>}<small>{g.period_start||'Sem início'}{g.period_end?' — '+g.period_end:''}</small>{isAdmin&&<div className="row-actions"><button className="small-button" onClick={()=>setModal({type:'goal',data:g})}>Editar</button><button className="small-button danger-button" onClick={()=>deleteGoal(g)}>Excluir</button></div>}</article>)}</div>}</section>}
      {page==='Cronograma' && canManageDailySchedule && <section className="panel daily-schedule-panel"><div className="panel-head"><h2>📅 CRONOGRAMA DO DIA</h2><button className="primary" onClick={()=>setModal({type:'daily_schedule',data:{category:'EVENTOS',event_time:'12:00'}})}>＋ Adicionar evento</button></div><div className="daily-schedule-grid">{['EVENTOS','PVP','ENTRETENIMENTO'].map((cat,i)=><section className={'daily-category cat-'+i} key={cat}><h3>{cat==='EVENTOS'?'🎉':cat==='PVP'?'⚔️':'🎭'} {cat}</h3>{dailySchedule.filter(x=>x.category===cat).sort((a,b)=>a.event_time.localeCompare(b.event_time)).map(item=><div className="daily-schedule-item" key={item.id}><span>{item.event_time.slice(0,5)}</span><b>{item.event_name}</b><div className="row-actions"><button className="small-button" onClick={()=>setModal({type:'daily_schedule',data:item})}>Editar</button><button className="small-button danger-button" onClick={async()=>{if(!confirm('Remover este item do cronograma?'))return;const {error}=await supabase.from('daily_schedule_items').delete().eq('id',item.id);if(error)notify(errText(error));else{await writeLog('Cronograma removido',item.category+' · '+item.event_name,'daily_schedule_items',item.id);await loadData();}}}>Remover</button></div></div>)}{!dailySchedule.some(x=>x.category===cat)&&<Empty text="Nenhum evento nesta categoria."/>}</section>)}</div></section>}
      {page==='Escala do Dia' && <><div className="two-col"><section className="panel"><div className="panel-head"><div><h2>Disponibilidade</h2><p>Informe quando pode participar.</p></div><button className="primary" onClick={()=>setModal({type:'availability',data:{available_date:today()}})}>＋ Informar</button></div><AvailabilityTable rows={availability.filter(a=>isAdmin||a.user_id===session.user.id)} onDelete={deleteAvailability} currentId={session.user.id}/></section><section className="panel"><div className="panel-head"><h2>Escalas agendadas</h2></div><SchedulesTable rows={schedules} admin={false} responses={scheduleResponses} currentId={session.user.id} onAbsence={markAbsence} members={members}/></section></div></>}
      {page==='Ranking de Eventos' && <section className="panel"><div className="panel-head"><div><h2>Ranking de Eventos</h2></div></div><div className="rank-tabs"><button className={rankingPeriod==='weekly'?'rank-tab active':'rank-tab'} onClick={()=>setRankingPeriod('weekly')}>Semanal</button><button className={rankingPeriod==='monthly'?'rank-tab active':'rank-tab'} onClick={()=>setRankingPeriod('monthly')}>Mensal</button></div>{(()=>{const start=rankingPeriod==='weekly'?weekStart:new Date(new Date().getFullYear(),new Date().getMonth(),1);const end=rankingPeriod==='weekly'?weekEnd:new Date(new Date().getFullYear(),new Date().getMonth()+1,1);const cutoff='2026-11-18';const startStr=start.toLocaleDateString('en-CA');const endStr=end.toLocaleDateString('en-CA');const count=id=>events.filter(e=>e.status==='Concluído'&&e.event_date>=cutoff&&e.event_date>=startStr&&e.event_date<endStr&&((e.staff_ids||[]).includes(id)||e.responsible_id===id)).length+eventCredits.filter(x=>x.user_id===id&&x.created_at>=cutoff+'T00:00:00'&&x.created_at>=start.toISOString()&&x.created_at<end.toISOString()).reduce((sum,x)=>sum+x.quantity,0);const ranked=members.map(m=>({...m,count:count(m.user_id)})).filter(m=>m.count>0).sort((a,b)=>b.count-a.count);return <><Podium rows={ranked}/></>})()}</section>}
      {page==='Agenda' && <section className="panel agenda-panel"><div className="panel-head"><h2>Agenda</h2></div><div className="agenda-calendar-head"><button className="secondary" onClick={()=>setAgendaMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}>‹</button><strong>{agendaMonth.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</strong><button className="secondary" onClick={()=>setAgendaMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}>›</button></div><div className="agenda-calendar"><div className="agenda-weekdays">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=><b key={d}>{d}</b>)}</div>{Array.from({length:42},(_,i)=>{const first=new Date(agendaMonth.getFullYear(),agendaMonth.getMonth(),1);const day=new Date(first);day.setDate(first.getDate()-first.getDay()+i);const iso=day.toLocaleDateString('en-CA');return <button key={iso} className={'agenda-day'+(day.getMonth()===agendaMonth.getMonth()?'':' muted')+(selectedAgendaDate===iso?' selected':'')} onClick={()=>{setSelectedAgendaDate(iso);setAgendaSelectedTime('');}}>{day.getDate()}{agendaEntries.some(x=>x.agenda_date===iso&&(x.event||x.text))&&<i/>}</button>})}</div><div className="agenda-date-title">{new Date(selectedAgendaDate+'T00:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div><label className="agenda-time-picker">Horário<select value={agendaSelectedTime} onChange={e=>{const time=e.target.value;setAgendaSelectedTime(time);const found=agendaEntries.find(x=>x.agenda_date===selectedAgendaDate&&x.time_slot?.slice(0,5)===time);setAgendaDraft({event:found?.event||'',host_id:found?.host_id||'',text:found?.text||''});}}><option value="">Selecione um horário</option>{Array.from({length:48},(_,i)=>{const t=String(Math.floor(i/2)).padStart(2,'0')+':'+(i%2?'30':'00');return <option key={t} value={t}>{t}</option>})}</select></label>{agendaSelectedTime&&<div className="agenda-editor"><label>Evento<input value={agendaDraft.event} onChange={e=>setAgendaDraft(p=>({...p,event:e.target.value}))} disabled={!canAccessAgenda}/></label><label>Anfitrião<input value={agendaDraft.host_id} onChange={e=>setAgendaDraft(p=>({...p,host_id:e.target.value}))} placeholder="ID do jogador" disabled={!canAccessAgenda}/></label><label>Texto<textarea rows="4" value={agendaDraft.text} onChange={e=>setAgendaDraft(p=>({...p,text:e.target.value}))} disabled={!canAccessAgenda}/></label>{canAccessAgenda&&<button className="primary" onClick={async()=>{try{await saveAgendaEntry(selectedAgendaDate,agendaSelectedTime+':00',agendaDraft);notify('Agenda salva.');}catch(e){notify(errText(e));}}}>Salvar</button>}</div>}{agendaEntries.filter(x=>x.agenda_date===selectedAgendaDate&&(x.event||x.text||x.host_id)).sort((x,y)=>x.time_slot.localeCompare(y.time_slot)).map(x=><div className="agenda-public-entry" key={x.id}><b>{x.time_slot.slice(0,5)} · {x.event||'Evento'}</b><span>Anfitrião: {x.host_id||'—'}</span><p>{x.text}</p></div>)}</section>}
      {page==='Painel ADM' && canViewAdmin && <section className="panel"><div className="panel-head"><div><h2>Administração</h2><p>Controles disponíveis conforme seu cargo.</p></div></div><div className="stats"><Stat title="Perfis" value={members.length} hint="Contas cadastradas"/><Stat title="Ativos" value={members.filter(m=>m.status==='Ativo').length} hint="Com acesso permitido"/>{canReadLogs&&<Stat title="Histórico" value={logs.length} hint="Registros"/>}</div>{profile.role==='Responsável Geral'&&<><div className="panel-head"><h2>Eventos cadastrados</h2></div><EventsTable rows={events} onEdit={()=>{}} onDelete={deleteEvent} admin={true}/></>}{canReadLogs&&<div className="admin-logs"><div className="panel-head"><div><h2>Logs e auditoria</h2><p>Selecione uma categoria para consultar o histórico.</p></div></div><label className="log-category-picker">Categoria das logs<select value={selectedLogCategory} onChange={e=>setSelectedLogCategory(e.target.value)}><option value="events">Registro de eventos</option><option value="members">Membros e quantidades de eventos</option><option value="goals">Metas</option><option value="schedules">Cronograma</option><option value="availability">Escala e disponibilidade</option></select></label>{selectedLogCategory==='events'&&<SectionLogs rows={logs} types={['events']} title="Registro de eventos"/>}{selectedLogCategory==='members'&&<SectionLogs rows={logs} types={['staff_profiles','member_event_credits']} title="Membros e quantidades de eventos"/>}{selectedLogCategory==='goals'&&<SectionLogs rows={logs} types={['team_goals']} title="Metas"/>}{selectedLogCategory==='schedules'&&<SectionLogs rows={logs} types={['schedules']} title="Cronograma"/>}{selectedLogCategory==='availability'&&<SectionLogs rows={logs} types={['availability','schedule_responses']} title="Escala e disponibilidade"/>}</div>}</section>}
      {page==='Perfil'&&<section className="panel"><div className="panel-head"><div><h2>Meu perfil</h2></div></div><div className="profile-row">{currentAvatar?<img className="profile-photo" src={currentAvatar} alt="Foto"/>:<div className="profile-photo placeholder">{profile.name?.slice(0,1)}</div>}<label className="primary upload-label">Alterar foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{try{await saveAvatar(e.target.files?.[0]);}catch(err){notify(errText(err));}}}/></label></div><div className="stats"><Stat title="Eventos nesta semana" value={eventCountForMember(profile.user_id,weekStart,weekEnd)} hint="Semana atual"/><Stat title="Eventos neste mês" value={eventCountForMember(profile.user_id,new Date(new Date().getFullYear(),new Date().getMonth(),1),new Date(new Date().getFullYear(),new Date().getMonth()+1,1))} hint="Mês atual"/><Stat title="Eventos em geral" value={memberEventCount(profile.user_id)} hint="Histórico completo"/></div><div className="profile-details"><p><b>Nome:</b> {profile.name}</p><p><b>ID:</b> {profile.staff_id}</p><p><b>Discord:</b> {profile.discord||'—'}</p><p><b>Telefone:</b> {profile.phone||'—'}</p><p><b>Cargo:</b> {profile.role}</p><p><b>Status:</b> {profile.status}</p></div></section>}<footer>© {new Date().getFullYear()} LISBOA EVENTOS · LISBOA EVENTOS</footer>
    </main>
    {modal&&<Modal modal={modal} close={()=>setModal(null)} members={members} session={session} currentRole={profile.role} saveEvent={saveEvent} saveEventCredit={saveEventCredit} saveGoal={saveGoal} saveSchedule={saveSchedule} saveAvailability={saveAvailability} saveDailySchedule={saveDailySchedule} saveMember={saveMember} notify={notify}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function Podium({rows}){if(!rows?.length)return <Empty text="Ainda não há eventos contabilizados para esse período."/>;const medals=['🥇','🥈','🥉'];return <><div className="podium-grid">{rows.slice(0,3).map((m,i)=><div className={'podium-card place-'+(i+1)} key={m.user_id}><span>{medals[i]}</span><b>{m.name}</b><strong>{m.count} eventos</strong></div>)}</div><div className="ranking-list">{rows.slice(3,10).map((m,i)=><div key={m.user_id}><b>#{i+4} {m.name}</b><span>{m.count} eventos</span></div>)}</div></>}
function rankMembersForDay(members,events,credits,date){const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);const key=start.toLocaleDateString('en-CA');return members.map(m=>({...m,count:events.filter(e=>e.status==='Concluído'&&e.event_date===key&&((e.staff_ids||[]).includes(m.user_id)||e.responsible_id===m.user_id)).length+credits.filter(x=>x.user_id===m.user_id&&x.created_at>=start.toISOString()&&x.created_at<end.toISOString()).reduce((n,x)=>n+x.quantity,0)})).filter(m=>m.count>0).sort((a,b)=>b.count-a.count).slice(0,10)}
function safeGoalHtml(value){const template=document.createElement('template');template.innerHTML=String(value||'');template.content.querySelectorAll('script,style,iframe,object,embed').forEach(n=>n.remove());template.content.querySelectorAll('*').forEach(el=>{[...el.attributes].forEach(a=>{if(a.name!=='style')el.removeAttribute(a.name);else{const safe=a.value.split(';').filter(x=>/^\\s*(color|font-size)\\s*:\\s*(#[0-9a-f]{3,8}|[a-z]+|[0-9.]+(px|em|rem|%))\\s*$/i.test(x)).join(';');if(safe)el.setAttribute('style',safe);else el.removeAttribute('style')}});if(!['B','STRONG','I','EM','U','SPAN','DIV','P','BR'].includes(el.tagName)){el.replaceWith(...el.childNodes)}});return template.innerHTML}
function AgendaSlot({date,time,entry,onSave,notify}){const [event,setEvent]=useState(entry.event||'');const [host,setHost]=useState(entry.host_id||'');const [note,setNote]=useState(entry.text||'');const [saving,setSaving]=useState(false);useEffect(()=>{setEvent(entry.event||'');setHost(entry.host_id||'');setNote(entry.text||'')},[entry.event,entry.host_id,entry.text,date,time]);const persist=async()=>{setSaving(true);try{await onSave(date,time+':00',{event,host_id:host,text:note});notify('Horário salvo.')}catch(e){notify(errText(e))}finally{setSaving(false)}};return <div className="agenda-slot"><strong>{time}</strong><input aria-label={'Evento às '+time} placeholder="Evento" value={event} onChange={e=>setEvent(e.target.value)}/><input aria-label={'Anfitrião às '+time} placeholder="Anfitrião (ID)" value={host} onChange={e=>setHost(e.target.value)}/><input aria-label={'Texto às '+time} placeholder="Texto" value={note} onChange={e=>setNote(e.target.value)}/><button className="small-button" disabled={saving} onClick={persist}>{saving?'Salvando…':'Salvar'}</button></div>}
function Stat({title,value,hint}){return <article className="stat"><span>{title}</span><strong>{value}</strong><small>{hint}</small></article>}
function Empty({text}){return <div className="empty">{text||'Nenhum registro encontrado.'}</div>}
function buildWinnerAnnouncement(eventName,winners){const mentions=(winners||[]).map(w=>String(w.discord||'').trim()).filter(Boolean).map(id=>'<@'+id+'>').join(' ');return '# '+eventName+'\n\n# 🥇  '+(mentions||'Vencedor não informado')+'\n\n** A Equipe de Eventos agradece a todos que participaram e fizeram parte desse grande evento! A presença e o empenho de cada um foram fundamentais para tornar esse momento especial. **\n\n** Esperamos contar com vocês nos próximos eventos. Até a próxima! 🏆❤️ **\n\n*@here <@&1558172068435066880> <@&1066355812857020487>'}
function EventsTable({rows,onEdit,onDelete,admin}){if(!rows.length)return <Empty text="Nenhum evento encontrado."/>;return <div className="table-wrap"><table><thead><tr><th>EVENTO</th><th>DATA</th><th>HORÁRIO</th><th>VENCEDORES</th><th>MENSAGEM DE FINALIZAÇÃO</th><th>FOTO DO VENCEDOR</th><th>PRINT DO EVENTO</th><th>STATUS</th>{admin&&<th>AÇÕES</th>}</tr></thead><tbody>{rows.map(r=>{const eventPrint=r.event_image_path?supabase.storage.from('lisboa-media').getPublicUrl(r.event_image_path).data.publicUrl:null;const winnerPrint=r.winner_image_path?supabase.storage.from('lisboa-media').getPublicUrl(r.winner_image_path).data.publicUrl:null;const winners=(r.winners||[]).filter(w=>w.discord);const announcement=buildWinnerAnnouncement(r.name,winners);return <tr key={r.id}><td><b>{r.name}</b></td><td>{r.event_date||'—'}</td><td>{r.start_time?.slice(0,5)||'—'}</td><td>{(r.winners||[]).map(w=>w.staff_id).filter(Boolean).join(', ')||'—'}</td><td><div className="winner-announcement"><pre className="winner-announcement-text">{announcement}</pre><button className="small-button" onClick={async()=>{try{await navigator.clipboard.writeText(announcement);alert('Mensagem de finalização copiada.');}catch(e){alert('Não foi possível copiar automaticamente.');}}}>Copiar mensagem</button></div></td><td>{winnerPrint?<div className="winner-image-cell"><a href={winnerPrint} target="_blank" rel="noreferrer"><img className="winner-preview" src={winnerPrint} alt={'Foto do vencedor de '+r.name}/></a><button className="small-button" onClick={async()=>{try{const response=await fetch(winnerPrint);const blob=await response.blob();if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('Não suportado');const bitmap=await createImageBitmap(blob);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('Falha ao preparar imagem');await navigator.clipboard.write([new ClipboardItem({'image/png':png})]);alert('Foto copiada.');}catch(e){window.open(winnerPrint,'_blank','noopener,noreferrer');alert('Imagem aberta. Use copiar imagem ou salvar.');}}}>Copiar foto</button></div>:'—'}</td><td>{eventPrint?<a href={eventPrint} target="_blank" rel="noreferrer">Abrir print</a>:'—'}</td><td><span className="status good">{r.status}</span></td>{admin&&<td><button className="small-button danger-button" onClick={()=>onDelete(r)}>Remover</button></td>}</tr>})}</tbody></table></div>}
function SchedulesTable({rows,onEdit,onDelete,admin,responses=[],currentId,onAbsence,members=[],showAbsentees=false}){if(!rows.length)return <Empty text="Nenhuma escala cadastrada."/>;return <div className="table-wrap"><table><thead><tr><th>ATIVIDADE</th><th>DATA</th><th>HORÁRIO</th>{onAbsence&&<th>PRESENÇA</th>}{showAbsentees&&<th>AUSÊNCIAS</th>}{admin&&<th>AÇÕES</th>}</tr></thead><tbody>{rows.map(r=>{const response=responses.find(x=>x.schedule_id===r.id&&x.user_id===currentId);const absent=!!response?.is_absent;const absentNames=responses.filter(x=>x.schedule_id===r.id&&x.is_absent).map(x=>members.find(m=>m.user_id===x.user_id)?.name).filter(Boolean);return <tr key={r.id}><td><b>{r.title}</b></td><td>{r.schedule_date}</td><td>{r.start_time?.slice(0,5)||'—'}</td>{onAbsence&&<td><div className="attendance-control"><select value={absent?'absent':'present'} onChange={e=>{const value=e.target.value==='absent';const reason=value?(response?.absence_reason||''):'';if(value&&!reason){const typed=window.prompt('Informe o motivo da ausência:');if(typed===null)return;onAbsence(r.id,true,typed)}else onAbsence(r.id,value,reason)}}><option value="present">Presente</option><option value="absent">Ausente</option></select>{absent&&<textarea rows="2" placeholder="Motivo da ausência" defaultValue={response?.absence_reason||''} onBlur={e=>onAbsence(r.id,true,e.target.value)}/>}</div></td>}{showAbsentees&&<td>{absentNames.join(', ')||'—'}</td>}{admin&&<td><div className="row-actions"><button className="small-button" onClick={()=>onEdit(r)}>Editar</button><button className="small-button danger-button" onClick={()=>onDelete(r)}>Excluir</button></div></td>}</tr>})}</tbody></table></div>}
function AvailabilityTable({rows,onDelete,currentId}){if(!rows.length)return <Empty text="Nenhuma disponibilidade cadastrada."/>;return <div className="table-wrap"><table><thead><tr><th>DATA</th><th>INÍCIO</th><th>FIM</th><th>OBSERVAÇÕES</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.available_date}</td><td>{r.start_time?.slice(0,5)||'—'}</td><td>{r.end_time?.slice(0,5)||'—'}</td><td>{r.notes||'—'}</td><td>{r.user_id===currentId&&<button className="small-button danger-button" onClick={()=>onDelete(r)}>Excluir</button>}</td></tr>)}</tbody></table></div>}
function LogList({rows}){if(!rows.length)return <Empty text="Ainda não há atividades registradas."/>;return <div className="log-list">{rows.map(l=><div className="log-item" key={l.id}><span className="log-dot"/><div><b>{l.action}</b><p>{l.detail||'—'}</p><small>{l.actor_name||'Equipe'} · {new Date(l.created_at).toLocaleString('pt-BR')}</small></div></div>)}</div>}
function SectionLogs({rows,types,title}){const filtered=rows.filter(l=>types.includes(l.entity_type));return <section className="section-logs"><div className="panel-head"><h3>{title}</h3></div><LogList rows={filtered}/></section>}

function Modal({modal,close,members,session,saveEvent,saveEventCredit,saveGoal,saveSchedule,saveAvailability,saveDailySchedule,saveMember,notify,currentRole}){
 const [form,setForm]=useState(modal.data||{});const [saving,setSaving]=useState(false);const update=(k,v)=>setForm(p=>({...p,[k]:v}));
 const eventStaff=members.filter(m=>m.status==='Ativo');
 const toggleStaff=(id,checked)=>{const next=checked?[...(form.staff_ids||[]),id]:(form.staff_ids||[]).filter(x=>x!==id);const senior=next.filter(x=>eventStaff.find(m=>m.user_id===x)?.role!=='Treinamento');if(senior.length>4){notify('Máximo de 4 staffs com cargo de Aprendiz ou superior.');return;}update('staff_ids',next);};
 const field=(label,key,type='text',required=false)=><label>{label}<input type={type} value={form[key]??''} required={required} onChange={e=>update(key,e.target.value)}/></label>;
 const select=(label,key,opts)=><label>{label}<select value={form[key]??opts[0]} onChange={e=>update(key,e.target.value)}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></label>;
 const area=(label,key)=><label className="wide">{label}<textarea rows="6" value={form[key]??''} onChange={e=>update(key,e.target.value)}/></label>;
 const submit=async e=>{e.preventDefault();setSaving(true);try{if(modal.type==='event')await saveEvent(form);if(modal.type==='event_credit')await saveEventCredit(form);if(modal.type==='goal')await saveGoal(form);if(modal.type==='schedule')await saveSchedule(form);if(modal.type==='daily_schedule')await saveDailySchedule(form);if(modal.type==='availability')await saveAvailability(form);if(modal.type==='member')await saveMember(form);}catch(err){notify(errText(err));}finally{setSaving(false)}};
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal-card" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">LISBOA EVENTOS</p><h2>{{event:'Registrar evento',event_credit:'Gerenciar eventos',goal:form.id?'Editar meta':'Nova meta',schedule:form.id?'Editar escala':'Nova escala',availability:'Informar disponibilidade',daily_schedule:form.id?'Editar cronograma':'Adicionar ao cronograma',member:form.mode==='role'?'Alterar cargo':'Editar dados do membro'}[modal.type]}</h2></div><button type="button" className="icon-close" onClick={close}>×</button></div><div className="form-grid">
 {modal.type==='event_credit'&&<><p className="notice wide">Ajustar eventos contabilizados para <b>{form.member_name}</b>. Isso não cria nem exclui registros reais de eventos.</p><label>Operação<select value={form.operation||'add'} onChange={e=>update('operation',e.target.value)}><option value="add">Adicionar eventos</option><option value="remove">Remover eventos</option></select></label>{field('Quantidade de eventos','quantity','number',true)}</>}
 {modal.type==='event'&&<>{field('Evento','name','text',true)}{field('Data','event_date','date',true)}{field('Hora de início','start_time','time',true)}<div className="wide staff-picker"><b>Staff</b>{eventStaff.map(m=><label className="staff-option" key={m.user_id}><input type="checkbox" checked={(form.staff_ids||[]).includes(m.user_id)} disabled={form.assigned_member_id===m.user_id} onChange={e=>toggleStaff(m.user_id,e.target.checked)}/>{m.name} · {m.role}</label>)}</div><label>ID dos vencedores (separe por vírgula)<input type="text" value={form.winner_id??''} onChange={e=>update('winner_id',e.target.value)}/></label><label>IDs do Discord dos vencedores (na mesma ordem, separados por vírgula)<input type="text" value={form.winner_discord??''} onChange={e=>update('winner_discord',e.target.value)}/></label><label>Print do vencedor<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>update('winner_image_file',e.target.files?.[0])}/></label><label>Print do evento<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>update('event_image_file',e.target.files?.[0])}/></label></>}
 {modal.type==='goal'&&<>{field('Título','title','text',true)}{field('Quantidade alvo','target_quantity','number',true)}{field('Início do período','period_start','date')}{field('Fim do período','period_end','date')}<label>Responsável pela meta<select value={form.responsible_id??''} onChange={e=>update('responsible_id',e.target.value)}><option value="">Meta geral</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.name} · {m.role}</option>)}</select></label>{area('Descrição','description')}</>}
 {modal.type==='daily_schedule'&&<>{field('Nome do evento','event_name','text',true)}{field('Horário','event_time','time',true)}{select('Categoria','category',['EVENTOS','PVP','ENTRETENIMENTO'])}</>}
 {modal.type==='schedule'&&<>{field('Atividade','title','text',true)}{field('Data','schedule_date','date',true)}{field('Início','start_time','time')}{field('Fim','end_time','time')}{select('Responsável','responsible_id',['',...members.map(m=>m.user_id)])}{area('Observações','notes')}</>}
 {modal.type==='availability'&&<>{field('Data','available_date','date',true)}{field('Início','start_time','time')}{field('Fim','end_time','time')}{area('Observações','notes')}</>}
 {modal.type==='member'&&<>{form.mode==='role'?<>{field('Membro','name')}{select('Cargo','role',currentRole==='Responsável Geral'?['Treinamento','Aprendiz','Analista','Especialista','Supervisor','Responsável']:currentRole==='Responsável'?['Treinamento','Aprendiz','Analista','Especialista','Supervisor']:['Treinamento','Aprendiz','Analista','Especialista'])}</>:<>{field('ID do membro','staff_id','text',true)}{field('Nome','name','text',true)}{field('Discord','discord')}{field('WhatsApp','whatsapp','tel')}{field('Telefone','phone','tel')}{field('EQPG','eqpg')}{select('Status','status',STATUSES)}</>}</>}
 </div><div className="modal-footer"><button type="button" className="secondary" onClick={close}>Cancelar</button><button className="primary" disabled={saving}>{saving?'Salvando…':'Salvar'}</button></div></form></div>
}
function SetupError(){return <main className="center-screen"><div className="panel setup-card"><h1>Configuração necessária</h1><p>O site ainda não recebeu as variáveis de ambiente do Supabase.</p><p>Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no ambiente de publicação e gere o build novamente.</p></div></main>}

createRoot(document.getElementById('root')).render(<App/>);
